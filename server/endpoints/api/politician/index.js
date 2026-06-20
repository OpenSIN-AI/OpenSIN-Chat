// SPDX-License-Identifier: MIT
/**
 * Politician REST API endpoints.
 *
 * Docs: index.doc.md
 * Purpose: Exposes politician search, profiles, votes, speeches, sync status, and manual sync trigger via REST.
 *
 * Endpoints:
 *   GET /politician/search  — search politicians (supports ?source=)
 *   GET /politician/sources — list available data sources with counts
 *   GET /politician/sync/status — last sync run + status per source
 *   GET /politician/:id      — get politician detail
 *   GET /politician/:id/votes — get voting record
 *   GET /politician/:id/speeches — get speeches (supports ?source=)
 *   GET /politician/:id/mandates — get mandates
 *   GET /politician/speech-search — semantic search speeches (supports ?source=)
 */

const { validApiKey } = require("../../../utils/middleware/validApiKey");
const {
  validatedRequest,
} = require("../../../utils/middleware/validatedRequest");
const logger = require("../../../utils/logger")();

const MAX_LIMIT = 200;
const MAX_TOP_N = 100;

function getPoliticianDB() {
  const { PoliticianDB } = require("../../../utils/politician");
  return new PoliticianDB();
}

/**
 * Parses an integer query param, falling back to a default and clamping to a
 * [min, max] range. Guards endpoints against unbounded/negative pagination.
 * @param {*} value raw query value
 * @param {number} fallback default when value is absent or invalid
 * @param {number} min lower bound
 * @param {number} max upper bound
 * @returns {number}
 */
function clampInt(value, fallback, min, max) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function apiPoliticianEndpoints(app) {
  if (!app) return;

  app.get("/politician/search", [validApiKey], async (request, response) => {
    try {
      const { q, party, state, faction, source } = request.query;
      const filters = {};
      if (party) filters.party = party;
      if (state) filters.state = state;
      if (faction) filters.faction = faction;
      if (source) filters.source = source;

      const db = getPoliticianDB();
      const results = await db.searchPoliticians(q || "", filters);
      response
        .status(200)
        .json({ politicians: results, total: results.length });
    } catch (err) {
      logger.error(`[politician] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get(
    "/politician/speech-search",
    [validApiKey],
    async (request, response) => {
      try {
        const { q, party, topN, source } = request.query;
        if (!q)
          return response
            .status(400)
            .json({ error: "query parameter 'q' is required" });

        const db = getPoliticianDB();
        const results = await db.semanticSearchSpeeches(q, {
          party: party || null,
          topN: clampInt(topN, 10, 1, MAX_TOP_N),
          source: source || null,
        });
        response.status(200).json({ results, total: results.length });
      } catch (err) {
        logger.error(`[politician] ${err.message}`, err);
        response.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get("/politician/parties", [validApiKey], async (_, response) => {
    try {
      const db = getPoliticianDB();
      const parties = await db.getParties();
      response.status(200).json({ parties });
    } catch (err) {
      logger.error(`[politician] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/politician/states", [validApiKey], async (_, response) => {
    try {
      const db = getPoliticianDB();
      const states = await db.getStates();
      response.status(200).json({ states });
    } catch (err) {
      logger.error(`[politician] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/politician/stats", [validatedRequest], async (_, response) => {
    try {
      const db = getPoliticianDB();
      const vectorStats = await db.vectorStore.stats();
      const count = await db.count();
      response.status(200).json({
        politicians: count,
        ...vectorStats,
      });
    } catch (err) {
      logger.error(`[politician] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/politician/sources", [validApiKey], async (_, response) => {
    try {
      const db = getPoliticianDB();
      const sources = await db.getSources();
      response.status(200).json({ sources });
    } catch (err) {
      logger.error(`[politician] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/politician/sync/status", [validatedRequest], async (_, response) => {
    try {
      const db = getPoliticianDB();
      const status = await db.getSyncStatus();
      response.status(200).json(status);
    } catch (err) {
      logger.error(`[politician] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/politician/sync/trigger", [validatedRequest], async (_, response) => {
    try {
      const { spawn } = require("child_process");
      const path = require("path");
      const jobPath = path.resolve(
        __dirname,
        "../../../jobs/sync-politician-data.js",
      );

      const child = spawn("node", [jobPath], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();

      logger.info("[politician] Manual sync triggered via API");
      response.status(202).json({ message: "Sync triggered", pid: child.pid });
    } catch (err) {
      logger.error(`[politician] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/politician/:id", [validApiKey], async (request, response) => {
    try {
      const { id } = request.params;
      const db = getPoliticianDB();
      const politician = await db.getPolitician(id);
      if (!politician)
        return response.status(404).json({ error: "Politician not found" });
      response.status(200).json({ politician });
    } catch (err) {
      logger.error(`[politician] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/politician/:id/votes", [validApiKey], async (request, response) => {
    try {
      const { id } = request.params;
      const { limit, offset } = request.query;

      const db = getPoliticianDB();
      const politician = await db.getPolitician(id);
      if (!politician)
        return response.status(404).json({ error: "Politician not found" });

      const votes = await db.getVotingRecord(id, {
        limit: clampInt(limit, 50, 1, MAX_LIMIT),
        offset: clampInt(offset, 0, 0, Number.MAX_SAFE_INTEGER),
      });
      response.status(200).json({ votes, total: votes.length });
    } catch (err) {
      logger.error(`[politician] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get(
    "/politician/:id/speeches",
    [validApiKey],
    async (request, response) => {
      try {
        const { id } = request.params;
        const { limit, offset, source } = request.query;

        const db = getPoliticianDB();
        const politician = await db.getPolitician(id);
        if (!politician)
          return response.status(404).json({ error: "Politician not found" });

        const speeches = await db.getSpeeches(id, {
          limit: clampInt(limit, 50, 1, MAX_LIMIT),
          offset: clampInt(offset, 0, 0, Number.MAX_SAFE_INTEGER),
          source: source || null,
        });
        response.status(200).json({ speeches, total: speeches.length });
      } catch (err) {
        logger.error(`[politician] ${err.message}`, err);
        response.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get(
    "/politician/:id/mandates",
    [validApiKey],
    async (request, response) => {
      try {
        const { id } = request.params;
        const db = getPoliticianDB();
        const mandates = await db.getMandates(id);
        response.status(200).json({ mandates, total: mandates.length });
      } catch (err) {
        logger.error(`[politician] ${err.message}`, err);
        response.status(500).json({ error: "Internal Server Error" });
      }
    },
  );
}

module.exports = { apiPoliticianEndpoints };
