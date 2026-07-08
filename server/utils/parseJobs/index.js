// SPDX-License-Identifier: MIT
// Purpose: Persistent job store for async chat-upload parse jobs backed by
//          SQLite via Prisma raw SQL.  Jobs now survive server restarts —
//          stale "processing" rows are recovered to "failed" on boot so the
//          frontend never polls forever.  Fixes #366.

const { v4 } = require("uuid");
const prisma = require("../prisma");

/**
 * How long completed/failed jobs are retained before TTL cleanup.
 * MUST be >= the frontend's MAX_POLL_MS (30 min) so a throttled/backgrounded
 * tab can still fetch the result of a finished job before it is swept —
 * otherwise a successful parse turns into a 404/"failed" for that client.
 */
const JOB_TTL_MS = 35 * 60 * 1000;

/**
 * Grace period before a still-"pending" row found at boot is considered
 * orphaned. A pending job normally flips to "processing" within milliseconds,
 * so anything pending for longer than this at startup lost its worker.
 */
const PENDING_STALE_MS = 60 * 1000;

const JOB_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
};

// ---------------------------------------------------------------------------
// Schema bootstrap
// ---------------------------------------------------------------------------

// The parse_jobs table is primarily managed by Prisma migrations (see
// server/prisma/migrations/20260705120000_add_parse_jobs/migration.sql).
// The CREATE TABLE IF NOT EXISTS guard is also kept here so the table is
// available in test environments (in-memory SQLite) and any deployment
// where migrations have not yet been applied.

let _bootstrapped = false;

async function ensureTable() {
  if (_bootstrapped) return;
  _bootstrapped = true;
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS parse_jobs (
      id           TEXT    PRIMARY KEY,
      workspaceId  INTEGER NOT NULL,
      userId       INTEGER,
      originalname TEXT    NOT NULL,
      status       TEXT    NOT NULL DEFAULT 'pending',
      files        TEXT,
      error        TEXT,
      createdAt    TEXT    NOT NULL DEFAULT (datetime('now')),
      finishedAt   TEXT
    )`,
  );
}

// ---------------------------------------------------------------------------
// Startup recovery
// ---------------------------------------------------------------------------

/**
 * Called once at server boot.
 * Any row still stuck in "processing" means the worker was interrupted
 * mid-run (restart, crash, OOM kill).  Mark them "failed" so the frontend
 * stops polling and shows a "re-upload" prompt instead of spinning forever.
 */
async function recoverStalledJobs() {
  try {
    await ensureTable();
    await prisma.$executeRawUnsafe(
      `UPDATE parse_jobs
          SET status     = ?,
              error      = ?,
              finishedAt = datetime('now')
        WHERE status = ?`,
      JOB_STATUS.FAILED,
      "Server restarted while this job was processing. Please re-upload the file.",
      JOB_STATUS.PROCESSING,
    );
    // Rows stuck in "pending" past the grace period lost their worker too —
    // e.g. the server crashed between ParseJobs.create() and markProcessing().
    // Without this, the frontend polls a forever-pending job until timeout.
    const pendingStaleMinutes = Math.max(
      1,
      Math.round(PENDING_STALE_MS / 60000),
    );
    await prisma.$executeRawUnsafe(
      `UPDATE parse_jobs
          SET status     = ?,
              error      = ?,
              finishedAt = datetime('now')
        WHERE status = ?
          AND createdAt < datetime('now', ?)`,
      JOB_STATUS.FAILED,
      "Server restarted before this job could start. Please re-upload the file.",
      JOB_STATUS.PENDING,
      `-${pendingStaleMinutes} minutes`,
    );
    // Boot-time sweep: without this, finished jobs only get cleaned up when
    // someone uploads a new file — on quiet instances they linger forever.
    await sweep();
  } catch (e) {
    // Non-fatal: log and continue — the rest of the server should still start.
    console.error("[ParseJobs] recoverStalledJobs failed:", e.message);
  }
}

// ---------------------------------------------------------------------------
// TTL sweep
// ---------------------------------------------------------------------------

/** Delete finished jobs older than JOB_TTL_MS to keep the table small. */
async function sweep() {
  // IMPORTANT: the cutoff is computed entirely inside SQLite so it uses the
  // exact same datetime string format as the stored `finishedAt` values
  // (`datetime('now')` → "YYYY-MM-DD HH:MM:SS"). Mixing in a JS ISO string
  // ("...T...Z") would corrupt the lexicographic comparison because
  // ' ' < 'T' and same-day rows would always sort below the cutoff.
  const ttlMinutes = Math.round(JOB_TTL_MS / 60000);
  await prisma.$executeRawUnsafe(
    `DELETE FROM parse_jobs
      WHERE status IN (?, ?)
        AND finishedAt IS NOT NULL
        AND finishedAt < datetime('now', ?)`,
    JOB_STATUS.COMPLETED,
    JOB_STATUS.FAILED,
    `-${ttlMinutes} minutes`,
  );
}

// ---------------------------------------------------------------------------
// Public API  (mirrors the previous in-memory surface exactly)
// ---------------------------------------------------------------------------

/**
 * Create and persist a new parse job.
 * @param {{workspaceId: number, userId?: number|null, originalname: string}} params
 * @returns {Promise<{id: string, workspaceId: number, userId: number|null,
 *   originalname: string, status: string, files: null, error: null,
 *   createdAt: number, finishedAt: null}>}
 */
async function create({ workspaceId, userId = null, originalname }) {
  await ensureTable();
  // Async sweep — don't await so the caller isn't blocked by housekeeping.
  sweep().catch((e) =>
    console.warn("[ParseJobs] sweep error (non-fatal):", e.message),
  );

  const id = v4();
  await prisma.$executeRawUnsafe(
    `INSERT INTO parse_jobs (id, workspaceId, userId, originalname, status, createdAt)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    id,
    workspaceId,
    userId ?? null,
    originalname,
    JOB_STATUS.PENDING,
  );
  return _toJob(await _queryOne("SELECT * FROM parse_jobs WHERE id = ?", id));
}

/**
 * Fetch a job scoped to a workspace (and user in multi-user mode).
 * Returns null when the job does not exist or the caller is not allowed to
 * see it — indistinguishable on purpose (no information leak).
 * @param {string} jobId
 * @param {{workspaceId: number, userId?: number|null}} scope
 * @returns {Promise<object|null>}
 */
async function get(jobId, { workspaceId, userId = null }) {
  await ensureTable();
  const row = await _queryOne("SELECT * FROM parse_jobs WHERE id = ?", jobId);
  if (!row) return null;
  if (row.workspaceId !== workspaceId) return null;
  if (userId !== null && row.userId !== null && row.userId !== userId)
    return null;
  return _toJob(row);
}

/** Mark a job as actively processing. */
async function markProcessing(jobId) {
  await prisma.$executeRawUnsafe(
    `UPDATE parse_jobs SET status = ? WHERE id = ?`,
    JOB_STATUS.PROCESSING,
    jobId,
  );
}

/**
 * Mark a job as completed with its resulting parsed-file rows.
 * @param {string} jobId
 * @param {Array<object>} files
 */
async function markCompleted(jobId, files) {
  await prisma.$executeRawUnsafe(
    `UPDATE parse_jobs
        SET status     = ?,
            files      = ?,
            finishedAt = datetime('now')
      WHERE id = ?`,
    JOB_STATUS.COMPLETED,
    JSON.stringify(files ?? []),
    jobId,
  );
}

/**
 * Mark a job as failed with a user-facing error message.
 * @param {string} jobId
 * @param {string} error
 */
async function markFailed(jobId, error) {
  await prisma.$executeRawUnsafe(
    `UPDATE parse_jobs
        SET status     = ?,
            error      = ?,
            finishedAt = datetime('now')
      WHERE id = ?`,
    JOB_STATUS.FAILED,
    error || "Unknown error",
    jobId,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function _queryOne(sql, ...params) {
  const rows = await prisma.$queryRawUnsafe(sql, ...params);
  return Array.isArray(rows) ? (rows[0] ?? null) : (rows ?? null);
}

/**
 * Map a raw SQLite row to the same shape the callers expected from the old
 * in-memory Map so no changes are needed in the endpoint or worker code.
 */
function _toJob(row) {
  if (!row) return null;
  // Defensive parse: a corrupted `files` column must not turn every
  // /parse-status poll into a 500. Degrade the job to "failed" instead.
  let files = null;
  let status = row.status;
  let error = row.error ?? null;
  if (row.files) {
    try {
      files = JSON.parse(row.files);
    } catch {
      console.error(
        `[ParseJobs] corrupted files JSON for job ${row.id} — degrading to failed`,
      );
      files = null;
      status = JOB_STATUS.FAILED;
      error = "Stored parse result was corrupted. Please re-upload the file.";
    }
  }
  return {
    id: row.id,
    workspaceId:
      typeof row.workspaceId === "number"
        ? row.workspaceId
        : Number(row.workspaceId),
    userId:
      row.userId != null
        ? typeof row.userId === "number"
          ? row.userId
          : Number(row.userId)
        : null,
    originalname: row.originalname,
    status,
    files,
    error,
    // Normalise datetime strings / Date objects to Unix ms for backwards compat.
    createdAt: _toMs(row.createdAt),
    finishedAt: row.finishedAt ? _toMs(row.finishedAt) : null,
  };
}

function _toMs(val) {
  if (!val) return null;
  if (typeof val === "number") return val;
  if (val instanceof Date) return val.getTime();
  // SQLite `datetime('now')` stores UTC as "YYYY-MM-DD HH:MM:SS" without a
  // timezone marker — normalise to ISO-8601 UTC so JS doesn't parse it as
  // local time.
  if (
    typeof val === "string" &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val)
  )
    return new Date(`${val.replace(" ", "T")}Z`).getTime();
  return new Date(val).getTime();
}

module.exports = {
  JOB_STATUS,
  recoverStalledJobs,
  ParseJobs: {
    create,
    get,
    markProcessing,
    markCompleted,
    markFailed,
  },
};
