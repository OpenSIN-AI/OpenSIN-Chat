/**
 * Bundestag API client — fetches politician data from the official "Offene Daten"
 * Abgeordnetendatenbank.
 *
 * Docs: bundestagApi.doc.md
 * Purpose: Client for the Bundestag Open Data API with caching, retry, and rate-limiting.
 */

const { SystemSettings } = require("../../models/systemSettings");

const BUNDESTAG_BASE_URL = "https://www.bundestag.de";
const BUNDESTAG_API_BASE = `${BUNDESTAG_BASE_URL}/SiteGlobals/Functions/Abgeordnetensuche`;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

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
  constructor() {
    this.baseUrl = BUNDESTAG_API_BASE;
    this.maxRetries = 3;
    this.retryDelayMs = 1000;
    this.rateLimitDelayMs = 500;
    this.lastRequestTime = 0;
    this.cache = new Map();
  }

  log(text, ...args) {
    console.log(`\x1b[33m[BundestagApi]\x1b[0m ${text}`, ...args);
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
   * Fetch all Bundestag members (current electoral term).
   * @returns {Promise<BundestagPolitician[]>}
   */
  async fetchAllMembers() {
    const url = `${this.baseUrl}/Abgeordnete20_WP.formular`;
    this.log("Fetching all Bundestag members from API...");
    try {
      const data = await this.#fetchCached(url);
      if (!data || !Array.isArray(data)) return [];
      return data
        .filter(Boolean)
        .map((raw) => this.#normalizeMember(raw));
    } catch (err) {
      this.log(`Error fetching members: ${err.message}`);
      return [];
    }
  }

  /**
   * Normalize raw Bundestag API response to internal format.
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
        raw.profilUrl || (raw.id ? `${BUNDESTAG_BASE_URL}/abgeordnete/biografien18/${raw.id}` : null),
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
      const res = await this.#fetch(profileUrl);
      if (!res.ok) return null;
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
