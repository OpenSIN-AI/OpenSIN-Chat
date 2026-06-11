// SPDX-License-Identifier: MIT
/**
 * Retention — automatische Speicher-Hygiene für das PDF-Analyse-Modul.
 *
 * Bei Riesen-Dateien (zweistellige GB pro Upload) läuft die Platte ohne
 * Aufräumen unweigerlich voll. Regeln (alle per ENV konfigurierbar):
 *
 *  - Uploads:     löschen, wenn älter als UPLOAD_TTL_DAYS UND von keinem
 *                 aktiven (pending/running) Job referenziert.
 *  - Checkpoints: löschen, wenn der zugehörige Job abgeschlossen/gescheitert
 *                 ist oder die Datei verwaist ist (kein Job vorhanden).
 *  - Reports:     löschen, wenn älter als REPORT_TTL_DAYS (0 = nie löschen —
 *                 Reports sind klein und wertvoll, Default daher 0).
 *  - Job-Snapshots: abgeschlossene Jobs älter als JOB_TTL_DAYS entfernen.
 *
 *  Der FactStore (SQLite) wird NIE automatisch bereinigt — gespeicherte
 *  Fakten mit Quellenbezug sind das dauerhafte Gedächtnis des Systems.
 *
 *  Läuft beim Serverstart und danach im Intervall (Default: alle 6 h).
 */
const fs = require("fs");
const path = require("path");
const config = require("./config");
const { loadAllJobs } = require("./jobStore");

const UPLOAD_TTL_DAYS = Number(
  process.env.PDF_ANALYSIS_UPLOAD_TTL_DAYS || 7
);
const REPORT_TTL_DAYS = Number(
  process.env.PDF_ANALYSIS_REPORT_TTL_DAYS || 0
);
const JOB_TTL_DAYS = Number(process.env.PDF_ANALYSIS_JOB_TTL_DAYS || 30);
const INTERVAL_MS = Number(
  process.env.PDF_ANALYSIS_CLEANUP_INTERVAL_MS || 6 * 60 * 60 * 1000
);

const UPLOAD_DIR = path.join(config.STORAGE_DIR, "uploads");
const JOBS_DIR = path.join(config.STORAGE_DIR, "jobs");

function olderThanDays(filePath, days) {
  if (days <= 0) return false;
  try {
    const { mtimeMs } = fs.statSync(filePath);
    return Date.now() - mtimeMs > days * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function safeUnlink(filePath) {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function listFiles(dir) {
  try {
    return fs.readdirSync(dir).map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

function runCleanup() {
  const jobs = loadAllJobs();
  const activePdfPaths = new Set(
    jobs
      .filter((j) => ["pending", "running"].includes(j.status))
      .map((j) => j.pdfPath)
  );
  const knownJobIds = new Set(jobs.map((j) => j.id));
  const finishedJobIds = new Set(
    jobs
      .filter((j) => ["completed", "failed"].includes(j.status))
      .map((j) => j.id)
  );

  let removed = { uploads: 0, checkpoints: 0, reports: 0, jobs: 0 };

  // 1. Uploads: alt UND nicht von aktivem Job referenziert
  for (const file of listFiles(UPLOAD_DIR)) {
    if (activePdfPaths.has(file)) continue;
    if (olderThanDays(file, UPLOAD_TTL_DAYS) && safeUnlink(file))
      removed.uploads++;
  }

  // 2. Checkpoints: Job fertig/gescheitert oder verwaist
  for (const file of listFiles(config.CHECKPOINT_DIR)) {
    const jobId = path.basename(file).replace(/\.json(\.tmp)?$/, "");
    if (finishedJobIds.has(jobId) || !knownJobIds.has(jobId)) {
      if (safeUnlink(file)) removed.checkpoints++;
    }
  }

  // 3. Reports: nur wenn TTL gesetzt (Default 0 = behalten)
  if (REPORT_TTL_DAYS > 0) {
    const reportFiles = [
      ...listFiles(config.REPORT_DIR).filter((f) => f.endsWith(".md")),
      ...listFiles(path.join(config.REPORT_DIR, "crosscheck")),
    ];
    for (const file of reportFiles) {
      if (olderThanDays(file, REPORT_TTL_DAYS) && safeUnlink(file))
        removed.reports++;
    }
  }

  // 4. Job-Snapshots: abgeschlossen und älter als TTL
  for (const file of listFiles(JOBS_DIR)) {
    const jobId = path.basename(file).replace(/\.json(\.tmp)?$/, "");
    if (finishedJobIds.has(jobId) && olderThanDays(file, JOB_TTL_DAYS)) {
      if (safeUnlink(file)) removed.jobs++;
    }
  }

  const total =
    removed.uploads + removed.checkpoints + removed.reports + removed.jobs;
  if (total > 0)
    console.log(
      `[pdfAnalysis] Cleanup: ${removed.uploads} Uploads, ` +
        `${removed.checkpoints} Checkpoints, ${removed.reports} Reports, ` +
        `${removed.jobs} Job-Snapshots entfernt.`
    );
  return removed;
}

let timer = null;
function startRetentionSchedule() {
  if (timer) return;
  runCleanup();
  timer = setInterval(runCleanup, INTERVAL_MS);
  timer.unref(); // Prozess-Ende nicht blockieren
}

module.exports = { startRetentionSchedule, runCleanup };
