// SPDX-License-Identifier: MIT
/**
 * Politician search plugin for aibitat agent framework.
 *
 * Docs: politician-search.doc.md
 * Purpose: Exposes politician search, detail lookup, voting records,
 * and speech search as aibitat functions callable by the AI agent.
 *
 * NOTE: PoliticianDB is loaded lazily inside handler functions to avoid
 * top-level import chain issues (prisma → jsonwebtoken → SlowBuffer).
 */

function getPoliticianDB() {
  const { PoliticianDB } = require("../../../politician");
  return new PoliticianDB();
}

const politicianSearch = {
  name: "politician-search",
  startupConfig: {
    params: {},
  },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        // ── search_politician ──────────────────────────────────────
        aibitat.function({
          super: aibitat,
          name: "search_politician",
          description:
            "Search the politician database by name, party, or state. Returns matching politician profiles with basic info. Use this when the user asks about politicians, Bundestag members, or faction members.",
          examples: [
            {
              prompt: "Who are the AfD members in the Bundestag?",
              call: JSON.stringify({ query: "", party: "AfD" }),
            },
            {
              prompt: "Find politicians named Weidel",
              call: JSON.stringify({ query: "Weidel" }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Name or keyword to search for.",
              },
              party: {
                type: "string",
                description:
                  "Filter by party (e.g. 'AfD', 'CDU', 'SPD', 'Grüne').",
              },
              state: {
                type: "string",
                description:
                  "Filter by Bundesland (e.g. 'Bayern', 'Nordrhein-Westfalen').",
              },
            },
            additionalProperties: false,
          },
          handler: async function ({ query = "", party, state } = {}) {
            try {
              const db = getPoliticianDB();
              const filters = {};
              if (party) filters.party = party;
              if (state) filters.state = state;
              const results = await db.searchPoliticians(query, filters);
              if (!results.length)
                return "No politicians found matching the query.";
              return JSON.stringify(results.slice(0, 20));
            } catch (error) {
              return `Error searching politicians: ${error.message}`;
            }
          },
        });

        // ── get_politician ──────────────────────────────────────
        aibitat.function({
          super: aibitat,
          name: "get_politician",
          description:
            "Get full details for a specific politician by ID, including mandates, committee memberships, and stats. Use this after search_politician to get more details.",
          examples: [
            {
              prompt: "Tell me more about Alice Weidel",
              call: JSON.stringify({ politicianId: "bundestag-12345" }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              politicianId: {
                type: "string",
                description:
                  "The UUID of the politician from a previous search result.",
              },
            },
            required: ["politicianId"],
            additionalProperties: false,
          },
          handler: async function ({ politicianId } = {}) {
            try {
              const db = getPoliticianDB();
              const politician = await db.getPolitician(politicianId);
              if (!politician) return "Politician not found.";
              return JSON.stringify(politician);
            } catch (error) {
              return `Error getting politician: ${error.message}`;
            }
          },
        });

        // ── get_politician_votes ──────────────────────────────────────
        aibitat.function({
          super: aibitat,
          name: "get_politician_votes",
          description:
            "Get the voting record for a specific politician. Returns recent votes with title, result, and date. Use this to answer questions about how a politician voted.",
          examples: [
            {
              prompt: "How did Höcke vote recently?",
              call: JSON.stringify({
                politicianId: "bundestag-67890",
                limit: 10,
              }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              politicianId: {
                type: "string",
                description: "The UUID of the politician.",
              },
              limit: {
                type: "integer",
                description: "Max number of votes to return (default 20).",
              },
            },
            required: ["politicianId"],
            additionalProperties: false,
          },
          handler: async function ({ politicianId, limit = 20 } = {}) {
            try {
              const db = getPoliticianDB();
              const votes = await db.getVotingRecord(politicianId, { limit });
              if (!votes.length)
                return "No voting records found for this politician.";
              return JSON.stringify(votes);
            } catch (error) {
              return `Error getting votes: ${error.message}`;
            }
          },
        });

        // ── get_politician_speeches ──────────────────────────────────────
        aibitat.function({
          super: aibitat,
          name: "get_politician_speeches",
          description:
            "Get speeches by a specific politician from plenary protocols. Returns speech title, text excerpt, and date. Use this to find what a politician said in the Bundestag.",
          examples: [
            {
              prompt: "What did Beatrix von Storch say in recent sessions?",
              call: JSON.stringify({ politicianId: "aw-123", limit: 10 }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              politicianId: {
                type: "string",
                description: "The UUID of the politician.",
              },
              limit: {
                type: "integer",
                description: "Max number of speeches to return (default 10).",
              },
            },
            required: ["politicianId"],
            additionalProperties: false,
          },
          handler: async function ({ politicianId, limit = 10 } = {}) {
            try {
              const db = getPoliticianDB();
              const speeches = await db.getSpeeches(politicianId, { limit });
              if (!speeches.length)
                return "No speeches found for this politician.";
              return JSON.stringify(
                speeches.map((s) => ({
                  id: s.id,
                  title: s.speechTitle,
                  text: s.speechText?.substring(0, 500),
                  date: s.speechDate,
                  documentUrl: s.documentUrl,
                })),
              );
            } catch (error) {
              return `Error getting speeches: ${error.message}`;
            }
          },
        });

        // ── search_politician_speeches ──────────────────────────────────
        aibitat.function({
          super: aibitat,
          name: "search_politician_speeches",
          description:
            "Semantic search over politician speeches. Finds speeches that match a natural language query, even if exact keywords differ. Use this for topic-based speech search (e.g. 'migration policy speeches', 'energy transition debates').",
          examples: [
            {
              prompt: "Find speeches about migration policy",
              call: JSON.stringify({
                query: "Migrationspolitik Asyl",
                party: "AfD",
              }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Natural language query to search speeches.",
              },
              party: {
                type: "string",
                description: "Optional party filter (e.g. 'AfD').",
              },
              topN: {
                type: "integer",
                description: "Max results to return (default 10).",
              },
            },
            required: ["query"],
            additionalProperties: false,
          },
          handler: async function ({ query, party, topN = 10 } = {}) {
            try {
              const db = getPoliticianDB();
              const results = await db.semanticSearchSpeeches(query, {
                party: party || null,
                topN,
              });
              if (!results.length) return "No matching speeches found.";
              return JSON.stringify(results);
            } catch (error) {
              return `Error searching speeches: ${error.message}`;
            }
          },
        });

        // ── list_politician_parties ──────────────────────────────────
        aibitat.function({
          super: aibitat,
          name: "list_politician_parties",
          description:
            "List all distinct parties represented in the politician database. Use this to discover available party filters.",
          examples: [
            {
              prompt: "What parties are in the database?",
              call: JSON.stringify({}),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          handler: async function () {
            try {
              const db = getPoliticianDB();
              const parties = await db.getParties();
              return JSON.stringify(parties);
            } catch (error) {
              return `Error listing parties: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { politicianSearch };
