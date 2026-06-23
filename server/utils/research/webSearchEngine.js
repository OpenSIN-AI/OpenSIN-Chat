// SPDX-License-Identifier: MIT
/**
 * Web search engine wrapper — delegates to the configured search provider
 * from SystemSettings (Vane, SearxNG, SerpAPI, DuckDuckGo).
 *
 * Provider values MUST match frontend WebSearchSelection values:
 * "vane" | "searxng-engine" | "serpapi" | "duckduckgo-engine"
 *
 * Docs: webSearchEngine.doc.md
 * Purpose: Reuses the existing OpenSIN search infrastructure for the research pipeline.
 * Resilience: ResilientHttpClient (timeout, retry, rate limit, circuit breaker, stale
 *             response fallback) per provider; short-TTL SWR cache on parsed results.
 */

const { SystemSettings } = require("../../models/systemSettings");
const { ResilientHttpClient } = require("../helpers/resilientHttpClient");
const { withCache, clearCache } = require("./cache");

const serpApiClient = new ResilientHttpClient({
  timeoutMs: 15_000,
  maxRetries: 2,
  rateLimitDelayMs: 500,
  circuitBreakerThreshold: 5,
  circuitBreakerCooldownMs: 30_000,
  cacheTtlMs: 5 * 60 * 1000,
});
const duckDuckGoClient = new ResilientHttpClient({
  timeoutMs: 10_000,
  maxRetries: 2,
  rateLimitDelayMs: 500,
  circuitBreakerThreshold: 5,
  circuitBreakerCooldownMs: 30_000,
  cacheTtlMs: 5 * 60 * 1000,
});
const searxngClient = new ResilientHttpClient({
  timeoutMs: 15_000,
  maxRetries: 2,
  rateLimitDelayMs: 500,
  circuitBreakerThreshold: 5,
  circuitBreakerCooldownMs: 30_000,
  cacheTtlMs: 5 * 60 * 1000,
});

function resetAll() {
  serpApiClient.reset();
  duckDuckGoClient.reset();
  searxngClient.reset();
  clearCache();
}

class WebSearchEngine {
  /**
   * Perform a web search using the configured provider.
   * Priority: explicit setting → Vane sidecar (if reachable) → DuckDuckGo fallback.
   * @param {string} query
   * @returns {Promise<Array<{title: string, link: string, snippet: string}>>}
   */
  static async search(query) {
    const provider =
      (await SystemSettings.get({ label: "agent_search_provider" }))?.value ??
      "unknown";

    switch (provider) {
      case "vane":
        return WebSearchEngine.#vane(query);
      case "searxng-engine":
        return WebSearchEngine.#searxng(query);
      case "serpapi":
        return WebSearchEngine.#serpApi(query);
      case "duckduckgo-engine":
        return WebSearchEngine.#duckDuckGo(query);
      default: {
        // Smart fallback: prefer Vane sidecar if it is running, else DDG
        const { VaneClient } = require("./vaneClient");
        if (await VaneClient.isAvailable()) {
          const results = await WebSearchEngine.#vane(query);
          if (results.length) return results;
        }
        return WebSearchEngine.#duckDuckGo(query);
      }
    }
  }

  /** Vane sidecar — cited AI search, returns its sources as results. */
  static async #vane(query) {
    try {
      const { VaneClient } = require("./vaneClient");
      return await VaneClient.search(query);
    } catch (err) {
      console.error(`[WebSearchEngine] Vane error: ${err.message}`);
      return [];
    }
  }

  /**
   * Direct SearxNG query. Reuses the SAME env var as the agent
   * web-browsing skill (AGENT_SEARXNG_API_URL) so one config serves both.
   * Vane's bundled SearxNG works here too: http://vane:8080
   */
  static async #searxng(query) {
    const baseUrl = process.env.AGENT_SEARXNG_API_URL;
    if (!baseUrl) return [];
    try {
      return await withCache(`searxng:${query}`, async () => {
        const url = `${baseUrl.replace(/\/$/, "")}/search?q=${encodeURIComponent(query)}&format=json&language=de`;
        const res = await searxngClient.fetch(url);
        if (!res.ok) throw new Error(`SearxNG HTTP ${res.status}`);
        const data = await res.json();
        return (data.results || [])
          .map((r) => ({
            title: r.title || "",
            link: r.url || "",
            snippet: r.content || "",
          }))
          .slice(0, 10);
      });
    } catch (err) {
      console.error(`[WebSearchEngine] SearxNG error: ${err.message}`);
      return [];
    }
  }

  /** SerpAPI — reuses the agent skill's env key, not a duplicate setting. */
  static async #serpApi(query) {
    const apiKey = process.env.AGENT_SERPAPI_API_KEY;
    if (!apiKey) return [];
    try {
      return await withCache(`serpapi:${query}`, async () => {
        const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(apiKey)}&hl=de&gl=de&num=10`;
        const res = await serpApiClient.fetch(url);
        if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`);
        const data = await res.json();
        return (data.organic_results || []).map((r) => ({
          title: r.title || "",
          link: r.link || "",
          snippet: r.snippet || "",
        }));
      });
    } catch (err) {
      console.error(`[WebSearchEngine] SerpAPI error: ${err.message}`);
      return [];
    }
  }

  static async #duckDuckGo(query) {
    try {
      return await withCache(`ddg:${query}`, async () => {
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
        const res = await duckDuckGoClient.fetch(url);
        if (!res.ok) throw new Error(`DuckDuckGo HTTP ${res.status}`);
        const data = await res.json();
        const results = [];
        if (data.AbstractURL) {
          results.push({
            title: data.AbstractText?.substring(0, 100) || query,
            link: data.AbstractURL,
            snippet: data.AbstractText || "",
          });
        }
        (data.RelatedTopics || []).forEach((t) => {
          if (t.FirstURL && t.Text) {
            results.push({
              title: t.Text.substring(0, 100),
              link: t.FirstURL,
              snippet: t.Text,
            });
          }
        });
        return results.slice(0, 10);
      });
    } catch (err) {
      console.error(`[WebSearchEngine] DuckDuckGo error: ${err.message}`);
      return [];
    }
  }
}

module.exports = { WebSearchEngine, resetAll };
