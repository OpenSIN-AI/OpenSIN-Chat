// SPDX-License-Identifier: MIT

/**
 * fetch() wrapper that aborts after `timeoutMs`. Used by the sidebars so a slow
 * or hung backend/upstream API can never leave the panel spinning forever.
 *
 * Pass an external `signal` (e.g. from a component-scoped AbortController) to
 * also cancel the request when the sidebar closes or the component unmounts.
 * The returned promise rejects with a friendly, localized message on timeout.
 *
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = 8000, signal: externalSignal, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Forward an external abort (unmount/close) to our internal controller.
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else
      externalSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
  }

  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } catch (e) {
    // Distinguish a real timeout/cancel from a network error.
    if (e.name === "AbortError") {
      if (externalSignal?.aborted) throw e; // intentional cancel — let caller ignore
      throw new Error("Zeitüberschreitung – Server antwortet nicht.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export default fetchWithTimeout;
