// SPDX-License-Identifier: MIT

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase();
}

function recencyScore(date) {
  if (!date) return 0;
  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return 0;

  const ageDays = Math.max(0, (Date.now() - timestamp) / 86_400_000);

  if (ageDays <= 1) return 10;
  if (ageDays <= 7) return 7;
  if (ageDays <= 30) return 4;
  if (ageDays <= 90) return 2;
  return 0;
}

function fieldScore(value, query, weights) {
  const normalized = normalizeText(value);
  const normalizedQuery = normalizeText(query);

  if (!normalized || !normalizedQuery) return 0;

  if (normalized === normalizedQuery) return weights.exact;
  if (normalized.startsWith(normalizedQuery)) return weights.startsWith;
  if (normalized.includes(normalizedQuery)) return weights.includes;

  return 0;
}

function rankSearchResult(result, query) {
  return (
    fieldScore(result.title, query, {
      exact: 100,
      startsWith: 80,
      includes: 55,
    }) +
    fieldScore(result.subtitle, query, {
      exact: 45,
      startsWith: 35,
      includes: 25,
    }) +
    fieldScore(result.snippet, query, {
      exact: 30,
      startsWith: 24,
      includes: 15,
    }) +
    recencyScore(result.updatedAt || result.createdAt)
  );
}

function rankAndLimit({ results, query, limit }) {
  const deduplicated = new Map();

  for (const result of results) {
    const key = `${result.type}:${result.id}`;
    const ranked = { ...result, score: rankSearchResult(result, query) };

    const existing = deduplicated.get(key);
    if (!existing || ranked.score > existing.score) {
      deduplicated.set(key, ranked);
    }
  }

  return Array.from(deduplicated.values())
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return (
        new Date(right.updatedAt || right.createdAt || 0).getTime() -
        new Date(left.updatedAt || left.createdAt || 0).getTime()
      );
    })
    .slice(0, limit);
}

module.exports = {
  normalizeText,
  recencyScore,
  fieldScore,
  rankSearchResult,
  rankAndLimit,
};
