// SPDX-License-Identifier: MIT
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import logger from "@/utils/logger";

const Politician = {
  /**
   * Add a politician record (profile + speeches) as an embedded document to the
   * current workspace. The server builds a text document, processes it through
   * the collector, and embeds it into the workspace vector store.
   * @param {string} politicianId
   * @param {string} workspaceSlug
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  /** @param {string} politicianId
   * @param {string} workspaceSlug
   * @returns {Promise<{success: boolean, data?: object, error?: string}>} */
  addToWorkspace: async function (politicianId, workspaceSlug) {
    try {
      const res = await fetch(
        `${API_BASE}/politician/${politicianId}/add-to-workspace`,
        {
          method: "POST",
          headers: { ...baseHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceSlug }),
        },
      );
      const data = await res.json().catch((e) => {
        logger.error("politician API json parse failed:", e);
        return {};
      });
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || `HTTP ${res.status}`,
        };
      }
      return { success: true, data };
    } catch (e) {
      return { success: false, error: /** @type {Error} */ (e).message };
    }
  },

  /**
   * Get a single politician's full profile (mandates, committees, stats).
   * @param {string} politicianId
   * @returns {Promise<object|null>}
   */
  /** @param {string} politicianId
   * @returns {Promise<object|null>} */
  getById: async function (politicianId) {
    try {
      const res = await fetch(`${API_BASE}/politician/${politicianId}`, {
        headers: baseHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /**
   * Get a politician's voting record.
   * @param {string} politicianId
   * @param {object} [opts] — { limit, offset }
   * @returns {Promise<object|null>}
   */
  /** @param {string} politicianId
   * @param {{limit?: number, offset?: number}} [opts={}]
   * @returns {Promise<object|null>} */
  getVotes: async function (politicianId, opts = {}) {
    try {
      const params = new URLSearchParams();
      if (opts.limit) params.set("limit", String(opts.limit));
      if (opts.offset) params.set("offset", String(opts.offset));
      const qs = params.toString();
      const res = await fetch(
        `${API_BASE}/politician/${politicianId}/votes${qs ? `?${qs}` : ""}`,
        { headers: baseHeaders() },
      );
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /**
   * Get a politician's speeches.
   * @param {string} politicianId
   * @param {object} [opts] — { limit, offset }
   * @returns {Promise<object|null>}
   */
  /** @param {string} politicianId
   * @param {{limit?: number, offset?: number}} [opts={}]
   * @returns {Promise<object|null>} */
  getSpeeches: async function (politicianId, opts = {}) {
    try {
      const params = new URLSearchParams();
      if (opts.limit) params.set("limit", String(opts.limit));
      if (opts.offset) params.set("offset", String(opts.offset));
      const qs = params.toString();
      const res = await fetch(
        `${API_BASE}/politician/${politicianId}/speeches${qs ? `?${qs}` : ""}`,
        { headers: baseHeaders() },
      );
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /**
   * Semantic search over politician speeches (vector search via PGVector).
   * @param {string} query — search text (e.g. "Klimapolitik")
   * @param {object} [opts] — { party, source, limit }
   * @returns {Promise<{results: object[], error?: string}>}
   */
  /** @param {string} query
   * @param {{party?: string, source?: string, limit?: number}} [opts={}]
   * @returns {Promise<{results: Array, error?: string}>} */
  searchSpeeches: async function (query, opts = {}) {
    try {
      const params = new URLSearchParams({ q: query });
      if (opts.party) params.set("party", opts.party);
      if (opts.source) params.set("source", opts.source);
      if (opts.limit) params.set("topN", String(opts.limit));
      const res = await fetch(
        `${API_BASE}/politician/speech-search?${params}`,
        { headers: baseHeaders() },
      );
      const data = await res.json().catch((e) => {
        logger.error("politician API json parse failed:", e);
        return {};
      });
      if (!res.ok)
        return { results: [], error: data.error || `HTTP ${res.status}` };
      return {
        results: data.results || data.speeches || [],
        error: data.error,
      };
    } catch (e) {
      return { results: [], error: /** @type {Error} */ (e).message };
    }
  },

  /** @param {string} query
   * @param {{faction?: string, limit?: number}} [opts={}]
   * @returns {Promise<{results: Array, error: string|null}>} */
  searchDrucksachen: async function (query, opts = {}) {
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (opts.faction) params.set("f_fraktion", opts.faction);
      params.set("rows", String(opts.limit || 10));
      params.set("format", "json");
      const res = await fetch(
        `${API_BASE}/utils/bundestag/drucksachen?${params}`,
        { headers: baseHeaders() },
      );
      const data = await res.json().catch((e) => {
        logger.error("politician API json parse failed:", e);
        return {};
      });
      if (data.error) return { results: [], error: data.error };
      return {
        results: data.documents || [],
        error: null,
      };
    } catch (e) {
      return { results: [], error: /** @type {Error} */ (e).message };
    }
  },

  /** @param {string} politicianId
   * @returns {Promise<object|null>} */
  getProfile: async function (politicianId) {
    try {
      const res = await fetch(`${API_BASE}/politician/${politicianId}`, {
        headers: baseHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
};

export default Politician;
