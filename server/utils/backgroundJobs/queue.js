// SPDX-License-Identifier: MIT
/**
 * Persistente SQLite-basierte Background Job Queue für OpenAfD-Chat.
 *
 * Inklusive:
 *   • Auto-Recovery bei Mac-Sleep / Server-Crash (_recoverStaleJobs)
 *   • Auto-Pruning gegen DB-Bloat (_pruneOldJobs, alle ~83 Min)
 *   • Atomarem CAS-Lock über prisma.updateMany (verhindert Doppel-Verarbeitung
 *     auch bei parallelen add()-Calls)
 *
 * SQLite + WAL liefert hier die Persistenz; in-memory Queues wären auf einem
 * Mac mit Sleep-Mode inakzeptabel. Schema: `server/prisma/schema.prisma`
 * (Modell `job_queue`).
 */
const prisma = require("../prisma");

const POLL_INTERVAL_MS = 5000; // 5s — schnell genug für UX, idle-freundlich
const JOB_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 Min — Jobs älter = stale → retry
const PRUNE_INTERVAL_POLLS = 1000; // 1000 Polls × 5s ≈ 83 Min
const RETENTION_DAYS = 7; // Erledigte Jobs 7 Tage behalten (Debugging-Fenster)

class PersistentBackgroundQueue {
  constructor() {
    this.isPolling = false;
    this.pollTimer = null;
    this.pollCount = 0;
  }

  /**
   * Fügt einen Job in die persistente Queue ein.
   * @param {string} jobName  Discriminator (z.B. "GENERATE_THREAD_TITLE")
   * @param {object} payload  Serialisierbar! Nur IDs/Slugs/Strings/Number/Date.
   */
  async add(jobName, payload) {
    try {
      await prisma.job_queue.create({
        data: {
          job_name: jobName,
          payload: JSON.stringify(payload),
          status: "pending",
        },
      });
      this._ensurePolling();
    } catch (error) {
      console.error(
        `[Queue] Failed to enqueue job "${jobName}":`,
        error.message,
      );
    }
  }

  /**
   * Stellt sicher, dass der Polling-Loop läuft (idempotent).
   */
  _ensurePolling() {
    if (this.isPolling) return;
    this.isPolling = true;
    this._poll();
  }

  /**
   * Haupt-Polling-Loop. Nutzt setTimeout (nicht setInterval) damit ein
   * hängender Job-Call den nächsten Poll nicht überlappt.
   */
  async _poll() {
    this.pollCount++;

    try {
      if (this.pollCount % PRUNE_INTERVAL_POLLS === 0) {
        await this._pruneOldJobs();
      }
      await this._recoverStaleJobs();
      await this._processNextJob();
    } catch (error) {
      console.error("[Queue] Poll error:", error.message);
    }

    this.pollTimer = setTimeout(() => this._poll(), POLL_INTERVAL_MS);
  }

  /**
   * Löscht completed/failed Jobs älter als RETENTION_DAYS.
   * Verhindert DB-Bloat bei jahrelangem Dauerbetrieb.
   */
  async _pruneOldJobs() {
    const cutoffDate = new Date(
      Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    try {
      const result = await prisma.job_queue.deleteMany({
        where: {
          status: { in: ["completed", "failed"] },
          updated_at: { lt: cutoffDate },
        },
      });
      if (result.count > 0) {
        console.log(
          `[Queue] Pruned ${result.count} old job(s) (>${RETENTION_DAYS} days).`,
        );
      }
    } catch (error) {
      console.error("[Queue] Pruning error:", error.message);
    }
  }

  /**
   * Setzt Jobs zurück, die seit >JOB_LOCK_TIMEOUT_MS in "processing" hängen.
   * Passiert wenn der Server während eines Jobs gecrasht ist oder der Mac
   * aus dem Sleep aufwacht und setTimeout hängt.
   */
  async _recoverStaleJobs() {
    const staleThreshold = new Date(Date.now() - JOB_LOCK_TIMEOUT_MS);
    try {
      const result = await prisma.job_queue.updateMany({
        where: {
          status: "processing",
          locked_at: { lt: staleThreshold },
        },
        data: {
          status: "pending",
          locked_at: null,
        },
      });
      if (result.count > 0) {
        console.log(
          `[Queue] Recovered ${result.count} stale job(s) (crash/sleep recovery).`,
        );
      }
    } catch (error) {
      console.error("[Queue] Recovery error:", error.message);
    }
  }

  /**
   * Nimmt den ältesten pending Job, lockt ihn atomar (CAS via updateMany),
   * führt ihn aus. Bei Fehler: Retry bis max_attempts, dann failed.
   */
  async _processNextJob() {
    const pendingJobs = await prisma.job_queue.findMany({
      where: { status: "pending" },
      orderBy: { created_at: "asc" },
      take: 1,
    });
    if (pendingJobs.length === 0) return;
    const job = pendingJobs[0];

    try {
      const updated = await prisma.job_queue.updateMany({
        where: { id: job.id, status: "pending" }, // CAS: nur wenn noch pending
        data: {
          status: "processing",
          locked_at: new Date(),
          attempts: { increment: 1 },
        },
      });
      if (updated.count === 0) return; // Wurde parallel geschnappt

      console.log(`[Queue] Processing job #${job.id}: ${job.job_name}`);
      const payload = JSON.parse(job.payload);
      await this._executeJob(job, payload);

      await prisma.job_queue.update({
        where: { id: job.id },
        data: { status: "completed", locked_at: null },
      });
      console.log(`[Queue] Job #${job.id} (${job.job_name}) completed.`);
    } catch (error) {
      console.error(
        `[Queue] Job #${job.id} (${job.job_name}) failed:`,
        error.message,
      );
      const failedJob = await prisma.job_queue.findUnique({
        where: { id: job.id },
      });
      const shouldRetry =
        failedJob && failedJob.attempts < failedJob.max_attempts;

      await prisma.job_queue.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? "pending" : "failed",
          locked_at: null,
          last_error: error.message?.substring(0, 1000) || "Unknown error",
        },
      });
    }
  }

  /**
   * Dispatcher: mappt job_name → Handler-Modul.
   * Handler MÜSSEN throwen bei Fehlern — die Queue fängt das und retryt.
   */
  async _executeJob(job, payload) {
    switch (job.job_name) {
      case "GENERATE_THREAD_TITLE":
        await require("./jobs/generateTitle")(payload);
        break;
      default:
        throw new Error(`Unknown job type: ${job.job_name}`);
    }
  }

  /**
   * Wird in server/index.js nach Prisma-Init aufgerufen.
   * Beim Start: einmalig Pruning (falls Server lange offline war) + Polling.
   */
  start() {
    console.log("[Queue] Starting persistent background queue...");
    // Fire-and-forget — Fehler hier dürfen den Server-Boot nicht blockieren
    this._pruneOldJobs().catch(() => {});
    this._ensurePolling();
  }

  /**
   * Cleanup für graceful shutdown (SIGTERM/SIGINT in index.js).
   */
  stop() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.isPolling = false;
    console.log("[Queue] Background queue stopped.");
  }

  // ── Monitoring Helpers (für Debug/Diagnose) ──────────────────────

  /**
   * Liefert Queue-Statistiken. Nützlich für ein Health-Endpoint.
   */
  async stats() {
    try {
      const groups = await prisma.job_queue.groupBy({
        by: ["status"],
        _count: { _all: true },
      });
      return groups.reduce((acc, g) => {
        acc[g.status] = g._count._all;
        return acc;
      }, {});
    } catch (error) {
      console.error("[Queue] stats() error:", error.message);
      return null;
    }
  }
}

module.exports = new PersistentBackgroundQueue();
