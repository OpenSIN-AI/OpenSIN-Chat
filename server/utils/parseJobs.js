// SPDX-License-Identifier: MIT
// Purpose: Data-access layer for the parse_jobs table.
//          parse_jobs tracks the lifecycle of background file-parse
//          operations started by workspacesParsedFiles POST /parse.
//          The job id is generated in application code (UUID v4) so it
//          can be returned to the client before the DB row is committed.
//
// Uses raw SQL ($executeRawUnsafe / $queryRawUnsafe) so it can be tested
// against the shared in-memory SQLite helper (server/__tests__/helpers/inMemoryDb)
// without requiring a running Prisma engine or native adapter.

const prisma = require("./prisma");
const { v4: uuidv4 } = require("uuid");
const consoleLogger = require("./logger/console.js");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * @typedef {'pending'|'processing'|'completed'|'failed'} JobStatus
 */
const JOB_STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
});

/** Finished jobs older than this are deleted by the background sweep. */
const SWEEP_TTL_MINUTES = 35;

/** Pending jobs older than this grace period are assumed orphaned by a crash. */
const STALL_GRACE_MINUTES = 2;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _bootstrapped = false;

/**
 * Create the parse_jobs table if it does not exist yet.
 * Idempotent — safe to call multiple times.
 */
async function ensureTable() {
  if (_bootstrapped) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS parse_jobs (
      id           TEXT PRIMARY KEY,
      workspaceId  INTEGER NOT NULL,
      userId       INTEGER,
      originalname TEXT    NOT NULL,
      status       TEXT    NOT NULL DEFAULT 'pending',
      files        TEXT,
      error        TEXT,
      createdAt    TEXT    NOT NULL DEFAULT (datetime('now')),
      finishedAt   TEXT
    )
  `);
  _bootstrapped = true;
}

/**
 * Convert a SQLite UTC datetime string (space-separated, e.g.
 * "2024-01-15 13:45:00") to a Unix millisecond timestamp.
 * SQLite stores UTC but JS Date.parse treats a bare space-separated
 * string as LOCAL time — we must replace the space with 'T' and
 * append 'Z' to force UTC parsing.
 *
 * @param {string|null} s
 * @returns {number|null}
 */
function _toMs(s) {
  if (!s) return null;
  // Already ISO-8601 ("2024-01-15T13:45:00.000Z") — pass through.
  const normalised = s.includes("T") ? s : s.replace(" ", "T") + "Z";
  const ms = Date.parse(normalised);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Deserialise a raw SQLite row into the shape returned to callers.
 * Handles corrupted `files` JSON gracefully by degrading the job to
 * 'failed' instead of throwing.
 *
 * @param {object} row
 * @returns {object}
 */
function _toJob(row) {
  if (!row) return null;
  let files = null;
  let status = row.status;
  let error = row.error ?? null;

  if (row.files) {
    try {
      files = JSON.parse(row.files);
    } catch {
      // Corrupted stored JSON — degrade gracefully.
      status = JOB_STATUS.FAILED;
      error = "Stored files data is corrupted — please re-upload.";
    }
  }

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    userId: row.userId ?? null,
    originalname: row.originalname,
    status,
    files,
    error,
    createdAt: _toMs(row.createdAt),
    finishedAt: _toMs(row.finishedAt),
  };
}

/**
 * Delete finished jobs (completed/failed) whose finishedAt is older than
 * SWEEP_TTL_MINUTES. Runs fire-and-forget from create() so any test that
 * wants deterministic sweep behaviour must await an explicit call.
 */
async function _sweepOldJobs() {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM parse_jobs
       WHERE status IN ('completed', 'failed')
         AND finishedAt IS NOT NULL
         AND finishedAt < datetime('now', ?)`,
      `-${SWEEP_TTL_MINUTES} minutes`
    );
  } catch (e) {
    consoleLogger.error("[ParseJobs._sweepOldJobs]", e.message);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const ParseJobs = {
  /**
   * Create a new pending parse job.
   * Also triggers a fire-and-forget TTL sweep so finished rows are cleaned up
   * without requiring a dedicated cron job.
   *
   * @param {{ workspaceId: number, userId?: number|null, originalname: string }} params
   * @returns {Promise<object>} The newly created job row.
   */
  async create({ workspaceId, userId = null, originalname }) {
    await ensureTable();
    const id = uuidv4();
    await prisma.$executeRawUnsafe(
      `INSERT INTO parse_jobs (id, workspaceId, userId, originalname, status)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      parseInt(workspaceId),
      userId !== null && userId !== undefined ? parseInt(userId) : null,
      String(originalname),
      JOB_STATUS.PENDING
    );

    // Fire-and-forget sweep — do not await so create() returns promptly.
    _sweepOldJobs().catch(() => {});

    // Return the full job shape so callers (and tests) can read the row immediately.
    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM parse_jobs WHERE id = ?`,
      id
    );
    return _toJob(rows[0]);
  },

  /**
   * Retrieve a job by id, scoped to the workspace (and optionally user).
   * Returns null when no matching row exists.
   *
   * @param {string} jobId
   * @param {{ workspaceId: number, userId?: number|null }} scope
   * @returns {Promise<object|null>}
   */
  async get(jobId, { workspaceId, userId = null }) {
    await ensureTable();
    try {
      // userId=null means single-user mode — skip user scoping.
      const rows =
        userId !== null && userId !== undefined
          ? await prisma.$queryRawUnsafe(
              `SELECT * FROM parse_jobs
               WHERE id = ? AND workspaceId = ? AND userId = ?`,
              String(jobId),
              parseInt(workspaceId),
              parseInt(userId)
            )
          : await prisma.$queryRawUnsafe(
              `SELECT * FROM parse_jobs
               WHERE id = ? AND workspaceId = ?`,
              String(jobId),
              parseInt(workspaceId)
            );
      return _toJob(rows[0] ?? null);
    } catch (e) {
      consoleLogger.error("[ParseJobs.get]", e.message);
      return null;
    }
  },

  /**
   * Transition a job to 'processing'.
   * @param {string} jobId
   */
  async markProcessing(jobId) {
    await ensureTable();
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE parse_jobs SET status = ? WHERE id = ?`,
        JOB_STATUS.PROCESSING,
        String(jobId)
      );
    } catch (e) {
      consoleLogger.error("[ParseJobs.markProcessing]", e.message);
    }
  },

  /**
   * Transition a job to 'completed' and persist the resulting file records.
   * @param {string} jobId
   * @param {Array} [files=[]] - The WorkspaceParsedFiles rows produced by the job.
   */
  async markCompleted(jobId, files = []) {
    await ensureTable();
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE parse_jobs
         SET status = ?, files = ?, finishedAt = datetime('now')
         WHERE id = ?`,
        JOB_STATUS.COMPLETED,
        JSON.stringify(files ?? []),
        String(jobId)
      );
    } catch (e) {
      consoleLogger.error("[ParseJobs.markCompleted]", e.message);
    }
  },

  /**
   * Transition a job to 'failed' and record the error reason.
   * @param {string} jobId
   * @param {string} [reason="Unknown error"]
   */
  async markFailed(jobId, reason = "Unknown error") {
    await ensureTable();
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE parse_jobs
         SET status = ?, error = ?, finishedAt = datetime('now')
         WHERE id = ?`,
        JOB_STATUS.FAILED,
        String(reason || "Unknown error"),
        String(jobId)
      );
    } catch (e) {
      consoleLogger.error("[ParseJobs.markFailed]", e.message);
    }
  },

  /**
   * Purge completed/failed jobs older than `maxAgeMs` milliseconds.
   * Wraps the internal sweep with a caller-supplied max age.
   * @param {number} [maxAgeMs] - Maximum age in ms (default: SWEEP_TTL_MINUTES).
   * @returns {Promise<void>}
   */
  async purgeOld(maxAgeMs) {
    const minutes =
      maxAgeMs !== undefined
        ? Math.ceil(maxAgeMs / 60000)
        : SWEEP_TTL_MINUTES;
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM parse_jobs
         WHERE status IN ('completed', 'failed')
           AND finishedAt IS NOT NULL
           AND finishedAt < datetime('now', ?)`,
        `-${minutes} minutes`
      );
    } catch (e) {
      consoleLogger.error("[ParseJobs.purgeOld]", e.message);
    }
  },
};

// ---------------------------------------------------------------------------
// Boot-time recovery
// ---------------------------------------------------------------------------

/**
 * Mark orphaned jobs as failed so the frontend stops polling after a
 * server restart.
 *
 * - 'processing' jobs: always orphaned (the worker that was running them is dead).
 * - 'pending' jobs: orphaned if they are older than STALL_GRACE_MINUTES
 *   (allows in-flight jobs during a rolling restart to finish normally).
 *
 * Also runs the TTL sweep at boot so quiet instances (no new creates) get
 * cleaned up too.
 *
 * @returns {Promise<void>}
 */
async function recoverStalledJobs() {
  await ensureTable();
  try {
    // Mark all 'processing' rows as failed — their worker is gone.
    await prisma.$executeRawUnsafe(
      `UPDATE parse_jobs
       SET status = ?, error = ?, finishedAt = datetime('now')
       WHERE status = ?`,
      JOB_STATUS.FAILED,
      "Server restarted while this job was running — please re-upload.",
      JOB_STATUS.PROCESSING
    );

    // Mark 'pending' rows past the grace period as failed.
    await prisma.$executeRawUnsafe(
      `UPDATE parse_jobs
       SET status = ?, error = ?, finishedAt = datetime('now')
       WHERE status = ?
         AND createdAt < datetime('now', ?)`,
      JOB_STATUS.FAILED,
      "Server restarted before this job was picked up — please re-upload.",
      JOB_STATUS.PENDING,
      `-${STALL_GRACE_MINUTES} minutes`
    );

    // Run the TTL sweep at boot for quiet instances.
    await _sweepOldJobs();
  } catch (e) {
    consoleLogger.error("[ParseJobs.recoverStalledJobs]", e.message);
  }
}

module.exports = { ParseJobs, JOB_STATUS, recoverStalledJobs };
