// SPDX-License-Identifier: MIT
/**
 * Bundestag API client — fetches politician data for the current electoral term.
 *
 * Docs: bundestagApi.doc.md
 * Purpose: Client for Bundestag Open Data with caching, retry, and rate-limiting.
 *
 * 21. Wahlperiode migration (#84):
 *   - The legacy 20. WP `.formular` endpoint is dead (HTTP 404), and the
 *     `Abgeordnete21_WP.formular` variant is not published either.
 *   - This client now: (1) attempts the term-specific `.formular` endpoint for
 *     the configured Wahlperiode, (2) falls back to the official DIP API
 *     (`search.dip.bundestag.de`) when a `BUNDESTAG_DIP_API_KEY` is configured,
 *     and (3) degrades gracefully to an empty list.
 *   - When this client yields nothing, the sync job's cross-source fallback
 *     (Abgeordnetenwatch, parliament_period=132) supplies the 21. WP members,
 *     keyed by their official `ext_id_bundestagsverwaltung`.
 */

const BUNDESTAG_BASE_URL = "https://www.bundestag.de";
const BUNDESTAG_API_BASE = `${BUNDESTAG_BASE_URL}/SiteGlobals/Functions/Abgeordnetensuche`;
const DIP_API_BASE = "https://search.dip.bundestag.de/api/v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/** Current Bundestag electoral term (Wahlperiode). Default: 21. WP. */
const DEFAULT_WAHLPERIODE = parseInt(
  process.env.BUNDESTAG_WAHLPERIODE || "21",
  10,
);

/**
 * @typedef {Object} BundestagPolitician
 * @property {string} id
 * @property {string} title
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} fullName
 * @property {string} party
 * @property {string} faction
 * @property {string} gender
 * @property {string} birthDate
 * @property {string} birthPlace
 * @property {string} profession
 * @property {string} education
 * @property {string} photoUrl
 * @property {string} profileUrl
 * @property {string} email
 * @property {string} electoralDistrict
 * @property {string} electoralList
 * @property {string} state
 * @property {string} bio
 * @property {string} websiteUrl
 * @property {Object} socialMedia
 */

class BundestagApi {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.wahlperiode] - override the electoral term
   * @param {string} [opts.dipApiKey] - DIP API key (defaults to env)
   */
  constructor(opts = {}) {
    this.baseUrl = BUNDESTAG_API_BASE;
    this.wahlperiode = opts.wahlperiode || DEFAULT_WAHLPERIODE;
    this.dipApiKey =
      opts.dipApiKey ||
      process.env.BUNDESTAG_DIP_API_KEY ||
      process.env.BUNDESTAG_API_KEY ||
      process.env.DIP_API_KEY ||
      null;
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
    this.rateLimitDelayMs = 500;
    this.fetchTimeoutMs = 30000;
    this.lastRequestTime = 0;
    this.cache = new Map();
  }

  log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[33m[BundestagApi]\x1b[0m ${text}`, ...args);
  }

  /**
   * Rate-limited fetch with retry logic.
   * @param {string} url
   * @param {Object} [headers]
   * @returns {Promise<Response>}
   */
  async #fetch(url, headers = { Accept: "application/json" }) {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.rateLimitDelayMs)
      await new Promise((r) => setTimeout(r, this.rateLimitDelayMs - elapsed));

    this.lastRequestTime = Date.now();
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.fetchTimeoutMs);
        try {
          return await fetch(url, { headers, signal: controller.signal });
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries)
          await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
      }
    }
    throw lastError;
  }

  /**
   * Fetch with in-memory cache.
   * @param {string} url
   * @param {Object} [headers]
   * @returns {Promise<any>}
   */
  async #fetchCached(url, headers) {
    const cached = await this.#cacheGet(url);
    if (cached !== null) return cached;

    const res = await this.#fetch(url, headers);
    if (!res.ok) {
      this.log(`HTTP ${res.status} for ${url}`);
      res.text?.().catch(() => {});
      return null;
    }
    const data = await res.json();
    this.cache.set(url, { data, ts: Date.now() });
    return data;
  }

  /**
   * Read from the in-memory cache with opportunistic eviction of expired
   * entries so stale keys do not accumulate on long-running servers.
   * @param {string} url
   * @returns {Promise<any>} cached payload, or null if missing/expired.
   */
  async #cacheGet(url) {
    const cached = this.cache.get(url);
    if (!cached) return null;
    if (Date.now() - cached.ts > CACHE_TTL_MS) {
      this.cache.delete(url);
      return null;
    }
    return cached.data;
  }

  /**
   * Fetch all Bundestag members for the configured electoral term.
   *
   * Strategy (first non-empty wins):
   *   1. `Abgeordnete{WP}_WP.formular` — official term endpoint.
   *   2. DIP API person collection — when `BUNDESTAG_DIP_API_KEY` is set.
   *   3. `[]` — caller (sync job) falls back to Abgeordnetenwatch.
   *
   * @returns {Promise<BundestagPolitician[]>}
   */
  async fetchAllMembers() {
    const fromFormular = await this.#fetchFromFormular();
    if (fromFormular.length > 0) return fromFormular;

    const fromDip = await this.#fetchFromDip();
    if (fromDip.length > 0) return fromDip;

    this.log(
      `No members from Bundestag endpoints for WP ${this.wahlperiode}; ` +
        "caller should fall back to Abgeordnetenwatch.",
    );
    return [];
  }

  /**
   * Attempt the term-specific `.formular` endpoint.
   * @returns {Promise<BundestagPolitician[]>}
   */
  async #fetchFromFormular() {
    const url = `${this.baseUrl}/Abgeordnete${this.wahlperiode}_WP.formular`;
    this.log(
      `Fetching members from formular endpoint (WP ${this.wahlperiode})...`,
    );
    try {
      const data = await this.#fetchCached(url);
      if (!data || !Array.isArray(data)) return [];
      return data.filter(Boolean).map((raw) => this.#normalizeMember(raw));
    } catch (err) {
      this.log(`Formular endpoint error: ${err.message}`);
      return [];
    }
  }

  /**
   * Attempt the official DIP API (requires BUNDESTAG_DIP_API_KEY).
   * @returns {Promise<BundestagPolitician[]>}
   */
  async #fetchFromDip() {
    if (!this.dipApiKey) {
      this.log("DIP API key not configured — skipping DIP fallback.");
      return [];
    }
    this.log(`Fetching members from DIP API (WP ${this.wahlperiode})...`);
    const members = [];
    let cursor = null;
    let safety = 0;

    try {
      do {
        if (safety++ > 200) break;
        const params = new URLSearchParams({
          "f.wahlperiode": String(this.wahlperiode),
          apikey: this.dipApiKey,
        });
        if (cursor) params.set("cursor", cursor);
        const data = await this.#fetchCached(
          `${DIP_API_BASE}/person?${params.toString()}`,
        );
        if (!data) break;

        const docs = Array.isArray(data.documents) ? data.documents : [];
        for (const doc of docs) members.push(this.#normalizeDipPerson(doc));

        // DIP cursor pagination ends when the cursor stops changing.
        if (!data.cursor || data.cursor === cursor) break;
        cursor = data.cursor;
      } while (cursor);
    } catch (err) {
      this.log(`DIP API error: ${err.message}`);
      return members;
    }
    return members;
  }

  /**
   * Normalize a raw `.formular` API response to the internal format.
   * @param {Object} raw
   * @returns {BundestagPolitician}
   */
  #normalizeMember(raw) {
    const first = raw.vorname || "";
    const last = raw.nachname || "";
    return {
      id: raw.id || null,
      source: "bundestag",
      externalId: raw.id || null,
      title: raw.akadGrad || null,
      firstName: first,
      lastName: last,
      fullName: `${first} ${last}`.trim(),
      party: raw.parteiKurz || null,
      faction: raw.fraktion || null,
      gender: raw.anrede ? this.#parseGender(raw.anrede) : null,
      birthDate: raw.geburtsdatum || null,
      birthPlace: raw.geburtsort || null,
      profession: raw.beruf || null,
      education: raw.vitaKurz || null,
      photoUrl: raw.bild ? `${BUNDESTAG_BASE_URL}${raw.bild}` : null,
      profileUrl:
        raw.profilUrl ||
        (raw.id
          ? `${BUNDESTAG_BASE_URL}/abgeordnete/biografien18/${raw.id}`
          : null),
      email: raw.email || null,
      electoralDistrict: raw.wahlkreis || null,
      electoralList: raw.landesliste || null,
      state: raw.bundesland || null,
      bio: raw.vitaLang || raw.vitaKurz || null,
      websiteUrl: raw.homepage || null,
      socialMedia: {
        twitter: raw.twitter || null,
        facebook: raw.facebook || null,
        linkedin: raw.linkedin || null,
        instagram: raw.instagram || null,
        youtube: raw.youtube || null,
        tiktok: raw.tiktok || null,
      },
      rawData: JSON.stringify(raw),
    };
  }

  /**
   * Normalize a DIP API `person` document to the internal format. DIP person
   * records are sparse (name, title, term) — richer profile data comes from
   * Abgeordnetenwatch.
   * @param {Object} doc
   * @returns {BundestagPolitician}
   */
  #normalizeDipPerson(doc) {
    const first = doc.vorname || "";
    const last = doc.nachname || "";
    const id = doc.id ? String(doc.id) : null;
    return {
      id,
      source: "bundestag",
      externalId: id,
      title: doc.titel || doc.akademischertitel || null,
      firstName: first,
      lastName: last,
      fullName: `${first} ${last}`.trim() || "",
      party: doc.fraktion || null,
      faction: doc.fraktion || null,
      gender: null,
      birthDate: null,
      birthPlace: null,
      profession: doc.beruf || null,
      education: null,
      photoUrl: null,
      profileUrl: null,
      email: null,
      electoralDistrict: doc.wahlkreis || null,
      electoralList: null,
      state: doc.bundesland || null,
      bio: null,
      websiteUrl: null,
      socialMedia: {},
      rawData: JSON.stringify(doc),
    };
  }

  /**
   * Parse German salutation to gender.
   * @param {string} anrede
   * @returns {string|null}
   */
  #parseGender(anrede) {
    if (/herr/i.test(anrede)) return "male";
    if (/frau/i.test(anrede)) return "female";
    return null;
  }

  /**
   * Fetch a single member's full biography page.
   * @param {string} profileUrl
   * @returns {Promise<string|null>}
   */
  async fetchFullBio(profileUrl) {
    if (!profileUrl) return null;
    try {
      const res = await this.#fetch(profileUrl, { Accept: "text/html" });
      if (!res.ok) {
        res.text?.().catch(() => {});
        return null;
      }
      return await res.text();
    } catch (err) {
      this.log(`Error fetching bio from ${profileUrl}: ${err.message}`);
      return null;
    }
  }

  /**
   * Search members by name.
   * @param {string} query
   * @returns {Promise<BundestagPolitician[]>}
   */
  async searchMembers(query) {
    const all = await this.fetchAllMembers();
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(
      (m) =>
        m.lastName.toLowerCase().includes(q) ||
        m.fullName.toLowerCase().includes(q),
    );
  }

  /**
   * Get a single member by external ID.
   * @param {string} externalId
   * @returns {Promise<BundestagPolitician|null>}
   */
  async getMember(externalId) {
    const all = await this.fetchAllMembers();
    return all.find((m) => m.externalId === externalId) || null;
  }

  /** Clear the in-memory cache. */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = { BundestagApi };
