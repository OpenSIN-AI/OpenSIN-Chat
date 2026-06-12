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

// Status-Konstanten — eine Quelle der Wahrheit, damit cleanup-Funktionen
// nicht auseinanderlaufen, wenn jemand den Status-String tippt.
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function jobFile(jobId) {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

/**
 * Atomar schreiben: erst .tmp, dann rename. POSIX-rename ist atomar auf
 * demselben Filesystem, sodass ein Crash mitten im Schreiben nie eine
 * halbe JSON-Datei hinterlässt. Konsumenten lesen immer die .json-Datei.
 */
function atomicWriteJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

function persistJob(job) {
  // Nur serialisierbare, zum Fortsetzen nötige Felder persistieren.
  // `lastUpdated` wird bei jedem persistJob-Aufruf neu gesetzt — das
  // fällt mit jedem Status- oder Progress-Update zusammen und erlaubt
  // stuck-Job-Detection ohne separates Timestamp-Tracking im Caller.
  const snapshot = {
    id: job.id,
    pdfPath: job.pdfPath,
    documentName: job.documentName,
    task: job.task,
    reportType: job.reportType,
    factCriteria: job.factCriteria,
    status: job.status,
    createdAt: job.createdAt,
    lastUpdated: new Date().toISOString(),
    progress: job.progress,
    result: job.result,
    error: job.error,
  };
  atomicWriteJson(jobFile(job.id), snapshot);
}

function removeJob(jobId) {
  const file = jobFile(jobId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  // .tmp-Datei miträumen, falls ein Crash dazwischenfunkte
  const tmp = `${file}.tmp`;
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
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

// ── Maintenance / Cleanup ─────────────────────────────────────

/**
 * Liefert den effektiven Zeitstempel eines persistierten Jobs. Bevorzugt
 * das explizite `lastUpdated`-Feld, fällt sonst auf die File-mtime zurück
 * (z.B. für alte Snapshots vor diesem Schema-Update). `createdAt` wird
 * nicht als Fallback genutzt, weil dann ein Job, der gerade aktiv ist,
 * fälschlich als "alt" erschiene.
 */
function jobTimestamp(job, filePath) {
  if (job.lastUpdated) return Date.parse(job.lastUpdated);
  if (filePath) {
    try {
      return fs.statSync(filePath).mtimeMs;
    } catch {
      /* file weg → behandeln als "jetzt", damit nicht sofort gelöscht */
      return Date.now();
    }
  }
  return Date.now();
}

/**
 * Löscht terminal-state Jobs, die älter als `maxAgeHours` sind. Damit wird
 * die jobs/-Verzeichnisgröße begrenzt, ohne aktive oder kürzlich gestartete
 * Analysen zu verlieren. Liefert die Anzahl entfernter Jobs.
 */
function cleanupStaleJobs(maxAgeHours = 24) {
  if (!fs.existsSync(JOBS_DIR)) return 0;
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
  let removed = 0;
  for (const entry of fs.readdirSync(JOBS_DIR)) {
    if (!entry.endsWith(".json")) continue;
    const file = path.join(JOBS_DIR, entry);
    let job;
    try {
      job = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      // korrupte Datei — als stale behandeln und aufräumen
      try {
        fs.unlinkSync(file);
        removed += 1;
      } catch { /* race oder readonly — ignorieren */ }
      continue;
    }
    if (!TERMINAL_STATUSES.has(job.status)) continue;
    if (jobTimestamp(job, file) >= cutoff) continue;
    try {
      fs.unlinkSync(file);
      removed += 1;
    } catch { /* race — ignorieren */ }
  }
  return removed;
}

/**
 * Findet Jobs, deren PDF-Quelldatei verschwunden ist (z.B. vom User gelöscht
 * oder Storage-Cleanup). Diese Jobs sind Zombies: ein Resume wäre sinnlos.
 * Es wird NUR reportet, nicht auto-gelöscht — die Entscheidung trifft die
 * aufrufende Schicht (oft genutzte PDFs könnten temporär gemountet sein).
 */
function getOrphanedJobs() {
  if (!fs.existsSync(JOBS_DIR)) return [];
  const orphaned = [];
  for (const entry of fs.readdirSync(JOBS_DIR)) {
    if (!entry.endsWith(".json")) continue;
    const file = path.join(JOBS_DIR, entry);
    let job;
    try {
      job = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      continue; // korrupte Datei wird von cleanupStaleJobs erfasst
    }
    if (!job.pdfPath) continue;
    if (fs.existsSync(job.pdfPath)) continue;
    orphaned.push({
      id: job.id,
      pdfPath: job.pdfPath,
      status: job.status,
      createdAt: job.createdAt,
      lastUpdated: job.lastUpdated || null,
    });
  }
  return orphaned;
}

/**
 * Findet Jobs, die seit `timeoutHours` im Status `running` hängen — typisch
 * für abgestürzte Worker oder vergessene Promise-Chains. Markiert sie als
 * `failed` mit dem Sentinel-Error `orphaned-stuck`, damit der
 * Resume-Mechanismus sie nicht endlos wieder anstößt. Liefert die IDs der
 * markierten Jobs.
 */
function markStuckJobsAsFailed(timeoutHours = 6) {
  if (!fs.existsSync(JOBS_DIR)) return [];
  const cutoff = Date.now() - timeoutHours * 60 * 60 * 1000;
  const marked = [];
  for (const entry of fs.readdirSync(JOBS_DIR)) {
    if (!entry.endsWith(".json")) continue;
    const file = path.join(JOBS_DIR, entry);
    let job;
    try {
      job = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    if (job.status !== "running") continue;
    if (jobTimestamp(job, file) >= cutoff) continue;
    job.status = "failed";
    job.error = "orphaned-stuck";
    job.lastUpdated = new Date().toISOString();
    try {
      atomicWriteJson(file, job);
      marked.push(job.id);
    } catch { /* race — beim nächsten Lauf erneut versuchen */ }
  }
  return marked;
}

module.exports = {
  persistJob,
  removeJob,
  loadAllJobs,
  cleanupStaleJobs,
  getOrphanedJobs,
  markStuckJobsAsFailed,
};
