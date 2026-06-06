/**
 * Politician REST API endpoints.
 *
 * Docs: index.doc.md
 * Purpose: Exposes politician search, detail, votes, and speeches via REST.
 *
 * Endpoints:
 *   GET /politician/search  — search politicians
 *   GET /politician/:id      — get politician detail
 *   GET /politician/:id/votes — get voting record
 *   GET /politician/:id/speeches — get speeches
 *   GET /politician/:id/mandates — get mandates
 *   GET /politician/speech-search — semantic search speeches
 */

const { validApiKey } = require("../../../utils/middleware/validApiKey");

function getPoliticianDB() {
  const { PoliticianDB } = require("../../../utils/politician");
  return new PoliticianDB();
}

function apiPoliticianEndpoints(app) {
  if (!app) return;

  app.get("/politician/search", [validApiKey], async (request, response) => {
    try {
      const { q, party, state, faction } = request.query;
      const filters = {};
      if (party) filters.party = party;
      if (state) filters.state = state;
      if (faction) filters.faction = faction;

      const db = getPoliticianDB();
      const results = await db.searchPoliticians(q || "", filters);
      response.status(200).json({ politicians: results, total: results.length });
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });

  app.get("/politician/speech-search", [validApiKey], async (request, response) => {
    try {
      const { q, party, topN } = request.query;
      if (!q) return response.status(400).json({ error: "query parameter 'q' is required" });

      const db = getPoliticianDB();
      const results = await db.semanticSearchSpeeches(q, {
        party: party || null,
        topN: parseInt(topN) || 10,
      });
      response.status(200).json({ results, total: results.length });
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });

  app.get("/politician/parties", [validApiKey], async (_, response) => {
    try {
      const db = getPoliticianDB();
      const parties = await db.getParties();
      response.status(200).json({ parties });
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });

  app.get("/politician/states", [validApiKey], async (_, response) => {
    try {
      const db = getPoliticianDB();
      const states = await db.getStates();
      response.status(200).json({ states });
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });

  app.get("/politician/stats", [validApiKey], async (_, response) => {
    try {
      const db = getPoliticianDB();
      const vectorStats = await db.vectorStore.stats();
      const count = await db.count();
      response.status(200).json({
        politicians: count,
        ...vectorStats,
      });
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });

  app.get("/politician/:id", [validApiKey], async (request, response) => {
    try {
      const { id } = request.params;
      const db = getPoliticianDB();
      const politician = await db.getPolitician(id);
      if (!politician) return response.status(404).json({ error: "Politician not found" });
      response.status(200).json({ politician });
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });

  app.get("/politician/:id/votes", [validApiKey], async (request, response) => {
    try {
      const { id } = request.params;
      const { limit, offset } = request.query;

      const db = getPoliticianDB();
      const politician = await db.getPolitician(id);
      if (!politician) return response.status(404).json({ error: "Politician not found" });

      const votes = await db.getVotingRecord(id, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      });
      response.status(200).json({ votes, total: votes.length });
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });

  app.get("/politician/:id/speeches", [validApiKey], async (request, response) => {
    try {
      const { id } = request.params;
      const { limit, offset } = request.query;

      const db = getPoliticianDB();
      const politician = await db.getPolitician(id);
      if (!politician) return response.status(404).json({ error: "Politician not found" });

      const speeches = await db.getSpeeches(id, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      });
      response.status(200).json({ speeches, total: speeches.length });
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });

  app.get("/politician/:id/mandates", [validApiKey], async (request, response) => {
    try {
      const { id } = request.params;
      const db = getPoliticianDB();
      const mandates = await db.getMandates(id);
      response.status(200).json({ mandates, total: mandates.length });
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });
}

module.exports = { apiPoliticianEndpoints };
