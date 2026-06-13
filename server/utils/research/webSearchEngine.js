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
 */

const { SystemSettings } = require("../../models/systemSettings");

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
      const url = `${baseUrl.replace(/\/$/, "")}/search?q=${encodeURIComponent(query)}&format=json&language=de`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || [])
        .map((r) => ({
          title: r.title || "",
          link: r.url || "",
          snippet: r.content || "",
        }))
        .slice(0, 10);
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
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(apiKey)}&hl=de&gl=de&num=10`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.organic_results || []).map((r) => ({
        title: r.title || "",
        link: r.link || "",
        snippet: r.snippet || "",
      }));
    } catch (err) {
      console.error(`[WebSearchEngine] SerpAPI error: ${err.message}`);
      return [];
    }
  }

  static async #duckDuckGo(query) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
      const res = await fetch(url);
      if (!res.ok) return [];
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
    } catch (err) {
      console.error(`[WebSearchEngine] DuckDuckGo error: ${err.message}`);
      return [];
    }
  }
}

module.exports = { WebSearchEngine };
