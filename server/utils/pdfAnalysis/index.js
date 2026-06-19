// SPDX-License-Identifier: MIT
/**
 * PdfAnalysisPipeline — autonomer Orchestrator.
 *
 * NEU gegenüber Schritt 8:
 *  - Jobs werden via JobStore auf Disk persistiert (atomar).
 *  - resumeInterrupted(): beim Serverstart unterbrochene Jobs automatisch
 *    fortsetzen (Chunk-Checkpoints sorgen dafür, dass bereits analysierte
 *    Chunks NICHT erneut berechnet werden).
 *  - Adaptive Parallelität: progress.concurrency zeigt die aktuelle
 *    AIMD-geregelte Agenten-Anzahl live an.
 */
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const config = require("./config");
const { getStoragePath } = require("../paths");
const { PdfReader, buildChunkPlan } = require("./pdfReader");
const { runPool, clearCheckpoint } = require("./agentPool");
const { analyzeChunk } = require("./analysisAgent");
const { synthesize } = require("./synthesizer");
const { FactStore } = require("./factStore");
const { persistJob, loadAllJobs } = require("./jobStore");
const { validatePdfPath } = require("./security");
const { verifyFacts } = require("./factVerifier");
const { reviewAndRepair } = require("./criticAgent");

const MAX_COMPLETED_JOBS = Number(
  process.env.PDF_ANALYSIS_MAX_COMPLETED_JOBS || 500,
);

const jobs = new Map();

class PdfAnalysisPipeline {
  static factStore = new FactStore();

  static activeCount() {
    return [...jobs.values()].filter((j) =>
      ["pending", "running"].includes(j.status),
    ).length;
  }

  /**
   * Beim Serverstart einmal aufrufen: lädt persistierte Jobs und setzt
   * unterbrochene (pending/running) automatisch fort.
   */
  static resumeInterrupted() {
    for (const snapshot of loadAllJobs()) {
      if (jobs.has(snapshot.id)) continue;
      const job = { ...snapshot, cancelled: false };
      jobs.set(job.id, job);
      if (["pending", "running"].includes(job.status)) {
        if (!fs.existsSync(job.pdfPath)) {
          job.status = "failed";
          job.error = "PDF-Datei nach Neustart nicht mehr vorhanden.";
          persistJob(job);
          continue;
        }
        console.log(
          `[pdfAnalysis] Setze unterbrochenen Job fort: ${job.id} (${job.documentName})`,
        );
        this._run(job).catch((e) => {
          job.status = "failed";
          job.error = e.message;
          persistJob(job);
        });
      }
    }
  }

  static start({
    pdfPath,
    task,
    reportType = null,
    factCriteria = null,
    deepScan = false,
  }) {
    if (!pdfPath || !task)
      throw new Error("pdfPath und task sind erforderlich.");
    // Sicherheits-Härtung: realpath + Whitelist (uploads, documents, ENV)
    pdfPath = validatePdfPath(pdfPath);
    if (this.activeCount() >= config.MAX_ACTIVE_JOBS)
      throw Object.assign(
        new Error("Maximale Anzahl paralleler Analyse-Jobs erreicht."),
        { statusCode: 429 },
      );

    const jobId = uuidv4();
    const job = {
      id: jobId,
      pdfPath,
      documentName: path.basename(pdfPath),
      task,
      reportType,
      factCriteria,
      deepScan: !!deepScan,
      status: "pending",
      cancelled: false,
      createdAt: new Date().toISOString(),
      progress: {
        phase: "init",
        chunksDone: 0,
        chunksTotal: 0,
        totalPages: 0,
        concurrency: config.AGENT_CONCURRENCY,
      },
      result: null,
      error: null,
    };
    jobs.set(jobId, job);
    persistJob(job);
    this._run(job).catch((e) => {
      job.status = "failed";
      job.error = e.message;
      job.completedAt = new Date().toISOString();
      persistJob(job);
    });
    return { jobId };
  }

  static async _run(job) {
    job.status = "running";
    persistJob(job);
    const reader = new PdfReader(job.pdfPath, {
      deepScan: !!job.deepScan,
    });
    try {
      // Phase 1 — Dokument öffnen + Chunk-Plan
      job.progress.phase = "reading";
      const totalPages = await reader.open();
      if (config.MAX_PAGES > 0 && totalPages > config.MAX_PAGES)
        throw new Error(
          `Dokument hat ${totalPages} Seiten, Limit ist ${config.MAX_PAGES}.`,
        );
      const chunks = buildChunkPlan(
        totalPages,
        config.PAGES_PER_CHUNK,
        config.CHUNK_OVERLAP_PAGES,
      );
      job.progress.totalPages = totalPages;
      job.progress.chunksTotal = chunks.length;
      persistJob(job);

      // Phase 2 — parallele Multi-Agenten-Analyse (adaptiv geregelt)
      job.progress.phase = "analyzing";
      let lastPersist = Date.now();

      // Telemetrie für ETA/Durchsatz
      const telemetry = {
        startedAt: Date.now(),
        pagesPerChunk: config.PAGES_PER_CHUNK,
      };

      const chunkResults = await runPool(
        chunks,
        config.AGENT_CONCURRENCY,
        async (chunk) => {
          const { text } = await reader.rangeText(
            chunk.pageStart,
            chunk.pageEnd,
          );
          const ctx = {
            chunk,
            text,
            task: job.task,
            factCriteria: job.factCriteria,
            documentName: job.documentName,
          };
          const result = await analyzeChunk(ctx);
          // Critic-Review + ggf. Repair direkt im Worker => läuft mit-parallelisiert
          return await reviewAndRepair(result, ctx);
        },
        {
          jobId: job.id,
          isCancelled: () => job.cancelled,
          onProgress: (done, total, concurrency) => {
            job.progress.chunksDone = done;
            job.progress.chunksTotal = total;
            job.progress.concurrency = concurrency;

            // Telemetrie: ETA + Durchsatz
            const elapsedMs = Date.now() - telemetry.startedAt;
            if (done > 0 && elapsedMs > 5000) {
              const msPerChunk = elapsedMs / done;
              const remaining = total - done;
              job.progress.etaSeconds = Math.round(
                (remaining * msPerChunk) / 1000,
              );
              job.progress.pagesPerMinute = Math.round(
                (done * telemetry.pagesPerChunk) / (elapsedMs / 60000),
              );
            }

            // Job-Snapshot gedrosselt persistieren (max. alle 10 s),
            // die feingranularen Chunk-Checkpoints schreibt der Pool selbst.
            if (Date.now() - lastPersist > 10_000) {
              persistJob(job);
              lastPersist = Date.now();
            }
          },
        },
      );

      // Phase 3 — Synthese / Best-Practices-Report
      job.progress.phase = "synthesizing";
      persistJob(job);
      const { report, masterSummary, groundingRatio } = await synthesize(
        chunkResults,
        {
          task: job.task,
          reportType: job.reportType,
          documentName: job.documentName,
        },
      );

      const reportDir = getStoragePath("pdf-analysis", "reports");
      fs.mkdirSync(reportDir, { recursive: true });
      const reportFile = path.join(reportDir, `${job.id}.md`);
      fs.writeFileSync(reportFile, report);

      let pdfReport = null;
      try {
        const { ReportGenerator } = require("../reports");
        const generator = new ReportGenerator();
        pdfReport = await generator.generate({
          title: `Analysebericht: ${job.documentName}`,
          query: job.task,
          summary: report,
        });
      } catch {
        /* Reports-Modul optional */
      }

      // Phase 4 — Fakten deterministisch verifizieren + speichern
      job.progress.phase = "verifying-facts";
      persistJob(job);
      const facts = [];
      for (const r of chunkResults) {
        for (const f of r.facts || []) {
          if ((f.confidence ?? 0) < config.FACT_MIN_CONFIDENCE) continue;
          facts.push({
            detail: f.detail,
            quote: f.quote,
            tags: f.tags,
            confidence: f.confidence,
            source: {
              documentName: job.documentName,
              documentPath: job.pdfPath,
              page: f.page,
              jobId: job.id,
            },
          });
        }
      }
      const verifiedFacts = await verifyFacts(facts, reader);

      job.progress.phase = "storing-facts";
      persistJob(job);
      const factsStored = this.factStore.addFacts(verifiedFacts);

      job.result = {
        reportFile,
        pdfReport,
        masterSummary,
        totalPages,
        chunks: chunks.length,
        factsStored,
        factsVerified: verifiedFacts.filter((f) => f.verified).length,
        factsUnverified: verifiedFacts.filter((f) => !f.verified).length,
        chunkErrors: chunkResults.filter((r) => r && r.error).length,
        chunksRepaired: chunkResults.filter((r) => r?.critic?.repaired).length,
        ocrPages: reader.ocrPages ? reader.ocrPages.size : 0,
        visionPages: reader.visionPages ? reader.visionPages.size : 0,
        deepScannedPages: reader.deepScannedPages
          ? reader.deepScannedPages.size
          : 0,
        groundingRatio: Math.round((groundingRatio || 0) * 100),
      };
      job.status = "completed";
      job.progress.phase = "done";
      job.completedAt = new Date().toISOString();
      persistJob(job);
      clearCheckpoint(job.id);
    } finally {
      await reader.close();
    }
  }

  static getStatus(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;
    const { id, documentName, task, status, progress, error, createdAt } = job;
    return { id, documentName, task, status, progress, error, createdAt };
  }

  static getResult(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;
    if (job.status !== "completed")
      return { status: job.status, error: job.error };
    const report =
      job.result?.reportFile && fs.existsSync(job.result.reportFile)
        ? fs.readFileSync(job.result.reportFile, "utf8")
        : null;
    return { status: "completed", ...job.result, report };
  }

  static list() {
    return [...jobs.values()]
      .map((j) => PdfAnalysisPipeline.getStatus(j.id))
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  }

  static cancel(jobId) {
    const job = jobs.get(jobId);
    if (!job) return false;
    job.cancelled = true;
    return true;
  }

  /**
   * Remove terminal-state jobs older than maxAgeHours from the in-memory Map
   * to prevent unbounded growth on long-running servers. Disk cleanup is
   * handled separately by jobStore.cleanupStaleJobs.
   *
   * Additionally enforces a hard cap (MAX_COMPLETED_JOBS, default 500) on the
   * number of terminal-state entries kept in memory — if the cap is exceeded,
   * the oldest completed/failed entries are evicted FIFO regardless of age.
   *
   * @param {number} maxAgeHours - Jobs older than this are pruned (default 24).
   * @returns {number} Number of jobs pruned.
   */
  static pruneCompletedJobs(maxAgeHours = 24) {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let pruned = 0;
    for (const [id, job] of jobs) {
      if (!["completed", "failed"].includes(job.status)) continue;
      const ts = job.completedAt
        ? Date.parse(job.completedAt)
        : Date.parse(job.createdAt);
      if (ts < cutoff) {
        jobs.delete(id);
        pruned++;
      }
    }
    const terminal = [...jobs.entries()].filter(([, j]) =>
      ["completed", "failed"].includes(j.status),
    );
    if (terminal.length > MAX_COMPLETED_JOBS) {
      terminal.sort((a, b) => {
        const ta = a[1].completedAt
          ? Date.parse(a[1].completedAt)
          : Date.parse(a[1].createdAt);
        const tb = b[1].completedAt
          ? Date.parse(b[1].completedAt)
          : Date.parse(b[1].createdAt);
        return ta - tb;
      });
      const evict = terminal.length - MAX_COMPLETED_JOBS;
      for (let i = 0; i < evict; i++) {
        jobs.delete(terminal[i][0]);
        pruned++;
      }
    }
    return pruned;
  }
}

module.exports = { PdfAnalysisPipeline };
