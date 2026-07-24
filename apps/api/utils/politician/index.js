// SPDX-License-Identifier: MIT
// Purpose: Aggregates and normalizes politician data from supported sources.
// Docs: index.doc.md
const consoleLogger = require("../logger/console.js");

function normalizePoliticalLabel(value, type) {
  if (!value) return null;
  let normalized = String(value)
    .normalize("NFKC")
    .replace(/[\u00ad\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (type === "party") {
    normalized = normalized.replace(/\.?\s*\(Gruppe\)$/i, "").trim();
    if (/^die linke$/i.test(normalized)) return "Die Linke";
  }
  if (type === "state" && /^mecklenburg[ -]?vorpommern$/i.test(normalized))
    return "Mecklenburg-Vorpommern";
  return normalized;
}

function politicianScore(politician) {
  return [
    politician.profileUrl,
    politician.party,
    politician.state,
    politician.electoralDistrict,
    politician.photoUrl,
    politician.bio,
  ].filter(Boolean).length;
}

function normalizeAndDedupePoliticians(politicians) {
  const byName = new Map();
  for (const politician of politicians) {
    const normalized = {
      ...politician,
      party: normalizePoliticalLabel(politician.party, "party"),
      state: normalizePoliticalLabel(politician.state, "state"),
    };
    const name = (
      normalized.fullName ||
      `${normalized.firstName || ""} ${normalized.lastName || ""}`
    )
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("de-DE");
    if (!name) continue;
    const existing = byName.get(name);
    if (!existing || politicianScore(normalized) > politicianScore(existing))
      byName.set(name, normalized);
  }
  return [...byName.values()];
}

/**
 * Politician Database Module — unified entry point for politician search,
 * profiles, voting records, speeches, mandates, and sync status.
 *
 * Docs: index.doc.md
 * Purpose: Aggregates politician data from Bundestag, Abgeordnetenwatch, and Plenarprotokolle into a searchable database interface.
 *
 * Public API:
 *   searchPoliticians(query, filters) — search politicians by name/party/state
 *   getPolitician(id) — get full politician profile with mandates
 *   getVotingRecord(id) — get Abgeordnetenwatch voting history
 *   getSpeeches(id) — get speeches from Plenarprotokolle + semantic search
 *   getMandates(id) — get mandate history for a politician
 */

const { BundestagApi } = require("./bundestagApi");
const { AbgeordnetenwatchApi } = require("./abgeordnetenwatchApi");
const { PlenarScraper } = require("./plenarScraper");
const { PoliticianVectorStore } = require("./vectorStore");
const prisma = require("../prisma");

/**
 * @typedef {Object} PoliticianProfile
 * @property {string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} fullName
 * @property {string} party
 * @property {string} faction
 * @property {string} state
 * @property {string} photoUrl
 * @property {string} profileUrl
 * @property {string} bio
 */

/**
 * @typedef {Object} VoteRecord
 * @property {string} id
 * @property {string} politicianId
 * @property {string} voteTitle
 * @property {string} voteResult
 * @property {string} voteDate
 */

/**
 * @typedef {Object} SpeechRecord
 * @property {string} id
 * @property {string} politicianId
 * @property {string} speechTitle
 * @property {string} speechText
 * @property {string} speechDate
 * @property {string} documentUrl
 */

class PoliticianDB {
  constructor() {
    this.bundestag = new BundestagApi();
    this.abgeordnetenwatch = new AbgeordnetenwatchApi();
    this.scraper = new PlenarScraper();
    this.vectorStore = new PoliticianVectorStore();
  }

  // ── Search ──────────────────────────────────────

  /**
   * Search politicians by name, party, state, or keywords.
   * Uses both the local database and external APIs.
   * @param {string} query - search term
   * @param {Object} [filters]
   * @param {string} [filters.party]
   * @param {string} [filters.state]
   * @param {string} [filters.faction]
   * @param {string} [filters.source] - bundestag | abgeordnetenwatch | all
   * @returns {Promise<PoliticianProfile[]>}
   */
  async searchPoliticians(query = "", filters = {}) {
    const where = {};

    if (query && query.trim()) {
      // SQLite's LIKE (which Prisma's `contains` maps to) is already
      // case-insensitive for ASCII by default. `mode: "insensitive"` is a
      // PostgreSQL-only Prisma feature and throws a PrismaClientValidationError
      // on SQLite, causing every search to fail silently (caught → []).
      where.OR = [
        { lastName: { contains: query } },
        { firstName: { contains: query } },
        { fullName: { contains: query } },
      ];
    }

    // Party and state use source-specific spellings. Filter their canonical
    // values after fetching so one UI option includes every source variant.
    if (filters.faction) where.faction = filters.faction;
    if (filters.source && filters.source !== "all")
      where.source = filters.source;

    try {
      const results = await prisma.politicians.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          fullName: true,
          party: true,
          faction: true,
          state: true,
          photoUrl: true,
          profileUrl: true,
          bio: true,
          electoralDistrict: true,
          title: true,
        },
        orderBy: { lastName: "asc" },
        take: 1000,
      });
      return normalizeAndDedupePoliticians(results)
        .filter(
          (politician) =>
            (politician.party || politician.state) &&
            (!filters.party ||
              politician.party ===
                normalizePoliticalLabel(filters.party, "party")) &&
            (!filters.state ||
              politician.state ===
                normalizePoliticalLabel(filters.state, "state")),
        )
        .slice(0, 50);
    } catch (err) {
      consoleLogger.error(
        `[PoliticianDB] searchPoliticians error: ${err.message}`,
      );
      return [];
    }
  }

  /**
   * Semantic search over politician speeches.
   * @param {string} query - natural language query
   * @param {Object} [filters]
   * @param {string} [filters.party]
   * @param {number} [filters.topN=10]
   * @param {string} [filters.source] - bundestag | abgeordnetenwatch | plenarprotokolle | all
   * @returns {Promise<Array<{text: string, metadata: Object, score: number}>>}
   */
  async semanticSearchSpeeches(query, filters = {}) {
    const { results, error } = await this.vectorStore.searchSpeeches({
      query,
      topN: filters.topN || 10,
      similarityThreshold: 0.25,
      party: filters.party || null,
    });
    if (error) {
      return this._textSearchSpeeches(query, filters);
    }

    const src = filters.source;
    if (!src || src === "all" || src === "plenarprotokolle") return results;

    try {
      const ids = [
        ...new Set(
          results.map((r) => r.metadata?.politicianId).filter(Boolean),
        ),
      ];
      if (!ids.length) return [];
      const allowed = await prisma.politicians.findMany({
        where: { id: { in: ids }, source: src },
        select: { id: true },
        take: 100,
      });
      const allowedSet = new Set(allowed.map((p) => p.id));
      return results.filter((r) => allowedSet.has(r.metadata?.politicianId));
    } catch (err) {
      consoleLogger.error(
        `[PoliticianDB] semanticSearchSpeeches source filter error: ${err.message}`,
      );
      return results;
    }
  }

  async _textSearchSpeeches(query, filters = {}) {
    try {
      const where = {
        // SQLite LIKE is case-insensitive for ASCII by default — no
        // `mode: "insensitive"` needed (and it would crash on SQLite).
        speechText: { contains: query },
      };
      if (filters.party) {
        where.speakerParty = { contains: filters.party };
      }
      const src = filters.source;
      if (src && src !== "all" && src !== "plenarprotokolle") {
        where.politician = { is: { source: src } };
      }
      const speeches = await prisma.politician_speeches.findMany({
        where,
        orderBy: { speechDate: "desc" },
        take: filters.topN || 10,
        select: {
          id: true,
          politicianId: true,
          speechTitle: true,
          speechText: true,
          speechDate: true,
          documentUrl: true,
          speakerName: true,
          speakerParty: true,
          session: true,
          sitting: true,
        },
      });
      return speeches.map((s) => ({
        text: s.speechText,
        metadata: {
          speechId: s.id,
          politicianId: s.politicianId,
          politicianName: s.speakerName,
          party: s.speakerParty,
          date: s.speechDate,
          title: s.speechTitle,
        },
        score: 0,
      }));
    } catch (err) {
      consoleLogger.error(
        `[PoliticianDB] _textSearchSpeeches fallback error: ${err.message}`,
      );
      return [];
    }
  }

  // ── Politician Detail ──────────────────────────────────────

  /**
   * Get full politician profile with mandates and summary stats.
   * @param {string} id - politician UUID
   * @returns {Promise<Object|null>}
   */
  async getPolitician(id) {
    try {
      const politician = await prisma.politicians.findUnique({
        where: { id },
        include: {
          mandates: { orderBy: { startDate: "desc" } },
          committeeMemberships: {
            include: { committee: true },
          },
        },
      });
      if (!politician) return null;

      const [speechCount, voteCount] = await Promise.all([
        prisma.politician_speeches.count({ where: { politicianId: id } }),
        prisma.politician_votes.count({ where: { politicianId: id } }),
      ]);

      return { ...politician, _stats: { speechCount, voteCount } };
    } catch (err) {
      consoleLogger.error(`[PoliticianDB] getPolitician error: ${err.message}`);
      return null;
    }
  }

  /**
   * Get voting record for a politician.
   * @param {string} politicianId
   * @param {Object} [options]
   * @param {number} [options.limit=50]
   * @param {number} [options.offset=0]
   * @returns {Promise<VoteRecord[]>}
   */
  async getVotingRecord(politicianId, options = {}) {
    try {
      return await prisma.politician_votes.findMany({
        where: { politicianId },
        orderBy: { voteDate: "desc" },
        take: options.limit || 50,
        skip: options.offset || 0,
      });
    } catch (err) {
      consoleLogger.error(
        `[PoliticianDB] getVotingRecord error: ${err.message}`,
      );
      return [];
    }
  }

  /**
   * Get speeches for a politician.
   * @param {string} politicianId
   * @param {Object} [options]
   * @param {number} [options.limit=50]
   * @param {number} [options.offset=0]
   * @param {string} [options.source] - bundestag | abgeordnetenwatch | plenarprotokolle | all
   * @returns {Promise<SpeechRecord[]>}
   */
  async getSpeeches(politicianId, options = {}) {
    try {
      // Speeches always originate from Plenarprotokolle. When a non-speech
      // source is requested we constrain by the owning politician's source
      // so cross-source filtering stays consistent across endpoints.
      const where = { politicianId };
      const src = options.source;
      if (src && src !== "all" && src !== "plenarprotokolle") {
        where.politician = { is: { source: src } };
      }
      return await prisma.politician_speeches.findMany({
        where,
        orderBy: { speechDate: "desc" },
        take: options.limit || 50,
        skip: options.offset || 0,
        select: {
          id: true,
          politicianId: true,
          speechTitle: true,
          speechText: true,
          speechDate: true,
          documentUrl: true,
          session: true,
          sitting: true,
        },
      });
    } catch (err) {
      consoleLogger.error(`[PoliticianDB] getSpeeches error: ${err.message}`);
      return [];
    }
  }

  /**
   * Get mandates for a politician.
   * @param {string} politicianId
   * @returns {Promise<Array<Object>>}
   */
  async getMandates(politicianId) {
    try {
      return await prisma.politician_mandates.findMany({
        where: { politicianId },
        orderBy: { startDate: "desc" },
        take: 1000,
      });
    } catch (err) {
      consoleLogger.error(`[PoliticianDB] getMandates error: ${err.message}`);
      return [];
    }
  }

  // ── External API (live data) ──────────────────────────────────────

  /**
   * Fetch live voting record from Abgeordnetenwatch.
   * @param {string} politicianId - local UUID, resolves to Abgeordnetenwatch ID
   * @returns {Promise<Array<Object>>}
   */
  async fetchLiveVotes(politicianId) {
    const politician = await prisma.politicians.findUnique({
      where: { id: politicianId },
      select: { externalId: true, source: true },
    });
    if (!politician || !politician.externalId) return [];
    if (politician.source !== "abgeordnetenwatch") return [];

    try {
      // externalId is stored as `aw-<numeric-id>` (see abgeordnetenwatchApi.js).
      // Strip the prefix before parsing to avoid NaN.
      const numericId = String(politician.externalId).replace(/^aw-/, "");
      const awId = parseInt(numericId, 10);
      if (isNaN(awId)) return [];
      return await this.abgeordnetenwatch.getVotingRecord(awId);
    } catch (err) {
      consoleLogger.error(
        `[PoliticianDB] fetchLiveVotes error: ${err.message}`,
      );
      return [];
    }
  }

  /**
   * Get list of distinct parties in the database.
   * @returns {Promise<string[]>}
   */
  async getParties() {
    try {
      const result = await prisma.politicians.findMany({
        select: { party: true },
        distinct: ["party"],
        where: { party: { not: null } },
        orderBy: { party: "asc" },
        take: 100,
      });
      return [
        ...new Set(
          result
            .map((r) => normalizePoliticalLabel(r.party, "party"))
            .filter(Boolean),
        ),
      ];
    } catch {
      return [];
    }
  }

  /**
   * Get list of distinct states in the database.
   * @returns {Promise<string[]>}
   */
  async getStates() {
    try {
      const result = await prisma.politicians.findMany({
        select: { state: true },
        distinct: ["state"],
        where: { state: { not: null } },
        orderBy: { state: "asc" },
        take: 100,
      });
      return [
        ...new Set(
          result
            .map((r) => normalizePoliticalLabel(r.state, "state"))
            .filter(Boolean),
        ),
      ];
    } catch {
      return [];
    }
  }

  /**
   * Get the list of available data sources aggregated from the database,
   * each with the number of politician records attributed to it.
   * @returns {Promise<Array<{source: string, count: number}>>}
   */
  async getSources() {
    try {
      const grouped = await prisma.politicians.groupBy({
        by: ["source"],
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
      });
      return grouped
        .filter((g) => g.source)
        .map((g) => ({ source: g.source, count: g._count._all }));
    } catch (err) {
      consoleLogger.error(`[PoliticianDB] getSources error: ${err.message}`);
      return [];
    }
  }

  /**
   * Get the last sync run per source from politician_sync_log, including the
   * most recent successful run, the last attempt, status, and counts.
   * @returns {Promise<{lastSync: string|null, sources: Array<Object>}>}
   */
  async getSyncStatus() {
    try {
      const logs = await prisma.politician_sync_log.findMany({
        orderBy: { startedAt: "desc" },
        take: 200,
      });

      const bySource = new Map();
      for (const log of logs) {
        const key = log.source || "unknown";
        if (!bySource.has(key)) {
          bySource.set(key, {
            source: key,
            status: log.status,
            lastAttempt: log.startedAt,
            lastSuccess: null,
            itemsProcessed: log.itemsProcessed,
            itemsFailed: log.itemsFailed,
            error: log.error || null,
          });
        }
        const entry = bySource.get(key);
        if (
          !entry.lastSuccess &&
          (log.status === "completed" || log.status === "ok")
        ) {
          entry.lastSuccess = log.completedAt || log.startedAt;
        }
      }

      const sources = Array.from(bySource.values());
      const lastSync = logs.length
        ? logs[0].completedAt || logs[0].startedAt
        : null;
      const retryQueue = await this.getRetryQueue();

      // Health check: each source is healthy if lastSuccess < 24h ago
      const now = Date.now();
      const HOURS_24 = 24 * 60 * 60 * 1000;
      const sourcesWithHealth = sources.map((s) => {
        const lastSuccessTime = s.lastSuccess
          ? new Date(s.lastSuccess).getTime()
          : 0;
        const isHealthy =
          lastSuccessTime > 0 && now - lastSuccessTime < HOURS_24;
        return { ...s, isHealthy };
      });
      const isHealthy = sourcesWithHealth.every((s) => s.isHealthy);

      return { lastSync, isHealthy, sources: sourcesWithHealth, retryQueue };
    } catch (err) {
      consoleLogger.error(`[PoliticianDB] getSyncStatus error: ${err.message}`);
      return { lastSync: null, isHealthy: false, sources: [], retryQueue: [] };
    }
  }

  /**
   * Get the current retry queue for failed sync phases (Issue #52).
   * Returns an empty list if the queue model is unavailable.
   * @returns {Promise<Array<{phase: string, attempts: number, status: string, nextRetryAt: Date|null, lastError: string|null}>>}
   */
  async getRetryQueue() {
    if (!prisma.politician_sync_retry) return [];
    try {
      const entries = await prisma.politician_sync_retry.findMany({
        orderBy: { nextRetryAt: "asc" },
        take: 100,
      });
      return entries.map((e) => ({
        phase: e.phase,
        attempts: e.attempts,
        status: e.status,
        nextRetryAt: e.nextRetryAt,
        lastError: e.lastError,
      }));
    } catch (err) {
      consoleLogger.error(`[PoliticianDB] getRetryQueue error: ${err.message}`);
      return [];
    }
  }

  /** Total politician count. */
  async count() {
    try {
      return await prisma.politicians.count();
    } catch {
      return 0;
    }
  }
}

module.exports = { PoliticianDB };
