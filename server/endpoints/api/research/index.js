// SPDX-License-Identifier: MIT
/**
 * Research REST API endpoints.
 *
 * Docs: index.doc.md
 * Purpose: Exposes deep research pipeline via REST API.
 *
 * Endpoints:
 *   POST /research/start   — start a research job
 *   GET  /research/:id     — get job status
 *   GET  /research/:id/result — get results
 *   GET  /research/list    — list all jobs
 */

const { validApiKey } = require("../../../utils/middleware/validApiKey");
const { simpleRateLimit } = require("../../../utils/middleware/simpleRateLimit");
const logger = require("../../../utils/logger")();

const startRateLimit = simpleRateLimit({
  bucket: "research-start",
  max: 10,
  windowMs: 60 * 1000,
});

const VALID_DEPTHS = ["quick", "deep"];
const VALID_SOURCES = ["web", "politician"];
const MAX_QUERY_LENGTH = 2000;

function getResearchPipeline() {
  const { getResearchPipeline } = require("../../../utils/research");
  return getResearchPipeline();
}

function apiResearchEndpoints(app) {
  if (!app) return;

    app.post("/research/start", [startRateLimit, validApiKey], async (request, response) => {
    try {
      const { query, depth, sources, workspaceId } = request.body || {};

      const errors = [];
      if (typeof query !== "string" || !query.trim())
        errors.push("query is required and must be a non-empty string");
      else if (query.length > MAX_QUERY_LENGTH)
        errors.push(`query must be ${MAX_QUERY_LENGTH} characters or fewer`);
      if (depth !== undefined && !VALID_DEPTHS.includes(depth))
        errors.push(`depth must be one of: ${VALID_DEPTHS.join(", ")}`);
      if (
        sources !== undefined &&
        (!Array.isArray(sources) ||
          sources.length === 0 ||
          sources.some((s) => !VALID_SOURCES.includes(s)))
      )
        errors.push(`sources must be a non-empty array of: ${VALID_SOURCES.join(", ")}`);
      if (
        workspaceId !== undefined &&
        workspaceId !== null &&
        typeof workspaceId !== "string" &&
        typeof workspaceId !== "number"
      )
        errors.push("workspaceId must be a string, number, or null");
      if (errors.length)
        return response.status(400).json({ error: errors.join("; ") });

      const pipeline = getResearchPipeline();
      const result = await pipeline.startResearch({
        query,
        depth: depth || "quick",
        sources: sources || ["web", "politician"],
        workspaceId: workspaceId || null,
      });
      response.status(200).json(result);
    } catch (err) {
      if (err.name === "JobCapacityError") {
        return response.status(429).json({ error: err.message, code: "JOB_CAPACITY" });
      }
      logger.error(`[research/start] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/research/list", [validApiKey], async (_, response) => {
    try {
      const pipeline = getResearchPipeline();
      const jobs = pipeline.listJobs();
      response.status(200).json({ jobs });
    } catch (err) {
      logger.error(`[research] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/research/:id", [validApiKey], async (request, response) => {
    try {
      const { id } = request.params;
      const pipeline = getResearchPipeline();
      const status = pipeline.getStatus(id);
      if (!status) return response.status(404).json({ error: "Job not found" });
      response.status(200).json(status);
    } catch (err) {
      logger.error(`[research] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/research/:id/result", [validApiKey], async (request, response) => {
    try {
      const { id } = request.params;
      const pipeline = getResearchPipeline();
      const results = pipeline.getResults(id);
      if (!results) return response.status(404).json({ error: "Job not found" });
      response.status(200).json(results);
    } catch (err) {
      logger.error(`[research] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });
}

module.exports = { apiResearchEndpoints };
