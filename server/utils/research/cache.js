// SPDX-License-Identifier: MIT
/**
 * Short-TTL cache with stale-while-revalidate semantics.
 *
 * Purpose: Caches external API responses (search results, extracted content)
 * to avoid redundant calls within the TTL window. When entries go stale,
 * the stale value is returned immediately and a background revalidation
 * fetch is triggered — the caller never blocks on a revalidation.
 *
 * Docs: cache.doc.md
 */

const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = Number(process.env.RESEARCH_CACHE_MAX_ENTRIES) || 500;

const _store = new Map();

function _evict() {
  while (_store.size > MAX_ENTRIES) {
    const oldest = _store.keys().next().value;
    if (oldest === undefined) break;
    _store.delete(oldest);
  }
}

function getCached(key, ttl = DEFAULT_TTL_MS) {
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt >= ttl) return null;
  return entry.value;
}

function getStale(key) {
  const entry = _store.get(key);
  if (!entry) return null;
  return entry.value;
}

function setCached(key, value) {
  _store.set(key, { value, cachedAt: Date.now() });
  _evict();
}

async function withCache(key, fn, ttl = DEFAULT_TTL_MS) {
  const fresh = getCached(key, ttl);
  if (fresh !== null) return fresh;

  const stale = getStale(key);
  if (stale !== null) {
    fn()
      .then((val) => setCached(key, val))
      .catch(() => {});
    return stale;
  }

  const result = await fn();
  setCached(key, result);
  return result;
}

function clearCache() {
  _store.clear();
}

function deleteCached(key) {
  _store.delete(key);
}

function cacheSize() {
  return _store.size;
}

module.exports = {
  getCached,
  getStale,
  setCached,
  withCache,
  clearCache,
  deleteCached,
  cacheSize,
  DEFAULT_TTL_MS,
  MAX_ENTRIES,
};
