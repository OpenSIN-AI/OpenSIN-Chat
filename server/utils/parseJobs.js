// SPDX-License-Identifier: MIT
// Purpose: Data-access layer for the parse_jobs table.
//          parse_jobs tracks the lifecycle of background file-parse
//          operations started by workspacesParsedFiles POST /parse.
//          The job id is generated in application code (UUID v4) so it
//          can be returned to the client before the DB row is committed.

const prisma = require("./prisma");
const { v4: uuidv4 } = require("uuid");
const consoleLogger = require("./logger/console.js");

/**
 * @typedef {'pending'|'processing'|'completed'|'failed'} JobStatus
 */

const JOB_STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
});

const ParseJobs = {
  /**
   * Create a new pending parse job.
   * @param {{ workspaceId: number, userId?: number|null, originalname: string }} params
   * @returns {Promise<{ id: string }>}
   */
  async create({ workspaceId, userId = null, originalname }) {
    const id = uuidv4();
    await prisma.parse_jobs.create({
      data: {
        id,
        workspaceId: parseInt(workspaceId),
        userId: userId ? parseInt(userId) : null,
        originalname: String(originalname),
        status: JOB_STATUS.PENDING,
      },
    });
    return { id };
  },

  /**
   * Retrieve a job by id, scoped to the workspace (and optionally user).
   * Returns null when no matching row exists.
   * @param {string} jobId
   * @param {{ workspaceId: number, userId?: number|null }} scope
   * @returns {Promise<object|null>}
   */
  async get(jobId, { workspaceId, userId = null }) {
    try {
      const row = await prisma.parse_jobs.findFirst({
        where: {
          id: String(jobId),
          workspaceId: parseInt(workspaceId),
          ...(userId !== null && userId !== undefined
            ? { userId: parseInt(userId) }
            : {}),
        },
      });
      if (!row) return null;
      return {
        ...row,
        // Deserialise the files JSON array for callers so they never have to
        // manually parse it.
        files: row.files ? JSON.parse(row.files) : null,
      };
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
    try {
      await prisma.parse_jobs.update({
        where: { id: String(jobId) },
        data: { status: JOB_STATUS.PROCESSING },
      });
    } catch (e) {
      consoleLogger.error("[ParseJobs.markProcessing]", e.message);
    }
  },

  /**
   * Transition a job to 'completed' and persist the resulting file records.
   * @param {string} jobId
   * @param {Array} files - The WorkspaceParsedFiles rows produced by the job.
   */
  async markCompleted(jobId, files = []) {
    try {
      await prisma.parse_jobs.update({
        where: { id: String(jobId) },
        data: {
          status: JOB_STATUS.COMPLETED,
          files: JSON.stringify(files),
          finishedAt: new Date(),
        },
      });
    } catch (e) {
      consoleLogger.error("[ParseJobs.markCompleted]", e.message);
    }
  },

  /**
   * Transition a job to 'failed' and record the error reason.
   * @param {string} jobId
   * @param {string} reason
   */
  async markFailed(jobId, reason = "Unknown error") {
    try {
      await prisma.parse_jobs.update({
        where: { id: String(jobId) },
        data: {
          status: JOB_STATUS.FAILED,
          error: String(reason),
          finishedAt: new Date(),
        },
      });
    } catch (e) {
      consoleLogger.error("[ParseJobs.markFailed]", e.message);
    }
  },

  /**
   * Purge completed/failed jobs older than `maxAgeMs` milliseconds.
   * Called periodically by the cleanup scheduler to prevent unbounded table
   * growth.  Uses batched deletes to avoid a single long-running transaction.
   * @param {number} maxAgeMs - Maximum age in milliseconds (default: 7 days).
   * @returns {Promise<number>} Number of rows deleted.
   */
  async purgeOld(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    try {
      const cutoff = new Date(Date.now() - maxAgeMs);
      const { count } = await prisma.parse_jobs.deleteMany({
        where: {
          status: { in: [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED] },
          finishedAt: { lt: cutoff },
        },
      });
      return count;
    } catch (e) {
      consoleLogger.error("[ParseJobs.purgeOld]", e.message);
      return 0;
    }
  },
};

module.exports = { ParseJobs, JOB_STATUS };
