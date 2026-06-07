// SPDX-License-Identifier: MIT
/**
 * Sync fallback & retry-queue helpers (Issue #52).
 *
 * Pure, side-effect-free utilities used by the politician sync job to
 *   1. fall back to an alternative data source when the primary one is down
 *      (Bundestag <-> Abgeordnetenwatch, Plenarprotokolle -> DIP API), and
 *   2. schedule failed sync phases for a later retry using an exponential
 *      back-off schedule (15min -> 1h -> 4h -> 12h -> 24h, max 5 attempts).
 *
 * Keeping this logic free of database / network access makes it fully unit
 * testable and reusable across the job and the status endpoint.
 */

/**
 * Exponential back-off schedule in milliseconds, one entry per retry attempt.
 * attempt 1 -> 15min, 2 -> 1h, 3 -> 4h, 4 -> 12h, 5 -> 24h.
 * Attempts beyond the schedule reuse the final (longest) delay.
 * @type {number[]}
 */
const RETRY_SCHEDULE_MS = [
  15 * 60 * 1000, // 15 minutes
  60 * 60 * 1000, // 1 hour
  4 * 60 * 60 * 1000, // 4 hours
  12 * 60 * 60 * 1000, // 12 hours
  24 * 60 * 60 * 1000, // 24 hours
];

/** Maximum number of retry attempts before a phase is marked permanently failed. */
const MAX_RETRIES = RETRY_SCHEDULE_MS.length;

/**
 * The sync phases the job runs, in execution order. Used as stable keys for
 * the retry queue and the status dashboard.
 * @type {{members: string, abgeordnetenwatch: string, speeches: string}}
 */
const SYNC_PHASES = {
  members: "members",
  abgeordnetenwatch: "abgeordnetenwatch",
  speeches: "speeches",
};

/**
 * Compute the back-off delay (ms) for a given 1-based attempt number.
 * @param {number} attempt - 1 for the first retry, 2 for the second, ...
 * @returns {number} delay in milliseconds
 */
function computeBackoffMs(attempt) {
  if (!Number.isFinite(attempt) || attempt < 1) return RETRY_SCHEDULE_MS[0];
  const idx = Math.min(Math.floor(attempt) - 1, RETRY_SCHEDULE_MS.length - 1);
  return RETRY_SCHEDULE_MS[idx];
}

/**
 * Whether another retry should be scheduled after `attempt` failures.
 * @param {number} attempt - number of attempts already made (>= 1)
 * @returns {boolean}
 */
function shouldRetry(attempt) {
  return Number.isFinite(attempt) && attempt < MAX_RETRIES;
}

/**
 * Compute the next retry timestamp for a given attempt.
 * @param {number} attempt - 1-based attempt number
 * @param {Date} [now=new Date()] - reference time (injectable for tests)
 * @returns {Date}
 */
function nextRetryAt(attempt, now = new Date()) {
  return new Date(now.getTime() + computeBackoffMs(attempt));
}

/**
 * Run `primary`; if it throws or returns an "empty" result, run `fallback`.
 *
 * A result is considered empty when it is null/undefined or an empty array,
 * which lets us treat a reachable-but-unhelpful upstream (HTTP 200 with no
 * rows) the same as an outage and still try the alternative source.
 *
 * @template T
 * @param {() => Promise<T>} primary - primary source fetch
 * @param {() => Promise<T>} fallback - fallback source fetch
 * @param {Object} [opts]
 * @param {string} [opts.label] - label for logging
 * @param {(msg: string) => void} [opts.log] - logger (defaults to console.warn)
 * @param {(value: T) => boolean} [opts.isEmpty] - custom emptiness check
 * @returns {Promise<{data: T, usedFallback: boolean, error: Error|null}>}
 */
async function withFallback(primary, fallback, opts = {}) {
  const {
    label = "source",
    log = (msg) => console.warn(msg),
    isEmpty = defaultIsEmpty,
  } = opts;

  let primaryError = null;
  try {
    const data = await primary();
    if (!isEmpty(data)) return { data, usedFallback: false, error: null };
    log(`[syncFallback] ${label}: primary returned empty, trying fallback...`);
  } catch (err) {
    primaryError = err;
    log(`[syncFallback] ${label}: primary failed (${err.message}), trying fallback...`);
  }

  try {
    const data = await fallback();
    return { data, usedFallback: true, error: null };
  } catch (fallbackErr) {
    // Both sources failed — surface the most relevant error.
    return {
      data: null,
      usedFallback: true,
      error: primaryError || fallbackErr,
    };
  }
}

/**
 * Default emptiness check: null/undefined or empty array.
 * @param {*} value
 * @returns {boolean}
 */
function defaultIsEmpty(value) {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

module.exports = {
  RETRY_SCHEDULE_MS,
  MAX_RETRIES,
  SYNC_PHASES,
  computeBackoffMs,
  shouldRetry,
  nextRetryAt,
  withFallback,
  defaultIsEmpty,
};
