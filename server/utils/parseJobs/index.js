// SPDX-License-Identifier: MIT
// Purpose: Lightweight in-memory job store for async chat-upload parse jobs.
//          POST /workspace/:slug/parse responds immediately with a jobId and
//          the heavy lifting (collector parsing, DB rows, Supabase mirror)
//          happens in the background. The frontend polls the status endpoint
//          until the job is completed or failed.
//
// Jobs are intentionally NOT persisted to disk — chat uploads are short-lived
// and a server restart mid-parse simply means the user re-uploads the file.

const { v4 } = require("uuid");

/** How long completed/failed jobs stay queryable before cleanup (15 min). */
const JOB_TTL_MS = 15 * 60 * 1000;
/** Hard cap on tracked jobs to bound memory usage. */
const MAX_JOBS = 500;

const JOB_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
};

/** @type {Map<string, ParseJob>} */
const jobs = new Map();

/**
 * @typedef {Object} ParseJob
 * @property {string} id
 * @property {number} workspaceId
 * @property {number|null} userId
 * @property {string} originalname
 * @property {string} status - one of JOB_STATUS
 * @property {Array<object>|null} files - WorkspaceParsedFiles rows on success
 * @property {string|null} error
 * @property {number} createdAt
 * @property {number|null} finishedAt
 */

/** Remove expired finished jobs; enforce the MAX_JOBS cap (oldest first). */
function sweep() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (job.finishedAt && now - job.finishedAt > JOB_TTL_MS) jobs.delete(id);
  }
  if (jobs.size > MAX_JOBS) {
    const sorted = [...jobs.values()].sort((a, b) => a.createdAt - b.createdAt);
    for (const job of sorted.slice(0, jobs.size - MAX_JOBS))
      jobs.delete(job.id);
  }
}

/**
 * Create and track a new parse job.
 * @param {{workspaceId: number, userId?: number|null, originalname: string}} params
 * @returns {ParseJob}
 */
function create({ workspaceId, userId = null, originalname }) {
  sweep();
  const job = {
    id: v4(),
    workspaceId,
    userId,
    originalname,
    status: JOB_STATUS.PENDING,
    files: null,
    error: null,
    createdAt: Date.now(),
    finishedAt: null,
  };
  jobs.set(job.id, job);
  return job;
}

/**
 * Fetch a job scoped to a workspace (and user in multi-user mode).
 * Returns null when the job does not exist or the caller is not allowed
 * to see it — indistinguishable on purpose (no information leak).
 * @param {string} jobId
 * @param {{workspaceId: number, userId?: number|null}} scope
 * @returns {ParseJob|null}
 */
function get(jobId, { workspaceId, userId = null }) {
  const job = jobs.get(jobId);
  if (!job) return null;
  if (job.workspaceId !== workspaceId) return null;
  // In multi-user mode the requesting user must own the job.
  if (userId !== null && job.userId !== null && job.userId !== userId)
    return null;
  return job;
}

/** Mark a job as actively processing. */
function markProcessing(jobId) {
  const job = jobs.get(jobId);
  if (job) job.status = JOB_STATUS.PROCESSING;
}

/** Mark a job as completed with its resulting parsed-file rows. */
function markCompleted(jobId, files) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = JOB_STATUS.COMPLETED;
  job.files = files;
  job.finishedAt = Date.now();
}

/** Mark a job as failed with a user-facing error message. */
function markFailed(jobId, error) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = JOB_STATUS.FAILED;
  job.error = error || "Unknown error";
  job.finishedAt = Date.now();
}

module.exports = {
  JOB_STATUS,
  ParseJobs: {
    create,
    get,
    markProcessing,
    markCompleted,
    markFailed,
  },
};
