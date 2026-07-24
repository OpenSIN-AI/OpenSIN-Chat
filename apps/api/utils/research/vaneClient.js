// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

/**
 * Vane API Client — bridge to a self-hosted Vane (AI answering engine) sidecar.
 *
 * Docs: vaneClient.doc.md
 * Purpose: Provides (a) raw web search results and (b) full cited answers
 * for the OpenSIN Deep-Research-Pipeline without merging Vane's codebase.
 * Resilience: fetchWithTimeout on all HTTP calls.
 *
 * Vane: https://github.com/ItzCrazyKns/Vane
 */

const { fetchWithTimeout } = require("../helpers/fetchWithTimeout");

const VANE_API_URL = process.env.VANE_API_URL || "http://vane:8300";
const PROVIDER_CACHE_TTL_MS = 5 * 60_000;

class VaneClient {
  static #providerCache = { data: null, fetchedAt: 0 };

  static log(text, ...args) {
    consoleLogger.log(`\x1b[36m[VaneClient]\x1b[0m ${text}`, ...args);
  }

  /** Check if the Vane sidecar is reachable. */
  static async isAvailable() {
    try {
      const res = await fetchWithTimeout(
        `${VANE_API_URL}/api/providers`,
        {},
        3_000,
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Discover available providers/models from Vane (cached 5 min).
   * Honors env overrides VANE_CHAT_PROVIDER_ID / VANE_CHAT_MODEL_KEY /
   * VANE_EMBED_PROVIDER_ID / VANE_EMBED_MODEL_KEY.
   * @returns {Promise<{chatModel: Object, embeddingModel: Object}|null>}
   */
  static async resolveModels() {
    // Env overrides take precedence (explicit configuration) and bypass discovery.
    if (process.env.VANE_CHAT_PROVIDER_ID && process.env.VANE_CHAT_MODEL_KEY) {
      return {
        chatModel: {
          providerId: process.env.VANE_CHAT_PROVIDER_ID,
          key: process.env.VANE_CHAT_MODEL_KEY,
        },
        embeddingModel: {
          providerId:
            process.env.VANE_EMBED_PROVIDER_ID ||
            process.env.VANE_CHAT_PROVIDER_ID,
          key: process.env.VANE_EMBED_MODEL_KEY || "",
        },
      };
    }

    const now = Date.now();
    if (
      !VaneClient.#providerCache.data ||
      now - VaneClient.#providerCache.fetchedAt > PROVIDER_CACHE_TTL_MS
    ) {
      try {
        const res = await fetchWithTimeout(
          `${VANE_API_URL}/api/providers`,
          {},
          5_000,
        );
        if (!res.ok) return null;
        const data = await res.json();
        VaneClient.#providerCache = { data, fetchedAt: now };
      } catch (err) {
        VaneClient.log(`Provider discovery failed: ${err.message}`);
        return null;
      }
    }

    const providers = VaneClient.#providerCache.data?.providers || [];

    // Auto-discovery: first provider with chat models and first with embedding models
    const chatProvider = providers.find((p) => p.chatModels?.length);
    const embedProvider = providers.find((p) => p.embeddingModels?.length);
    if (!chatProvider || !embedProvider) {
      VaneClient.log(
        "No usable provider in Vane. Finish setup at http://localhost:3100.",
      );
      return null;
    }

    return {
      chatModel: {
        providerId: chatProvider.id,
        key: chatProvider.chatModels[0].key,
      },
      embeddingModel: {
        providerId: embedProvider.id,
        key: embedProvider.embeddingModels[0].key,
      },
    };
  }

  /**
   * Full answer-engine query: returns a cited answer + sources.
   * @param {string} query
   * @param {Object} [opts]
   * @param {string[]} [opts.sources=["web"]] - "web" | "academic" | "discussions"
   * @param {string} [opts.optimizationMode="balanced"]
   * @param {string} [opts.systemInstructions]
   * @returns {Promise<{message: string, sources: Array}|null>}
   */
  static async answer(query, opts = {}) {
    const models = await VaneClient.resolveModels();
    if (!models) return null;

    try {
      const res = await fetchWithTimeout(
        `${VANE_API_URL}/api/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatModel: models.chatModel,
            embeddingModel: models.embeddingModel,
            optimizationMode: opts.optimizationMode || "balanced",
            sources: opts.sources || ["web"],
            query,
            systemInstructions:
              opts.systemInstructions ||
              "Antworte auf Deutsch. Zitiere alle Quellen mit [n]-Verweisen.",
            stream: false,
          }),
        },
        120_000,
      );
      if (!res.ok) {
        VaneClient.log(`Search failed: HTTP ${res.status}`);
        return null;
      }
      const data = await res.json();
      return {
        message: data.message || "",
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
    } catch (err) {
      VaneClient.log(`Answer error: ${err.message}`);
      return null;
    }
  }

  /**
   * Lightweight search: returns results in WebSearchEngine's
   * {title, link, snippet} shape so it is a drop-in source provider.
   * @param {string} query
   * @returns {Promise<Array<{title: string, link: string, snippet: string}>>}
   */
  static async search(query) {
    const result = await VaneClient.answer(query, {
      optimizationMode: "speed",
      sources: ["web"],
    });
    if (!result) return [];
    return result.sources
      .filter((s) => s.metadata?.url)
      .map((s) => ({
        title: s.metadata.title || s.metadata.url,
        link: s.metadata.url,
        snippet: (s.content || "").substring(0, 300),
      }))
      .slice(0, 10);
  }
}

module.exports = { VaneClient, VANE_API_URL };
