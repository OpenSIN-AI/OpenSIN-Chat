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

function getResearchPipeline() {
  const { getResearchPipeline } = require("../../../utils/research");
  return getResearchPipeline();
}

function apiResearchEndpoints(app) {
  if (!app) return;

  app.post("/research/start", [validApiKey], async (request, response) => {
    try {
      const { query, depth, sources, workspaceId } = request.body;
      if (!query) return response.status(400).json({ error: "query is required" });

      const pipeline = getResearchPipeline();
      const result = await pipeline.startResearch({
        query,
        depth: depth || "quick",
        sources: sources || ["web", "politician"],
        workspaceId: workspaceId || null,
      });
      response.status(200).json(result);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err.message, err);
      response.status(500).json({ error: err.message });
    }
  });

  app.get("/research/list", [validApiKey], async (_, response) => {
    try {
      const pipeline = getResearchPipeline();
      const jobs = pipeline.listJobs();
      response.status(200).json({ jobs });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err.message, err);
      response.sendStatus(500).end();
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
      // eslint-disable-next-line no-console
      console.error(err.message, err);
      response.sendStatus(500).end();
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
      // eslint-disable-next-line no-console
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });
}

module.exports = { apiResearchEndpoints };
