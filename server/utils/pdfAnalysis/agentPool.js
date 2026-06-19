// SPDX-License-Identifier: MIT
/**
 * AgentPool — synchronisierte Parallelverarbeitung mit adaptiver Parallelität.
 *
 * Wellen-Modell (wie zuvor): Chunks in Seitenreihenfolge, Wellen laufen
 * parallel, nach jeder Welle deterministisches Merge + atomarer Checkpoint.
 *
 * NEU — AIMD-Regelung (Additive Increase / Multiplicative Decrease, wie TCP):
 *  - Rate-Limit-/Überlastfehler in einer Welle => Parallelität halbieren
 *    (min. 1) und kurze Abkühlphase.
 *  - N fehlerfreie Wellen in Folge => Parallelität +1 (bis zum Maximum).
 * => Das System findet selbstständig den maximalen stabilen Durchsatz
 *    des jeweiligen LLM-Providers, ohne manuelles Tuning.
 */
const fs = require("fs");
const path = require("path");
const { CHECKPOINT_DIR } = require("./config");

const INCREASE_AFTER_WAVES = Number(
  process.env.PDF_ANALYSIS_AIMD_INCREASE_AFTER || 3,
);
const COOLDOWN_MS = Number(process.env.PDF_ANALYSIS_AIMD_COOLDOWN_MS || 5000);
// Maximum retry attempts per chunk on rate-limit errors before giving up.
// Without this, a persistent API outage causes an infinite retry loop.
const MAX_CHUNK_RETRIES = Number(
  process.env.PDF_ANALYSIS_MAX_CHUNK_RETRIES || 10,
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(message = "") {
  const msg = String(message).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate") ||
    msg.includes("overloaded") ||
    msg.includes("503") ||
    msg.includes("capacity")
  );
}

function checkpointPath(jobId) {
  return path.join(CHECKPOINT_DIR, `${jobId}.json`);
}

function loadCheckpoint(jobId) {
  const file = checkpointPath(jobId);
  if (!fs.existsSync(file)) return { completed: {} };
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { completed: {} };
  }
}

function saveCheckpoint(jobId, data) {
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  const file = checkpointPath(jobId);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file); // atomar
}

function clearCheckpoint(jobId) {
  const file = checkpointPath(jobId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

/**
 * Führt workerFn für alle Chunks aus — mit adaptiver Parallelität.
 * @param {Array} chunks geordnete Chunk-Definitionen
 * @param {number} maxConcurrency obere Grenze paralleler Agenten
 * @param {Function} workerFn async (chunk) => result
 * @param {Object} opts { jobId, onProgress(done,total,concurrency), isCancelled() }
 */
async function runPool(chunks, maxConcurrency, workerFn, opts = {}) {
  const { jobId, onProgress, isCancelled } = opts;
  const checkpoint = jobId ? loadCheckpoint(jobId) : { completed: {} };
  const results = new Array(chunks.length);
  let done = 0;

  // Resume: bereits abgeschlossene Chunks übernehmen
  const pending = [];
  for (const chunk of chunks) {
    const saved = checkpoint.completed[chunk.index];
    if (saved) {
      results[chunk.index] = saved;
      done++;
    } else {
      pending.push(chunk);
    }
  }

  // AIMD-Zustand
  let concurrency = Math.max(1, maxConcurrency);
  let cleanWaveStreak = 0;
  // Track per-chunk retry counts to prevent infinite loops on persistent
  // rate-limit errors.
  const retryCounts = new Map();

  if (onProgress) onProgress(done, chunks.length, concurrency);

  let cursor = 0;
  while (cursor < pending.length) {
    if (isCancelled && isCancelled()) throw new Error("Job abgebrochen.");
    const wave = pending.slice(cursor, cursor + concurrency);

    const waveResults = await Promise.all(
      wave.map(async (chunk) => {
        try {
          return await workerFn(chunk);
        } catch (e) {
          return {
            chunkIndex: chunk.index,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd,
            summary: "",
            findings: [],
            facts: [],
            error: e.message,
          };
        }
      }),
    );

    // Synchronisationspunkt: in Seitenreihenfolge mergen + Checkpoint
    const rateLimited = waveResults.some(
      (r) => r.error && isRateLimitError(r.error),
    );
    const failedIdx = new Set();
    for (const r of waveResults) {
      // Rate-Limit-Fehler NICHT als final speichern — Chunk kommt zurück
      // in die Warteschlange und wird mit reduzierter Parallelität wiederholt.
      if (r.error && isRateLimitError(r.error)) {
        failedIdx.add(r.chunkIndex);
        continue;
      }
      results[r.chunkIndex] = r;
      checkpoint.completed[r.chunkIndex] = r;
      done++;
    }
    if (jobId) saveCheckpoint(jobId, checkpoint);

    if (rateLimited) {
      // Fehlgeschlagene Chunks aus dieser Welle wieder einreihen
      // (direkt nach dem aktuellen Cursor, damit sie als nächstes drankommen)
      const successfulInWave = wave.filter((c) => !failedIdx.has(c.index));
      cursor += successfulInWave.length;

      // Per-chunk retry cap: after MAX_CHUNK_RETRIES rate-limit retries,
      // store the error as a final result to avoid an infinite loop.
      const retry = [];
      const exhausted = [];
      for (const c of wave.filter((c) => failedIdx.has(c.index))) {
        const count = (retryCounts.get(c.index) || 0) + 1;
        retryCounts.set(c.index, count);
        if (count > MAX_CHUNK_RETRIES) {
          exhausted.push(c);
        } else {
          retry.push(c);
        }
      }
      pending.splice(cursor, 0, ...retry);

      // Chunks that exceeded the retry cap are stored as final errors.
      for (const c of exhausted) {
        const errResult = {
          chunkIndex: c.index,
          pageStart: c.pageStart,
          pageEnd: c.pageEnd,
          summary: "",
          findings: [],
          facts: [],
          error: `Rate-limit retries exhausted (${MAX_CHUNK_RETRIES} attempts).`,
        };
        results[c.index] = errResult;
        checkpoint.completed[c.index] = errResult;
        done++;
      }

      // Multiplicative Decrease + Abkühlphase
      concurrency = Math.max(1, Math.floor(concurrency / 2));
      cleanWaveStreak = 0;
      await sleep(COOLDOWN_MS);
    } else {
      cursor += wave.length;
      cleanWaveStreak++;
      // Additive Increase nach N sauberen Wellen
      if (
        cleanWaveStreak >= INCREASE_AFTER_WAVES &&
        concurrency < maxConcurrency
      ) {
        concurrency++;
        cleanWaveStreak = 0;
      }
    }

    if (onProgress) onProgress(done, chunks.length, concurrency);
  }

  return results;
}

module.exports = { runPool, loadCheckpoint, clearCheckpoint };
