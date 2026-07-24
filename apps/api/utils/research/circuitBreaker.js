// SPDX-License-Identifier: MIT
/**
 * Circuit breaker — protects external API calls from cascading failures.
 *
 * Purpose: Wraps async operations with failure tracking. After N consecutive
 * failures the circuit opens and subsequent calls short-circuit immediately
 * (no network attempt). After a cooldown period the circuit goes half-open:
 * one trial call is allowed; on success the circuit closes, on failure it
 * re-opens.
 *
 * Docs: circuitBreaker.doc.md
 */

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_COOLDOWN_MS = 30_000;

function createCircuitBreaker(name, opts = {}) {
  const failureThreshold = opts.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const cooldownMs = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS;

  let state = "closed";
  let failureCount = 0;
  let lastFailureTime = 0;

  async function call(fn) {
    if (state === "open") {
      if (Date.now() - lastFailureTime >= cooldownMs) {
        state = "half-open";
      } else {
        throw new Error(
          `Circuit breaker "${name}" is open — calls suspended for ${Math.ceil((cooldownMs - (Date.now() - lastFailureTime)) / 1000)}s`,
        );
      }
    }

    try {
      const result = await fn();
      state = "closed";
      failureCount = 0;
      return result;
    } catch (err) {
      failureCount++;
      lastFailureTime = Date.now();
      if (failureCount >= failureThreshold) {
        state = "open";
      }
      throw err;
    }
  }

  function getState() {
    return {
      name,
      state,
      failureCount,
      failureThreshold,
      cooldownMs,
      lastFailureTime,
    };
  }

  function reset() {
    state = "closed";
    failureCount = 0;
    lastFailureTime = 0;
  }

  function forceOpen() {
    state = "open";
    lastFailureTime = Date.now();
  }

  return { call, getState, reset, forceOpen };
}

module.exports = {
  createCircuitBreaker,
  DEFAULT_FAILURE_THRESHOLD,
  DEFAULT_COOLDOWN_MS,
};
