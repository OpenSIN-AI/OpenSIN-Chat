// SPDX-License-Identifier: MIT

const MAX_QUERY_LENGTH = 200;
const MAX_RESULT_LIMIT = 50;

function normalizeQuery(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

function normalizeLimit(value, fallback = 24) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), MAX_RESULT_LIMIT);
}

function escapeLikePattern(value) {
  return value.replace(/[%_\\]/g, "\\$&");
}

module.exports = {
  MAX_QUERY_LENGTH,
  MAX_RESULT_LIMIT,
  normalizeQuery,
  normalizeLimit,
  escapeLikePattern,
};
