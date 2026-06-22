// SPDX-License-Identifier: MIT
/**
 * Resilient HTTP client — shared wrapper for external API calls.
 *
 * Purpose: Centralises timeout, retry, rate-limit, circuit-breaker, and
 * stale-while-revalidate caching for every outbound HTTP call from the
 * politician sync pipeline (and other external callers).
 *
 * Docs: resilientHttpClient.doc.md
 */

const { fetchWithTimeout } = require("./fetchWithTimeout");

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_RATE_LIMIT_MS = 500;
const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 5;
const DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS = 60_000;
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

class CircuitBreaker {
  constructor(threshold, cooldownMs) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
    this.failures = 0;
    this.lastFailure = 0;
    this.state = "closed"; // closed | open | half-open
  }

  isOpen() {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure >= this.cooldownMs) {
        this.state = "half-open";
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  recordFailure() {
    this.failures += 1;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }
}

class ResilientHttpClient {
  constructor(opts = {}) {
    this.timeoutMs = Number(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    this.maxRetries = Number(opts.maxRetries ?? DEFAULT_MAX_RETRIES);
    this.retryDelayMs = Number(opts.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
    this.rateLimitDelayMs = Number(
      opts.rateLimitDelayMs ?? DEFAULT_RATE_LIMIT_MS,
    );
    this.lastRequestTime = 0;
    this.circuitBreaker = new CircuitBreaker(
      Number(opts.circuitBreakerThreshold ?? DEFAULT_CIRCUIT_BREAKER_THRESHOLD),
      Number(
        opts.circuitBreakerCooldownMs ?? DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS,
      ),
    );
    this.cacheTtlMs = Number(opts.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS);
    this.cache = new Map();
    this.cacheMaxEntries = Number(opts.cacheMaxEntries ?? 500);
  }

  async fetch(url, options = {}) {
    const cacheKey = `${url}|${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.cacheTtlMs) {
      return typeof cached.response.clone === "function"
        ? cached.response.clone()
        : cached.response;
    }

    if (this.circuitBreaker.isOpen()) {
      if (cached) {
        // stale-while-revalidate fallback
        return cached.response.clone();
      }
      throw new Error(`Circuit breaker open for ${url}`);
    }

    await this.#applyRateLimit();

    let lastResponse;
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fetchWithTimeout(url, options, this.timeoutMs);
        lastResponse = res;
        if (!res.ok) {
          if (res.status < 500 && res.status !== 429) {
            this.circuitBreaker.recordSuccess();
            return res;
          }
          if (res.status === 429) {
            const retryAfter = res.headers.get("Retry-After");
            const wait = retryAfter ? Number(retryAfter) * 1000 : 0;
            if (wait) await this.#delay(wait);
            lastError = new Error(`HTTP 429 from ${url}`);
          } else {
            // 5xx responses are returned after retries are exhausted so callers
            // can degrade gracefully (matches legacy behaviour in the politician
            // API clients).
            lastError = new Error(`HTTP ${res.status} from ${url}`);
          }
        } else {
          this.circuitBreaker.recordSuccess();
          // Cache the response. Real Response objects are cloned; plain mocks
          // (used in tests) are stored as-is so caching tests still work.
          this.#setCache(cacheKey, typeof res.clone === "function" ? res.clone() : res);
          return res;
        }
      } catch (err) {
        lastError = err;
        if (err.name === "AbortError") break;
      }

      if (attempt < this.maxRetries) {
        const delay =
          this.retryDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
        await this.#delay(delay);
      }
    }

    this.circuitBreaker.recordFailure();
    if (cached) {
      return typeof cached.response.clone === "function"
        ? cached.response.clone()
        : cached.response;
    }
    if (lastResponse && !lastResponse.ok && lastResponse.status >= 500) {
      return lastResponse;
    }
    throw lastError || new Error(`Resilient fetch failed for ${url}`);
  }

  async #applyRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.rateLimitDelayMs) {
      await this.#delay(this.rateLimitDelayMs - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  #delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  #setCache(key, response) {
    if (this.cache.size >= this.cacheMaxEntries) {
      const first = this.cache.keys().next().value;
      this.cache.delete(first);
    }
    this.cache.set(key, { response, ts: Date.now() });
  }

  stats() {
    return {
      state: this.circuitBreaker.state,
      failures: this.circuitBreaker.failures,
      cacheSize: this.cache.size,
    };
  }

  reset() {
    this.circuitBreaker.state = "closed";
    this.circuitBreaker.failures = 0;
    this.cache.clear();
  }
}

module.exports = {
  ResilientHttpClient,
  CircuitBreaker,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_RATE_LIMIT_MS,
  DEFAULT_CIRCUIT_BREAKER_THRESHOLD,
  DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS,
  DEFAULT_CACHE_TTL_MS,
};
