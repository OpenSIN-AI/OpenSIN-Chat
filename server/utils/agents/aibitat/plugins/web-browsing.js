// SPDX-License-Identifier: MIT
// Web-browsing plugin for AIbitat agents.
// Split from the original monolithic web-browsing.js as part of issue #528 — God-File reduction.
// Search engine implementations live in ./web-browsing/engines/api-engines.js and scraping-engines.js.

const { SystemSettings } = require("../../../../models/systemSettings");
const { TokenManager } = require("../../../helpers/tiktoken");
const tiktoken = new TokenManager();

const { apiEngines } = require("./web-browsing/engines/api-engines.js");
const { scrapingEngines } = require("./web-browsing/engines/scraping-engines.js");

const webBrowsing = {
  name: "web-browsing",
  startupConfig: {
    params: {},
  },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: this.name,
          countTokens: (string) =>
            tiktoken
              .countFromString(string)
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ","),
          description:
            "Search the internet for real-time information. Look online for current news, recent updates, latest changes, or any information not available locally. Browse the web to find answers about current events, prices, weather, or live data.",
          examples: [
            {
              prompt: "Look online for recent changes to OpenSIN Chat",
              call: JSON.stringify({
                query: "OpenSIN Chat recent changes updates",
              }),
            },
            {
              prompt: "Search the internet for the latest news",
              call: JSON.stringify({ query: "latest news today" }),
            },
            {
              prompt: "What's the current weather in NYC?",
              call: JSON.stringify({ query: "current weather New York City" }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "A search query.",
              },
            },
            additionalProperties: false,
          },
          handler: async function ({ query }) {
            try {
              if (query) return await this.search(query);
              return "There is nothing we can do. This function call returns no information.";
            } catch (error) {
              return `There was an error while calling the function. No data or response was found. Let the user know this was the error: ${error.message}`;
            }
          },

          /**
           * Use Google Custom Search Engines
           * Free to set up, easy to use, 100 calls/day!
           * https://programmablesearchengine.google.com/controlpanel/create
           */
          search: async function (query) {
            const provider =
              (await SystemSettings.get({ label: "agent_search_provider" }))
                ?.value ?? "unknown";
            let engine;
            switch (provider) {
              case "serpapi":
                engine = "_serpApi";
                break;
              case "searchapi":
                engine = "_searchApi";
                break;
              case "serper-dot-dev":
                engine = "_serperDotDev";
                break;
              case "bing-search":
                engine = "_bingWebSearch";
                break;
              case "baidu-search":
                engine = "_baiduSearch";
                break;
              case "serply-engine":
                engine = "_serplyEngine";
                break;
              case "searxng-engine":
                engine = "_searXNGEngine";
                break;
              case "tavily-search":
                engine = "_tavilySearch";
                break;
              case "duckduckgo-engine":
                engine = "_duckDuckGoEngine";
                break;
              case "vane":
                engine = "_vaneEngine";
                break;
              case "exa-search":
                engine = "_exaSearch";
                break;
              case "perplexity-search":
                engine = "_perplexitySearch";
                break;
              default:
                engine = "_duckDuckGoEngine";
            }
            return await this[engine](query);
          },

          /**
           * Utility function to truncate a string to a given length for debugging
           * calls to the API while keeping the actual values mostly intact
           * @param {string} str - The string to truncate
           * @param {number} length - The length to truncate the string to
           * @returns {string} The truncated string
           */
          middleTruncate(str, length = 5) {
            if (str.length <= length) return str;
            return `${str.slice(0, length)}...${str.slice(-length)}`;
          },

          /**
           * Report citations for an array of search results.
           * Uses title, link, and snippet directly from result data.
           * @param {Array<{title?: string, link?: string, snippet?: string}>} results - Search results to report as citations
           */
          reportSearchResultsCitations: function (results) {
            if (!Array.isArray(results)) return;
            const citations = [];
            for (const result of results) {
              const fallbackUrl =
                result.link ||
                result.url ||
                result.website ||
                result.product_link ||
                result.patent_link ||
                result.link_clean;

              citations.push({
                id: result.link || fallbackUrl,
                title: result.title || fallbackUrl,
                text: result.snippet || result.description || result.text || "",
                chunkSource: result.link
                  ? `link://${result.link}`
                  : `link://${fallbackUrl}`,
                score: null,
              });
            }
            this.super.addCitation?.(citations);
          },

          // Spread all engine implementations from the split modules
          ...apiEngines,
          ...scrapingEngines,
        });
      },
    };
  },
};

module.exports = {
  webBrowsing,
};
