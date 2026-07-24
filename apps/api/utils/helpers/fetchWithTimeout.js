// SPDX-License-Identifier: MIT
/**
 * fetchWithTimeout — wrapper around global fetch with an AbortSignal timeout.
 *
 * Purpose: Provides a single, reusable fetch wrapper so every external HTTP
 * call in the research pipeline gets a consistent timeout. Uses
 * AbortSignal.timeout() under the hood, preserving the same signal contract
 * that existing tests assert against.
 *
 * Docs: fetchWithTimeout.doc.md
 */

const DEFAULT_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(
  url,
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const { signal, ...rest } = options;
  if (signal) return fetch(url, { ...rest, signal });
  return fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
}

module.exports = { fetchWithTimeout, DEFAULT_TIMEOUT_MS };
