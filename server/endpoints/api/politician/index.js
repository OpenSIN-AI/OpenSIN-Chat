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

const {
  validatedRequest,
} = require("../../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../../utils/middleware/multiUserProtected");
const { simpleRateLimit } = require("../../../utils/middleware/simpleRateLimit");
const { reqBody, userFromSession, multiUserMode } = require("../../../utils/http");
const { Workspace } = require("../../../models/workspace");
const { Document } = require("../../../models/documents");
const { CollectorApi } = require("../../../utils/collectorApi");
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

  app.get("/politician/search", [validatedRequest], async (request, response) => {
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
    [validatedRequest],
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

  app.get("/politician/parties", [validatedRequest], async (_, response) => {
    try {
      const db = getPoliticianDB();
      const parties = await db.getParties();
      response.status(200).json({ parties });
    } catch (err) {
      logger.error(`[politician] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/politician/states", [validatedRequest], async (_, response) => {
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

  app.get("/politician/sources", [validatedRequest], async (_, response) => {
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

  app.get("/politician/:id", [validatedRequest], async (request, response) => {
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

  app.get("/politician/:id/votes", [validatedRequest], async (request, response) => {
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
    [validatedRequest],
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
    [validatedRequest],
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

  app.post(
    "/politician/:id/add-to-workspace",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      simpleRateLimit({
        bucket: "politician-add-to-workspace",
        max: 20,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const { id } = request.params;
        const { workspaceSlug } = reqBody(request);
        if (!workspaceSlug) {
          return response
            .status(400)
            .json({ error: "workspaceSlug is required" });
        }

        const db = getPoliticianDB();
        const politician = await db.getPolitician(id);
        if (!politician) {
          return response.status(404).json({ error: "Politician not found" });
        }

        const user = await userFromSession(request, response);
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug: workspaceSlug })
          : await Workspace.get({ slug: workspaceSlug });
        if (!workspace) {
          return response.status(404).json({ error: "Workspace not found" });
        }

        // Include a subset of speeches so the source is actually useful for chat RAG.
        const speeches = await db.getSpeeches(id, { limit: 25 });
        const textContent = buildPoliticianSourceText(politician, speeches);
        const metadata = {
          title: `Politiker: ${politician.fullName || politician.id}`,
          docAuthor: "OpenSIN-Chat Politiker-Datenbank",
          description: [politician.party, politician.state, politician.electoralDistrict]
            .filter(Boolean)
            .join(" — ") || "Politikerprofil",
          docSource: "Abgeordnetenwatch / Bundestag",
          chunkSource: `politician-${id}`,
          url: politician.profileUrl || "",
          published: politician.lastSyncedAt
            ? new Date(politician.lastSyncedAt).toISOString()
            : new Date().toISOString(),
        };

        // Idempotency: remove any existing politician document for this workspace
        // so clicking "add to source" twice does not create duplicates.
        const politicianChunkSource = metadata.chunkSource;
        const existingDocs = await Document.forWorkspace(workspace.id);
        const existingPaths = existingDocs
          .filter((doc) => {
            try {
              const meta = JSON.parse(doc.metadata || "{}");
              return meta.chunkSource === politicianChunkSource;
            } catch {
              return false;
            }
          })
          .map((doc) => doc.docpath)
          .filter(Boolean);
        if (existingPaths.length > 0) {
          await Document.removeDocuments(
            workspace,
            existingPaths,
            user?.id || response.locals?.user?.id,
          );
        }

        const Collector = new CollectorApi();
        const { success, reason, documents } = await Collector.processRawText(
          textContent,
          metadata,
        );
        if (!success || !documents?.length) {
          logger.error(`[politician] processRawText failed: ${reason}`);
          return response.status(500).json({
            success: false,
            error: reason || "Failed to process politician text",
          });
        }

        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          workspace,
          documents.map((d) => d.location),
          response.locals?.user?.id,
        );

        if (failedToEmbed.length > 0) {
          return response.status(500).json({
            success: false,
            error: errors?.[0] ?? "Failed to embed politician document",
          });
        }

        response.status(200).json({
          success: true,
          documentPaths: documents.map((d) => d.location),
          politicianId: id,
          workspaceSlug: workspace.slug,
        });
      } catch (err) {
        logger.error(`[politician] add-to-workspace error: ${err.message}`, err);
        response.status(500).json({ error: "Internal Server Error" });
      }
    },
  );
}

/**
 * Build a single plain-text document from a politician profile and their speeches.
 * @param {Object} politician
 * @param {Array<{speechTitle:string, speechText:string, speechDate:Date}>} speeches
 * @returns {string}
 */
function buildPoliticianSourceText(politician, speeches = []) {
  const lines = [];
  const name = politician.fullName || `${politician.firstName} ${politician.lastName}`.trim() || politician.id;
  lines.push(`# ${name}`);
  lines.push("");

  const meta = [
    politician.party ? `Partei: ${politician.party}` : null,
    politician.faction && politician.faction !== politician.party
      ? `Fraktion: ${politician.faction}`
      : null,
    politician.state ? `Bundesland: ${politician.state}` : null,
    politician.electoralDistrict ? `Wahlkreis: ${politician.electoralDistrict}` : null,
    politician.electoralList ? `Landesliste: ${politician.electoralList}` : null,
    politician.profession ? `Beruf: ${politician.profession}` : null,
    politician.birthDate ? `Geburtsdatum: ${new Date(politician.birthDate).toISOString().split("T")[0]}` : null,
    politician.birthPlace ? `Geburtsort: ${politician.birthPlace}` : null,
  ].filter(Boolean);

  if (meta.length) {
    lines.push("## Profil");
    lines.push("");
    lines.push(...meta);
    lines.push("");
  }

  const links = [
    politician.profileUrl ? `Abgeordnetenwatch-Profil: ${politician.profileUrl}` : null,
    politician.websiteUrl ? `Webseite: ${politician.websiteUrl}` : null,
    politician.email ? `E-Mail: ${politician.email}` : null,
  ].filter(Boolean);

  if (links.length) {
    lines.push("## Links");
    lines.push("");
    lines.push(...links);
    lines.push("");
  }

  if (politician.bio) {
    lines.push("## Biografie");
    lines.push("");
    lines.push(politician.bio);
    lines.push("");
  }

  if (speeches.length) {
    lines.push(`## Reden (${speeches.length})`);
    lines.push("");
    for (const speech of speeches) {
      const date = speech.speechDate
        ? new Date(speech.speechDate).toISOString().split("T")[0]
        : "unbekannt";
      lines.push(`### ${speech.speechTitle || "Rede"} (${date})`);
      lines.push("");
      lines.push(speech.speechText || "(Kein Text verfügbar)");
      lines.push("");
    }
  }

  return lines.join("\n");
}

module.exports = { apiPoliticianEndpoints };
