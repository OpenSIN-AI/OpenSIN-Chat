// SPDX-License-Identifier: MIT
// Search engine implementations that scrape or use non-standard APIs
// (Bing, Baidu, Serply, SearXNG, DuckDuckGo, Vane).
// Split from web-browsing.js as part of issue #528 — God-File reduction.

const { WEB_FETCH_TIMEOUT_MS } = require("./api-engines.js");

/**
 * Scraping/alternative search engine implementations.
 * Each method is designed to be mixed into the web-browsing aibitat function object,
 * so `this` refers to the function context (with this.super, this.caller, etc.).
 */
const scrapingEngines = {
  _bingWebSearch: async function (query) {
    if (!process.env.AGENT_BING_SEARCH_API_KEY) {
      this.super.introspect(
        `${this.caller}: I can't use Bing Web Search because the user has not defined the required API key.\nVisit: https://portal.azure.com/ to create the API key.`,
      );
      return `Search is disabled and no content was found. This functionality is disabled because the user has not set it up yet.`;
    }

    const searchURL = new URL("https://api.bing.microsoft.com/v7.0/search");
    searchURL.searchParams.append("q", query);

    this.super.introspect(
      `${this.caller}: Using Bing Web Search to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`,
    );

    const searchResponse = await fetch(searchURL, {
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.AGENT_BING_SEARCH_API_KEY,
      },
      signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error(
          `${res.status} - ${res.statusText}. params: ${JSON.stringify({ auth: this.middleTruncate(process.env.AGENT_BING_SEARCH_API_KEY, 5), q: query })}`,
        );
      })
      .then((data) => {
        const searchResults = data.webPages?.value || [];
        return searchResults.map((result) => ({
          title: result.name,
          link: result.url,
          snippet: result.snippet,
        }));
      })
      .catch((e) => {
        this.super.handlerProps.log(`Bing Web Search Error: ${e.message}`);
        return [];
      });

    if (searchResponse.length === 0)
      return `No information was found online for the search query.`;

    this.reportSearchResultsCitations(searchResponse);
    const result = JSON.stringify(searchResponse);
    this.super.introspect(
      `${this.caller}: I found ${searchResponse.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`,
    );
    return result;
  },

  _baiduSearch: async function (query) {
    if (!process.env.AGENT_BAIDU_SEARCH_API_KEY) {
      this.super.introspect(
        `${this.caller}: I can't use Baidu Search because the user has not defined the required API key.\nVisit: https://cloud.baidu.com/doc/qianfan-api/s/Wmbq4z7e5 to create the API key.`,
      );
      return `Search is disabled and no content was found. This functionality is disabled because the user has not set it up yet.`;
    }

    this.super.introspect(
      `${this.caller}: Using Baidu Search to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`,
    );

    const { response, error } = await fetch(
      "https://qianfan.baidubce.com/v2/ai_search/web_search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AGENT_BAIDU_SEARCH_API_KEY}`,
          "X-Appbuilder-Authorization": `Bearer ${process.env.AGENT_BAIDU_SEARCH_API_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: query }],
          resource_type_filter: [{ type: "web", top_k: 10 }],
        }),
        signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
      },
    )
      .then(async (res) => {
        if (res.ok) return res.json();

        const body = await res.text().catch(() => "");
        throw new Error(
          `${res.status} - ${res.statusText}. params: ${JSON.stringify({
            auth: this.middleTruncate(process.env.AGENT_BAIDU_SEARCH_API_KEY, 5),
            q: query,
            body: body.slice(0, 300),
          })}`,
        );
      })
      .then((data) => {
        return { response: data, error: null };
      })
      .catch((e) => {
        this.super.handlerProps.log(`Baidu Search Error: ${e.message}`);
        return { response: null, error: e.message };
      });

    if (error)
      return `There was an error searching for content. ${error}`;

    if ((response?.code || response?.message) && !response?.references) {
      return `There was an error searching for content. ${response?.message || response?.code}`;
    }

    const data = normalizeBaiduSearchReferences(response?.references);
    if (data.length === 0)
      return `No information was found online for the search query.`;

    this.reportSearchResultsCitations(data);
    const result = JSON.stringify(data);
    this.super.introspect(
      `${this.caller}: I found ${data.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`,
    );
    return result;
  },

  _serplyEngine: async function (
    query,
    language = "en",
    hl = "us",
    //eslint-disable-next-line
    limit = 100,
    device_type = "desktop",
    proxy_location = "US",
  ) {
    if (!process.env.AGENT_SERPLY_API_KEY) {
      this.super.introspect(
        `${this.caller}: I can't use Serply.io searching because the user has not defined the required API key.\nVisit: https://serply.io to create the API key for free.`,
      );
      return `Search is disabled and no content was found. This functionality is disabled because the user has not set it up yet.`;
    }

    this.super.introspect(
      `${this.caller}: Using Serply to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`,
    );

    const params = new URLSearchParams({
      q: query,
      language: language,
      hl,
      gl: proxy_location.toUpperCase(),
    });
    const url = `https://api.serply.io/v1/search/${params.toString()}`;
    const { response, error } = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": process.env.AGENT_SERPLY_API_KEY,
        "Content-Type": "application/json",
        "User-Agent": "opensin-chat",
        "X-Proxy-Location": proxy_location,
        "X-User-Agent": device_type,
      },
      signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error(
          `${res.status} - ${res.statusText}. params: ${JSON.stringify({ auth: this.middleTruncate(process.env.AGENT_SERPLY_API_KEY, 5), q: query })}`,
        );
      })
      .then((data) => {
        if (data?.message === "Unauthorized")
          throw new Error("Unauthorized. Please double check your AGENT_SERPLY_API_KEY");
        return { response: data, error: null };
      })
      .catch((e) => {
        this.super.handlerProps.log(`Serply Error: ${e.message}`);
        return { response: null, error: e.message };
      });

    if (error)
      return `There was an error searching for content. ${error}`;

    const data = [];
    response.results?.forEach((searchResult) => {
      const { title, link, description } = searchResult;
      data.push({ title, link, snippet: description });
    });

    if (data.length === 0)
      return `No information was found online for the search query.`;

    this.reportSearchResultsCitations(data);
    const result = JSON.stringify(data);
    this.super.introspect(
      `${this.caller}: I found ${data.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`,
    );
    return result;
  },

  _searXNGEngine: async function (query) {
    let searchURL;
    if (!process.env.AGENT_SEARXNG_API_URL) {
      this.super.introspect(
        `${this.caller}: I can't use SearXNG searching because the user has not defined the required base URL.\nPlease set this value in the agent skill settings.`,
      );
      return `Search is disabled and no content was found. This functionality is disabled because the user has not set it up yet.`;
    }

    try {
      searchURL = new URL(process.env.AGENT_SEARXNG_API_URL);
      searchURL.searchParams.append("q", query);
      searchURL.searchParams.append("format", "json");
    } catch (e) {
      this.super.handlerProps.log(`SearXNG Search: ${e.message}`);
      this.super.introspect(
        `${this.caller}: I can't use SearXNG searching because the url provided is not a valid URL.`,
      );
      return `Search is disabled and no content was found. This functionality is disabled because the user has not set it up yet.`;
    }

    this.super.introspect(
      `${this.caller}: Using SearXNG to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`,
    );

    const { response, error } = await fetch(searchURL.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "opensin-chat",
      },
      signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error(
          `${res.status} - ${res.statusText}. params: ${JSON.stringify({ url: searchURL.toString() })}`,
        );
      })
      .then((data) => {
        return { response: data, error: null };
      })
      .catch((e) => {
        this.super.handlerProps.log(`SearXNG Search Error: ${e.message}`);
        return { response: null, error: e.message };
      });
    if (error)
      return `There was an error searching for content. ${error}`;

    const data = [];
    response.results?.forEach((searchResult) => {
      const { url, title, content, publishedDate } = searchResult;
      data.push({ title, link: url, snippet: content, publishedDate });
    });

    if (data.length === 0)
      return `No information was found online for the search query.`;

    this.reportSearchResultsCitations(data);
    const result = JSON.stringify(data);
    this.super.introspect(
      `${this.caller}: I found ${data.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`,
    );
    return result;
  },

  _duckDuckGoEngine: async function (query) {
    this.super.introspect(
      `${this.caller}: Using DuckDuckGo to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`,
    );

    const searchURL = new URL("https://html.duckduckgo.com/html");
    searchURL.searchParams.append("q", query);

    const response = await fetch(searchURL.toString(), {
      signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
    })
      .then((res) => {
        if (res.ok) return res.text();
        throw new Error(
          `${res.status} - ${res.statusText}. params: ${JSON.stringify({ url: searchURL.toString() })}`,
        );
      })
      .catch((e) => {
        this.super.handlerProps.log(`DuckDuckGo Search Error: ${e.message}`);
        return null;
      });

    if (!response) return `There was an error searching DuckDuckGo.`;
    const html = response;
    const data = [];
    const results = html.split('<div class="result results_links');

    for (let i = 1; i < results.length; i++) {
      const result = results[i];

      const titleMatch = result.match(
        /<a[^>]*class="result__a"[^>]*>(.*?)<\/a>/,
      );
      const title = titleMatch ? titleMatch[1].trim() : "";

      const urlMatch = result.match(
        /<a[^>]*class="result__a"[^>]*href="([^"]*)">/,
      );
      const link = extractUrl(urlMatch ? urlMatch[1] : "");

      const snippetMatch = result.match(
        /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/,
      );
      const snippet = snippetMatch
        ? snippetMatch[1].replace(/<\/?b>/g, "").trim()
        : "";

      if (title && link && snippet) {
        data.push({ title, link, snippet });
      }
    }

    if (data.length === 0) {
      return `No information was found online for the search query.`;
    }

    this.reportSearchResultsCitations(data);
    const result = JSON.stringify(data);
    this.super.introspect(
      `${this.caller}: I found ${data.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`,
    );
    return result;
  },

  _vaneEngine: async function (query) {
    const { VaneClient } = require("../../../../research/vaneClient");

    if (!(await VaneClient.isAvailable())) {
      this.super.introspect(
        `${this.caller}: I can't use Vane searching because the Vane sidecar is not reachable at ${process.env.VANE_API_URL || "http://vane:3000"}. Check that the container is running.`,
      );
      return `Search is disabled and no content was found. The Vane sidecar is not reachable.`;
    }

    this.super.introspect(
      `${this.caller}: Using Vane to search for "${query.length > 100 ? `${query.slice(0, 100)}...` : query}"`,
    );

    const data = await VaneClient.search(query);
    if (!data || data.length === 0)
      return `No information was found online for the search query.`;

    this.reportSearchResultsCitations(data);
    const result = JSON.stringify(data);
    this.super.introspect(
      `${this.caller}: I found ${data.length} results - reviewing the results now. (~${this.countTokens(result)} tokens)`,
    );
    return result;
  },
};

/**
 * Extract the actual destination URL from a DuckDuckGo redirect link.
 * DDG links look like: //duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com&rut=...
 * @param {string} ddgLink - The DuckDuckGo redirect link
 * @returns {string} The actual destination URL
 */
function extractUrl(ddgLink) {
  if (!ddgLink) return ddgLink;
  try {
    const fullUrl = ddgLink.startsWith("//") ? `https:${ddgLink}` : ddgLink;
    const url = new URL(fullUrl);
    const actualUrl = url.searchParams.get("uddg");
    return actualUrl ? decodeURIComponent(actualUrl) : ddgLink;
  } catch {
    return ddgLink;
  }
}

/**
 * Normalize Baidu Search References to the expected search results format
 * @param {Array} references - The references to normalize
 * @returns {Array} The normalized references
 */
function normalizeBaiduSearchReferences(references = []) {
  if (!Array.isArray(references)) return [];

  const seenLinks = new Set();
  return references
    .filter((reference) => {
      if (!reference) return false;
      const referenceType = String(
        reference.type || reference.resource_type || "web",
      ).toLowerCase();
      return referenceType === "web";
    })
    .map((reference) => {
      const title = String(
        reference.title || reference.web_anchor || "",
      ).trim();
      const link = String(reference.url || "").trim();
      const snippet = String(
        reference.snippet || reference.content || "",
      ).trim();

      if (!title || !link || seenLinks.has(link)) return null;
      seenLinks.add(link);

      return { title, link, snippet };
    })
    .filter(Boolean);
}

module.exports = { scrapingEngines };
