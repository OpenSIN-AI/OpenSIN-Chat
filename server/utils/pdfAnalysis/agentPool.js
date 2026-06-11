// SPDX-License-Identifier: MIT
/**
 * AgentPool — synchronisierte Parallelverarbeitung der Seiten-Chunks.
 *
 * Vorgehen ("Wellen"-Modell für Seiten-Synchronisierung):
 *  - Chunks werden in Seitenreihenfolge in Wellen der Größe CONCURRENCY abgearbeitet.
 *  - Innerhalb einer Welle laufen alle Agenten echt parallel.
 *  - Nach jeder Welle: Ergebnisse in Seitenreihenfolge mergen + Checkpoint schreiben.
 *    => deterministische Reihenfolge, Resume nach Absturz, begrenzter Speicher.
 */
const fs = require("fs");
const path = require("path");
const { CHECKPOINT_DIR } = require("./config");

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
 * Führt workerFn für alle Chunks aus.
 * @param {Array} chunks geordnete Chunk-Definitionen
 * @param {number} concurrency Anzahl paralleler Agenten
 * @param {Function} workerFn async (chunk) => result
 * @param {Object} opts { jobId, onProgress(done,total), isCancelled() }
 * @returns geordnete Ergebnisliste (nach chunkIndex)
 */
async function runPool(chunks, concurrency, workerFn, opts = {}) {
  const { jobId, onProgress, isCancelled } = opts;
  const checkpoint = jobId ? loadCheckpoint(jobId) : { completed: {} };
  const results = new Array(chunks.length);
  let done = 0;

  // Bereits abgeschlossene Chunks aus Checkpoint übernehmen (Resume)
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
  if (onProgress) onProgress(done, chunks.length);

  for (let i = 0; i < pending.length; i += concurrency) {
    if (isCancelled && isCancelled()) throw new Error("Job abgebrochen.");
    const wave = pending.slice(i, i + concurrency);

    const waveResults = await Promise.all(
      wave.map(async (chunk) => {
        try {
          return await workerFn(chunk);
        } catch (e) {
          // Ein fehlgeschlagener Chunk bricht den Gesamt-Job nicht ab
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
      })
    );

    // Synchronisationspunkt: Ergebnisse in Seitenreihenfolge einsortieren
    for (const r of waveResults) {
      results[r.chunkIndex] = r;
      checkpoint.completed[r.chunkIndex] = r;
      done++;
    }
    if (jobId) saveCheckpoint(jobId, checkpoint);
    if (onProgress) onProgress(done, chunks.length);
  }

  return results;
}

module.exports = { runPool, loadCheckpoint, clearCheckpoint };
