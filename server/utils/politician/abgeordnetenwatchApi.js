// SPDX-License-Identifier: MIT
/**
 * Abgeordnetenwatch API client — fetches voting records, mandates, and politician
 * profiles from the official Abgeordnetenwatch.de API.
 *
 * Docs: abgeordnetenwatchApi.doc.md
 * Purpose: Client for the Abgeordnetenwatch.de API with caching, retry, and rate-limiting.
 * API Docs: https://www.abgeordnetenwatch.de/api/v2
 *
 * 21. Wahlperiode migration (#84):
 *   - The legacy `/parliament-period/` filter for the 20. WP (parliament ID 111) is dead.
 *   - The current source of truth is the `candidacies-mandates` collection
 *     filtered by `parliament_period` (132 = Bundestag 2021–2025, 733 Mandate).
 *   - Pagination is range-based via `meta.result` (range_start / range_end /
 *     total), NOT a `meta.next` link.
 *   - Verified new politician fields: `first_name`, `last_name`,
 *     `year_of_birth` (replaces `birthDate`), `ext_id_bundestagsverwaltung`.
 */

const ABGEORDNETENWATCH_BASE = "https://www.abgeordnetenwatch.de/api/v2";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Default parliament_period for the current Bundestag (21. WP, 2021–2025).
 * Overridable via the AW_PARLIAMENT_PERIOD env var.
 * @type {number}
 */
const DEFAULT_PARLIAMENT_PERIOD = parseInt(
  process.env.AW_PARLIAMENT_PERIOD || "132",
  10,
);

/** API page size for range-based pagination (max 100 per AW API). */
const PAGE_SIZE = 100;

/**
 * @typedef {Object} AwPolitician
 * @property {number} id - Abgeordnetenwatch politician id
 * @property {string} externalId - prefixed id (`aw-<id>`)
 * @property {string} source - always "abgeordnetenwatch"
 * @property {string} firstName - legacy camelCase alias of first_name
 * @property {string} lastName - legacy camelCase alias of last_name
 * @property {string} fullName
 * @property {string} first_name - verified new field (21. WP)
 * @property {string} last_name - verified new field (21. WP)
 * @property {number|null} year_of_birth - verified new field (replaces birthDate)
 * @property {string|null} ext_id_bundestagsverwaltung - verified new field (mdbID)
 * @property {string|null} party
 * @property {string|null} faction
 * @property {string|null} gender - normalized: male | female | diverse
 * @property {string|null} birthDate - derived from year_of_birth (ISO) for DB compat
 * @property {string|null} constituency
 * @property {string|null} mandateStart
 * @property {string|null} mandateEnd
 * @property {string} rawData - JSON blob of the raw API record(s)
 */

class AbgeordnetenwatchApi {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.parliamentPeriod] - override parliament_period
   */
  constructor(opts = {}) {
    this.baseUrl = ABGEORDNETENWATCH_BASE;
    this.parliamentPeriod = opts.parliamentPeriod || DEFAULT_PARLIAMENT_PERIOD;
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
   * Append a query parameter to a URL, choosing `?` or `&` automatically.
   * @param {string} url
   * @param {string} param - already-encoded `key=value`
   * @returns {string}
   */
  #withParam(url, param) {
    return `${url}${url.includes("?") ? "&" : "?"}${param}`;
  }

  /**
   * Fetch range-paginated results from the AW API.
   *
   * The AW v2 API paginates via `meta.result` ({range_start, range_end, total,
   * count}). We page through with `range_start` / `range_end` until the
   * cumulative count reaches `total` (or a page comes back empty).
   *
   * @param {string} url - base collection URL (with any filters already applied)
   * @param {number} [pageSize=PAGE_SIZE]
   * @returns {Promise<any[]>}
   */
  async #fetchAllRanged(url, pageSize = PAGE_SIZE) {
    let all = [];
    let rangeStart = 0;
    let total = Infinity;
    let safety = 0;

    while (rangeStart < total) {
      // Guard against a misbehaving API to avoid an infinite loop.
      if (safety++ > 1000) break;

      const pageUrl = this.#withParam(
        this.#withParam(url, `range_start=${rangeStart}`),
        `range_end=${pageSize}`,
      );
      const data = await this.#fetchCached(pageUrl);
      if (!data) break;

      const items = Array.isArray(data.data) ? data.data : [];
      all = all.concat(items);

      const result = data.meta?.result || {};
      total = Number.isFinite(result.total) ? result.total : all.length;
      const advanced = items.length || pageSize;
      rangeStart += advanced;

      // Defensive: stop if the API returned fewer items than requested and we
      // have no reliable total to rely on.
      if (items.length === 0) break;
    }

    return all;
  }

  /**
   * Split a "Vorname Nachname" label into first/last name parts. The last
   * whitespace-separated token is treated as the surname; everything before it
   * is the given name(s). Falls back gracefully for single-token labels.
   * @param {string} label
   * @returns {{firstName: string, lastName: string}}
   */
  #parseName(label) {
    const clean = (label || "").trim().replace(/\s+/g, " ");
    if (!clean) return { firstName: "", lastName: "" };
    const parts = clean.split(" ");
    if (parts.length === 1) return { firstName: "", lastName: parts[0] };
    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1],
    };
  }

  /**
   * Normalize AW sex codes ("m"/"f"/"d") to the internal gender vocabulary.
   * @param {string|null} sex
   * @returns {string|null}
   */
  #normalizeGender(sex) {
    if (!sex) return null;
    const s = String(sex).toLowerCase();
    if (s === "m" || s === "male") return "male";
    if (s === "f" || s === "female") return "female";
    if (s === "d" || s === "diverse") return "diverse";
    return null;
  }

  /**
   * Convert a year_of_birth into an ISO date string (`YYYY-01-01`) so it can be
   * persisted in the existing `birthDate` DateTime column without a migration.
   * @param {number|null} year
   * @returns {string|null}
   */
  #yearToBirthDate(year) {
    if (!year || !Number.isFinite(Number(year))) return null;
    return `${year}-01-01`;
  }

  /**
   * Normalize a raw `candidacy_mandate` record into the internal politician
   * shape. The mandate carries the politician reference, faction membership and
   * the official Bundestagsverwaltung id (`id_external_administration`).
   * @param {Object} mandate
   * @returns {AwPolitician}
   */
  #normalizeMandate(mandate) {
    const pol = mandate.politician || {};
    const { firstName, lastName } = this.#parseName(pol.label);

    // Most recent fraction membership (faction) — used as the party fallback.
    const memberships = Array.isArray(mandate.fraction_membership)
      ? mandate.fraction_membership
      : [];
    const lastMembership = memberships[memberships.length - 1] || {};
    const factionLabel = (lastMembership.fraction?.label || "")
      .replace(/\s*\(Bundestag.*?\)\s*/i, "")
      .trim() || null;

    const electoral = mandate.electoral_data || {};
    const id = pol.id ?? null;

    return {
      id,
      externalId: id != null ? `aw-${id}` : null,
      source: "abgeordnetenwatch",
      // verified new fields (21. WP)
      first_name: firstName,
      last_name: lastName,
      year_of_birth: null, // populated via enrichment (politician entity)
      ext_id_bundestagsverwaltung: mandate.id_external_administration || null,
      // legacy camelCase aliases kept for backward compatibility
      firstName,
      lastName,
      fullName: (pol.label || `${firstName} ${lastName}`).trim(),
      party: factionLabel,
      faction: factionLabel,
      gender: null, // populated via enrichment
      birthDate: null, // derived from year_of_birth during enrichment
      constituency: electoral.constituency?.label || null,
      mandateStart: mandate.start_date || null,
      mandateEnd: mandate.end_date || null,
      politicianApiUrl: pol.api_url || null,
      rawData: JSON.stringify(mandate),
    };
  }

  /**
   * Fetch all mandates for the configured parliament_period and reduce them to
   * one record per politician (a politician may hold/replace multiple mandates).
   *
   * For 21. WP (parliament_period=132) this yields ~733 mandates → the unique
   * Bundestag members of the current electoral term.
   *
   * @param {Object} [opts]
   * @param {boolean} [opts.enrich=false] - when true, fetch each politician
   *   entity to populate `year_of_birth`, `gender`, `party` and
   *   `ext_id_bundestagsverwaltung` (slower: one extra request per politician).
   * @returns {Promise<AwPolitician[]>}
   */
  async fetchAllPoliticians(opts = {}) {
    const { enrich = false } = opts;
    this.log(
      `Fetching mandates for parliament_period=${this.parliamentPeriod}...`,
    );

    const mandates = await this.#fetchAllRanged(
      `${this.baseUrl}/candidacies-mandates?parliament_period=${this.parliamentPeriod}`,
    );

    // De-duplicate by politician id, preferring the most recent mandate.
    const byPolitician = new Map();
    for (const mandate of mandates) {
      const normalized = this.#normalizeMandate(mandate);
      if (normalized.id == null) continue;
      const existing = byPolitician.get(normalized.id);
      if (!existing || (normalized.mandateStart || "") > (existing.mandateStart || ""))
        byPolitician.set(normalized.id, normalized);
    }

    const politicians = [...byPolitician.values()];
    this.log(
      `Resolved ${politicians.length} unique politicians from ${mandates.length} mandates`,
    );

    if (!enrich) return politicians;

    // Enrich with politician-entity details (first_name, last_name,
    // year_of_birth, sex, party, ext_id_bundestagsverwaltung).
    for (const p of politicians) {
      const details = await this.fetchPoliticianDetails(p.id);
      if (details) Object.assign(p, details);
    }
    return politicians;
  }

  /**
   * Fetch and normalize a single politician entity, exposing the verified new
   * 21. WP fields. Merged onto mandate records during enrichment.
   * @param {number} id - Abgeordnetenwatch politician id
   * @returns {Promise<Partial<AwPolitician>|null>}
   */
  async fetchPoliticianDetails(id) {
    const data = await this.#fetchCached(`${this.baseUrl}/politicians/${id}`);
    const pol = data?.data;
    if (!pol) return null;

    const firstName = pol.first_name || "";
    const lastName = pol.last_name || "";
    const party = pol.party?.label || pol.party?.name || null;
    return {
      first_name: firstName,
      last_name: lastName,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim() || pol.label || "",
      year_of_birth: pol.year_of_birth ?? null,
      birthDate: this.#yearToBirthDate(pol.year_of_birth),
      gender: this.#normalizeGender(pol.sex),
      party,
      ext_id_bundestagsverwaltung: pol.ext_id_bundestagsverwaltung || null,
    };
  }

  /**
   * Search politicians by name.
   * @param {string} query
   * @returns {Promise<AwPolitician[]>}
   */
  async searchPoliticians(query) {
    const data = await this.#fetchCached(
      `${this.baseUrl}/politicians/?search=${encodeURIComponent(query)}`,
    );
    return Array.isArray(data?.data) ? data.data : [];
  }

  /**
   * Fetch a single politician by Abgeordnetenwatch ID.
   * @param {number} id
   * @returns {Promise<any|null>}
   */
  async getPolitician(id) {
    return this.#fetchCached(`${this.baseUrl}/politicians/${id}/`);
  }

  /**
   * Fetch voting record for a politician in the configured parliament period.
   * @param {number} politicianId - Abgeordnetenwatch politician ID
   * @returns {Promise<any[]>}
   */
  async getVotingRecord(politicianId) {
    this.log(`Fetching votes for politician ${politicianId}...`);
    return this.#fetchAllRanged(
      `${this.baseUrl}/votes?politician=${politicianId}`,
    );
  }

  /**
   * Fetch committees for a politician.
   * @param {number} politicianId
   * @returns {Promise<any[]>}
   */
  async getCommittees(politicianId) {
    this.log(`Fetching committees for politician ${politicianId}...`);
    return this.#fetchAllRanged(
      `${this.baseUrl}/committee-memberships?politician=${politicianId}`,
    );
  }

  /**
   * Fetch all mandates for a politician.
   * @param {number} politicianId
   * @returns {Promise<any[]>}
   */
  async getMandates(politicianId) {
    this.log(`Fetching mandates for politician ${politicianId}...`);
    return this.#fetchAllRanged(
      `${this.baseUrl}/candidacies-mandates?politician=${politicianId}`,
    );
  }

  /**
   * Fetch votes for the configured parliament period (paginated).
   * @returns {Promise<any[]>}
   */
  async fetchAllVotes() {
    this.log("Fetching all votes from Abgeordnetenwatch...");
    return this.#fetchAllRanged(
      `${this.baseUrl}/votes?parliament_period=${this.parliamentPeriod}`,
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
