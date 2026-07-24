// SPDX-License-Identifier: MIT
/**
 * Centralized query-limit guards for Prisma `findMany` calls.
 *
 * Historically many model methods accepted a `limit` argument that defaulted to
 * `null`, and when `null` was passed no `take` clause was applied at all — the
 * query returned every matching row. On growth tables (chats, documents,
 * vectors, event_logs) this is an out-of-memory (OOM) risk in production.
 *
 * These helpers normalize any caller-supplied limit into a safe, bounded value
 * so a `take` clause is ALWAYS present, while preserving existing pagination
 * semantics (callers can still request smaller pages).
 */

// Default page size when a caller does not specify one.
const DEFAULT_LIST_LIMIT = 100;

// Absolute ceiling for a single list query. Even "unbounded" callers are
// clamped to this so a single query can never load an entire large table.
const MAX_LIST_LIMIT = 1000;

// Batch size for background/cursor-based jobs that intentionally page through
// an entire table in chunks.
const BATCH_LIMIT = 500;

/**
 * Normalize a caller-supplied limit into a safe integer within [1, max].
 *
 * - `null` / `undefined` / non-numeric  -> `fallback` (defaults to DEFAULT_LIST_LIMIT)
 * - values <= 0                         -> `fallback`
 * - values > `max`                      -> `max`
 *
 * @param {number|string|null|undefined} requested
 * @param {object} [options]
 * @param {number} [options.max=MAX_LIST_LIMIT] Absolute ceiling.
 * @param {number} [options.fallback=DEFAULT_LIST_LIMIT] Used when requested is missing/invalid.
 * @returns {number} A safe integer limit.
 */
function clampLimit(requested, options = {}) {
  const { max = MAX_LIST_LIMIT, fallback = DEFAULT_LIST_LIMIT } = options;
  const ceiling =
    Number.isFinite(max) && max > 0 ? Math.floor(max) : MAX_LIST_LIMIT;
  const safeFallback = Math.min(
    Number.isFinite(fallback) && fallback > 0
      ? Math.floor(fallback)
      : DEFAULT_LIST_LIMIT,
    ceiling,
  );

  const parsed = typeof requested === "string" ? Number(requested) : requested;

  if (!Number.isFinite(parsed) || parsed <= 0) return safeFallback;
  return Math.min(Math.floor(parsed), ceiling);
}

/**
 * Build a Prisma `take`/`skip` fragment with a guaranteed bounded `take`.
 *
 * Spread the result into a findMany call:
 *   prisma.model.findMany({ where, ...paginate(limit, offset) })
 *
 * @param {number|string|null|undefined} limit
 * @param {number|string|null|undefined} [offset=null]
 * @param {object} [options] Passed through to clampLimit (max/fallback).
 * @returns {{take: number, skip?: number}}
 */
function paginate(limit, offset = null, options = {}) {
  const fragment = { take: clampLimit(limit, options) };
  const parsedOffset = typeof offset === "string" ? Number(offset) : offset;
  if (Number.isFinite(parsedOffset) && parsedOffset > 0) {
    fragment.skip = Math.floor(parsedOffset);
  }
  return fragment;
}

/**
 * Normalize an offset into a safe non-negative integer (0 when missing/invalid).
 * @param {number|string|null|undefined} offset
 * @returns {number}
 */
function clampOffset(offset) {
  const parsed = typeof offset === "string" ? Number(offset) : offset;
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

module.exports = {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  BATCH_LIMIT,
  clampLimit,
  clampOffset,
  paginate,
};
