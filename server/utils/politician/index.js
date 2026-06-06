/**
 * Politician Database Module — unified entry point for politician search,
 * retrieval, voting records, speeches, and mandates.
 *
 * Docs: index.doc.md
 * Purpose: Aggregates data from Bundestag API, Abgeordnetenwatch API, and
 * Plenarprotokolle. Provides search with vector-semantic capabilities.
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
   * @returns {Promise<PoliticianProfile[]>}
   */
  async searchPoliticians(query = "", filters = {}) {
    const where = {};

    if (query && query.trim()) {
      where.OR = [
        { lastName: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { fullName: { contains: query, mode: "insensitive" } },
      ];
    }

    if (filters.party) where.party = filters.party;
    if (filters.state) where.state = filters.state;
    if (filters.faction) where.faction = filters.faction;

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
        take: 50,
      });
      return results;
    } catch (err) {
      console.error(`[PoliticianDB] searchPoliticians error: ${err.message}`);
      return [];
    }
  }

  /**
   * Semantic search over politician speeches.
   * @param {string} query - natural language query
   * @param {Object} [filters]
   * @param {string} [filters.party]
   * @param {number} [filters.topN=10]
   * @returns {Promise<Array<{text: string, metadata: Object, score: number}>>}
   */
  async semanticSearchSpeeches(query, filters = {}) {
    const { results, error } = await this.vectorStore.searchSpeeches({
      query,
      topN: filters.topN || 10,
      similarityThreshold: 0.25,
      party: filters.party || null,
    });
    if (error) return [];
    return results;
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
      console.error(`[PoliticianDB] getPolitician error: ${err.message}`);
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
      console.error(`[PoliticianDB] getVotingRecord error: ${err.message}`);
      return [];
    }
  }

  /**
   * Get speeches for a politician.
   * @param {string} politicianId
   * @param {Object} [options]
   * @param {number} [options.limit=50]
   * @param {number} [options.offset=0]
   * @returns {Promise<SpeechRecord[]>}
   */
  async getSpeeches(politicianId, options = {}) {
    try {
      return await prisma.politician_speeches.findMany({
        where: { politicianId },
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
      console.error(`[PoliticianDB] getSpeeches error: ${err.message}`);
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
      });
    } catch (err) {
      console.error(`[PoliticianDB] getMandates error: ${err.message}`);
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
      const awId = parseInt(politician.externalId, 10);
      if (isNaN(awId)) return [];
      return await this.abgeordnetenwatch.getVotingRecord(awId);
    } catch (err) {
      console.error(`[PoliticianDB] fetchLiveVotes error: ${err.message}`);
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
      });
      return result.map((r) => r.party).filter(Boolean);
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
      });
      return result.map((r) => r.state).filter(Boolean);
    } catch {
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
