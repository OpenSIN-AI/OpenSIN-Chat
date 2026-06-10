// SPDX-License-Identifier: MIT
/**
 * Web search engine wrapper — delegates to the configured search provider
 * from SystemSettings (SerpAPI, DuckDuckGo, etc.).
 *
 * Docs: webSearchEngine.doc.md
 * Purpose: Reuses the existing OpenSIN search infrastructure for the research pipeline.
 */

const { SystemSettings } = require("../../models/systemSettings");

class WebSearchEngine {
  /**
   * Perform a web search using the configured provider.
   * @param {string} query
   * @returns {Promise<Array<{title: string, link: string, snippet: string}>>}
   */
  static async search(query) {
    const provider = (await SystemSettings.get({ label: "agent_search_provider" }))?.value ?? "unknown";
    const apiKey = (await SystemSettings.get({ label: "agent_search_api_key" }))?.value ?? null;

    switch (provider) {
      case "serpapi":
        return WebSearchEngine.#serpApi(query, apiKey);
      case "duckduckgo-engine":
        return WebSearchEngine.#duckDuckGo(query);
      default:
        return WebSearchEngine.#duckDuckGo(query);
    }
  }

  static async #serpApi(query, apiKey) {
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
          results.push({ title: t.Text.substring(0, 100), link: t.FirstURL, snippet: t.Text });
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
