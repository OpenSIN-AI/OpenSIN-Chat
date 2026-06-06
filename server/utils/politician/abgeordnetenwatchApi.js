// SPDX-License-Identifier: MIT
/**
 * Abgeordnetenwatch API client — fetches voting records, mandates, and politician
 * profiles from the official Abgeordnetenwatch.de API.
 *
 * Docs: abgeordnetenwatchApi.doc.md
 * Purpose: Client for the Abgeordnetenwatch.de API with caching, retry, and rate-limiting.
 * API Docs: https://www.abgeordnetenwatch.de/api
 */

const ABGEORDNETENWATCH_BASE = "https://www.abgeordnetenwatch.de/api/v2";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * @typedef {Object} AwVote
 * @property {number} id
 * @property {string} label
 * @property {string} apiUrl
 * @property {string} decision
 * @property {string} date
 * @property {string} fieldTitle
 */

/**
 * @typedef {Object} AwMandate
 * @property {number} id
 * @property {string} constituencyName
 * @property {string} fraction
 * @property {string} type
 * @property {string} startDate
 * @property {string} endDate
 */

/**
 * @typedef {Object} AwPolitician
 * @property {number} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} sex
 * @property {string} birthDate
 * @property {string} party
 * @property {string} constituencyName
 * @property {AwVote[]} votes
 * @property {AwMandate[]} mandates
 */

class AbgeordnetenwatchApi {
  constructor() {
    this.baseUrl = ABGEORDNETENWATCH_BASE;
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
    this.rateLimitDelayMs = 500;
    this.lastRequestTime = 0;
    this.cache = new Map();
  }

  log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[35m[AbgeordnetenwatchApi]\x1b[0m ${text}`, ...args);
  }

  /**
   * Rate-limited fetch with retry logic.
   * @param {string} url
   * @returns {Promise<Response>}
   */
  async #fetch(url) {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.rateLimitDelayMs)
      await new Promise((r) => setTimeout(r, this.rateLimitDelayMs - elapsed));

    this.lastRequestTime = Date.now();
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fetch(url, {
          headers: { Accept: "application/json" },
        });
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries)
          await new Promise((r) =>
            setTimeout(r, this.retryDelayMs * attempt),
          );
      }
    }
    throw lastError;
  }

  /**
   * Fetch with in-memory cache.
   * @param {string} url
   * @returns {Promise<any>}
   */
  async #fetchCached(url) {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

    const res = await this.#fetch(url);
    if (!res.ok) {
      this.log(`HTTP ${res.status} for ${url}`);
      return null;
    }
    const data = await res.json();
    this.cache.set(url, { data, ts: Date.now() });
    return data;
  }

  /**
   * Fetch paginated results from the API.
   * @param {string} url
   * @param {string} resultsKey - key in response for result array
   * @returns {Promise<any[]>}
   */
  async #fetchAllPages(url, resultsKey = "data") {
    let allResults = [];
    let pageUrl = url;

    while (pageUrl) {
      const data = await this.#fetchCached(pageUrl);
      if (!data) break;
      const items = data[resultsKey] || [];
      allResults = allResults.concat(items);
      // The API uses meta.pagination or next links
      pageUrl = data.meta?.next || null;
    }
    return allResults;
  }

  /**
   * Fetch all parliamentarians from Abgeordnetenwatch.
   * @returns {Promise<AwPolitician[]>}
   */
  async fetchAllPoliticians() {
    this.log("Fetching all politicians from Abgeordnetenwatch...");
    return this.#fetchAllPages(
      `${this.baseUrl}/parliament-period/?&parliament=111`, // Bundestag 20. WP
      "data",
    );
  }

  /**
   * Search politicians by name.
   * @param {string} query
   * @returns {Promise<AwPolitician[]>}
   */
  async searchPoliticians(query) {
    const results = await this.#fetchAllPages(
      `${this.baseUrl}/politicians/?search=${encodeURIComponent(query)}&parliament=111`,
      "data",
    );
    return results;
  }

  /**
   * Fetch a single politician by Abgeordnetenwatch ID.
   * @param {number} id
   * @returns {Promise<AwPolitician|null>}
   */
  async getPolitician(id) {
    return this.#fetchCached(`${this.baseUrl}/politicians/${id}/`);
  }

  /**
   * Fetch voting record for a politician.
   * @param {number} politicianId - Abgeordnetenwatch politician ID
   * @returns {Promise<AwVote[]>}
   */
  async getVotingRecord(politicianId) {
    this.log(`Fetching votes for politician ${politicianId}...`);
    return this.#fetchAllPages(
      `${this.baseUrl}/politicians/${politicianId}/votes/?parliament=111`,
      "data",
    );
  }

  /**
   * Fetch committees for a politician.
   * @param {number} politicianId
   * @returns {Promise<any[]>}
   */
  async getCommittees(politicianId) {
    this.log(`Fetching committees for politician ${politicianId}...`);
    return this.#fetchAllPages(
      `${this.baseUrl}/politicians/${politicianId}/committees/`,
      "data",
    );
  }

  /**
   * Fetch all mandates for a politician.
   * @param {number} politicianId
   * @returns {Promise<AwMandate[]>}
   */
  async getMandates(politicianId) {
    this.log(`Fetching mandates for politician ${politicianId}...`);
    return this.#fetchAllPages(
      `${this.baseUrl}/politicians/${politicianId}/mandates/`,
      "data",
    );
  }

  /**
   * Fetch all votes from all politicians (paginated).
   * @returns {Promise<any[]>}
   */
  async fetchAllVotes() {
    this.log("Fetching all votes from Abgeordnetenwatch...");
    return this.#fetchAllPages(
      `${this.baseUrl}/votes/?parliament=111&range_end=100`,
      "data",
    );
  }

  /**
   * Fetch a specific vote by ID with full details.
   * @param {number} voteId
   * @returns {Promise<any>}
   */
  async getVoteDetail(voteId) {
    return this.#fetchCached(`${this.baseUrl}/votes/${voteId}/`);
  }

  /** Clear the in-memory cache. */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = { AbgeordnetenwatchApi };
