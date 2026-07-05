// SPDX-License-Identifier: MIT
// Purpose: Persistent job store for async chat-upload parse jobs backed by
//          SQLite via Prisma raw SQL.  Jobs now survive server restarts —
//          stale "processing" rows are recovered to "failed" on boot so the
//          frontend never polls forever.  Fixes #366.

const { v4 } = require("uuid");
const prisma = require("../prisma");

/** How long completed/failed jobs are retained before TTL cleanup (15 min). */
const JOB_TTL_MS = 15 * 60 * 1000;

const JOB_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
};

// ---------------------------------------------------------------------------
// Schema bootstrap
// ---------------------------------------------------------------------------

// Idempotent CREATE so the table exists even if the Prisma migration has not
// been applied yet (e.g. during local development without running `migrate`).
const ENSURE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "parse_jobs" (
    "id"           TEXT     NOT NULL PRIMARY KEY,
    "workspaceId"  INTEGER  NOT NULL,
    "userId"       INTEGER,
    "originalname" TEXT     NOT NULL,
    "status"       TEXT     NOT NULL DEFAULT 'pending',
    "files"        TEXT,
    "error"        TEXT,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt"   DATETIME
)`;

const ENSURE_IDX_WORKSPACE_SQL = `
CREATE INDEX IF NOT EXISTS "parse_jobs_workspaceId_status_idx"
ON "parse_jobs"("workspaceId", "status")`;

const ENSURE_IDX_CREATED_SQL = `
CREATE INDEX IF NOT EXISTS "parse_jobs_createdAt_idx"
ON "parse_jobs"("createdAt")`;

let _bootstrapped = false;

async function ensureTable() {
  if (_bootstrapped) return;
  await prisma.$executeRawUnsafe(ENSURE_TABLE_SQL);
  await prisma.$executeRawUnsafe(ENSURE_IDX_WORKSPACE_SQL);
  await prisma.$executeRawUnsafe(ENSURE_IDX_CREATED_SQL);
  _bootstrapped = true;
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
      JOB_STATUS.PROCESSING
    );
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
  const cutoffMs = Date.now() - JOB_TTL_MS;
  const cutoff = new Date(cutoffMs).toISOString();
  await prisma.$executeRawUnsafe(
    `DELETE FROM parse_jobs
      WHERE status IN (?, ?)
        AND finishedAt IS NOT NULL
        AND finishedAt < ?`,
    JOB_STATUS.COMPLETED,
    JOB_STATUS.FAILED,
    cutoff
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
    console.warn("[ParseJobs] sweep error (non-fatal):", e.message)
  );

  const id = v4();
  await prisma.$executeRawUnsafe(
    `INSERT INTO parse_jobs (id, workspaceId, userId, originalname, status, createdAt)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    id,
    workspaceId,
    userId ?? null,
    originalname,
    JOB_STATUS.PENDING
  );
  return _toJob(
    await _queryOne(
      "SELECT * FROM parse_jobs WHERE id = ?",
      id
    )
  );
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
  const row = await _queryOne(
    "SELECT * FROM parse_jobs WHERE id = ?",
    jobId
  );
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
    jobId
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
    jobId
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
    jobId
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function _queryOne(sql, ...params) {
  const rows = await prisma.$queryRawUnsafe(sql, ...params);
  return Array.isArray(rows) ? rows[0] ?? null : rows ?? null;
}

/**
 * Map a raw SQLite row to the same shape the callers expected from the old
 * in-memory Map so no changes are needed in the endpoint or worker code.
 */
function _toJob(row) {
  if (!row) return null;
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
    status: row.status,
    files: row.files ? JSON.parse(row.files) : null,
    error: row.error ?? null,
    // Normalise datetime strings / Date objects to Unix ms for backwards compat.
    createdAt: _toMs(row.createdAt),
    finishedAt: row.finishedAt ? _toMs(row.finishedAt) : null,
  };
}

function _toMs(val) {
  if (!val) return null;
  if (typeof val === "number") return val;
  if (val instanceof Date) return val.getTime();
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
