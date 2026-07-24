// SPDX-License-Identifier: MIT
/**
 * Orchestrator REST API endpoints.
 *
 * Docs: index.doc.md
 * Purpose: Goal-driven multi-step workflows via REST API.
 *
 * Endpoints:
 *   POST /orchestrator/start  — start a workflow
 *   GET  /orchestrator/:id    — get workflow status
 *   GET  /orchestrator/:id/result — get workflow results
 *   GET  /orchestrator/list   — list all workflows
 */

const { validApiKey } = require("../../../utils/middleware/validApiKey");
const {
  simpleRateLimit,
} = require("../../../utils/middleware/simpleRateLimit");
const logger = require("../../../utils/logger")();

const startRateLimit = simpleRateLimit({
  bucket: "orchestrator-start",
  max: 5,
  windowMs: 60 * 1000,
});

const MAX_GOAL_LENGTH = 2000;

function getOrchestrator() {
  const { getOrchestrator } = require("../../../utils/orchestrator");
  return getOrchestrator();
}

function apiOrchestratorEndpoints(app) {
  if (!app) return;

  app.post(
    "/orchestrator/start",
    [startRateLimit, validApiKey],
    async (request, response) => {
      try {
        const { goal, steps, options } = request.body || {};

        const errors = [];
        if (typeof goal !== "string" || !goal.trim())
          errors.push("goal is required and must be a non-empty string");
        else if (goal.length > MAX_GOAL_LENGTH)
          errors.push(`goal must be ${MAX_GOAL_LENGTH} characters or fewer`);
        if (steps !== undefined && !Array.isArray(steps))
          errors.push("steps must be an array");
        if (
          options !== undefined &&
          (typeof options !== "object" ||
            options === null ||
            Array.isArray(options))
        )
          errors.push("options must be an object");
        if (errors.length)
          return response.status(400).json({ error: errors.join("; ") });

        const orchestrator = getOrchestrator();
        const result = await orchestrator.startWorkflow({
          goal,
          steps,
          options,
        });
        response.status(200).json(result);
      } catch (err) {
        if (err.name === "JobCapacityError") {
          return response
            .status(429)
            .json({ error: err.message, code: "JOB_CAPACITY" });
        }
        logger.error(`[orchestrator/start] ${err.message}`, err);
        response.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get("/orchestrator/list", [validApiKey], async (_, response) => {
    try {
      const orchestrator = getOrchestrator();
      const workflows = orchestrator.listWorkflows();
      response.status(200).json({ workflows });
    } catch (err) {
      logger.error(`[orchestrator] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/orchestrator/:id", [validApiKey], async (request, response) => {
    try {
      const orchestrator = getOrchestrator();
      const status = orchestrator.getStatus(request.params.id);
      if (!status)
        return response.status(404).json({ error: "Workflow not found" });
      response.status(200).json(status);
    } catch (err) {
      logger.error(`[orchestrator] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get(
    "/orchestrator/:id/result",
    [validApiKey],
    async (request, response) => {
      try {
        const orchestrator = getOrchestrator();
        const results = orchestrator.getResults(request.params.id);
        if (!results)
          return response.status(404).json({ error: "Workflow not found" });
        response.status(200).json(results);
      } catch (err) {
        logger.error(`[orchestrator] ${err.message}`, err);
        response.status(500).json({ error: "Internal Server Error" });
      }
    },
  );
}

module.exports = { apiOrchestratorEndpoints };
