// SPDX-License-Identifier: MIT
/**
 * JobStore — persistiert Job-Metadaten auf Disk (atomar), damit laufende
 * Analysen einen Server-Neustart überleben und automatisch fortgesetzt
 * werden (die Chunk-Checkpoints des AgentPool existieren ohnehin schon —
 * hier wird die Job-Definition selbst persistiert).
 */
const fs = require("fs");
const path = require("path");
const { STORAGE_DIR } = require("./config");

const JOBS_DIR = path.join(STORAGE_DIR, "jobs");

function jobFile(jobId) {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

function persistJob(job) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
  // Nur serialisierbare, zum Fortsetzen nötige Felder persistieren
  const snapshot = {
    id: job.id,
    pdfPath: job.pdfPath,
    documentName: job.documentName,
    task: job.task,
    reportType: job.reportType,
    factCriteria: job.factCriteria,
    status: job.status,
    createdAt: job.createdAt,
    progress: job.progress,
    result: job.result,
    error: job.error,
  };
  const file = jobFile(job.id);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(snapshot));
  fs.renameSync(tmp, file); // atomar
}

function removeJob(jobId) {
  const file = jobFile(jobId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

/**
 * Lädt alle persistierten Jobs. Jobs mit Status pending/running waren beim
 * letzten Shutdown unterbrochen und sind Kandidaten für Auto-Resume.
 */
function loadAllJobs() {
  if (!fs.existsSync(JOBS_DIR)) return [];
  const jobs = [];
  for (const entry of fs.readdirSync(JOBS_DIR)) {
    if (!entry.endsWith(".json")) continue;
    try {
      jobs.push(JSON.parse(fs.readFileSync(path.join(JOBS_DIR, entry), "utf8")));
    } catch {
      /* korrupte Datei überspringen */
    }
  }
  return jobs;
}

module.exports = { persistJob, removeJob, loadAllJobs };
