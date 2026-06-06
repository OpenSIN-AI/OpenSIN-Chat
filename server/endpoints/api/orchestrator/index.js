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

function getOrchestrator() {
  const { getOrchestrator } = require("../../../utils/orchestrator");
  return getOrchestrator();
}

function apiOrchestratorEndpoints(app) {
  if (!app) return;

  app.post("/orchestrator/start", [validApiKey], async (request, response) => {
    try {
      const { goal, steps, options } = request.body;
      if (!goal) return response.status(400).json({ error: "goal is required" });
      const orchestrator = getOrchestrator();
      const result = await orchestrator.startWorkflow({ goal, steps, options });
      response.status(200).json(result);
    } catch (err) {
      console.error(err.message, err);
      response.status(500).json({ error: err.message });
    }
  });

  app.get("/orchestrator/list", [validApiKey], async (_, response) => {
    try {
      const orchestrator = getOrchestrator();
      const workflows = orchestrator.listWorkflows();
      response.status(200).json({ workflows });
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });

  app.get("/orchestrator/:id", [validApiKey], async (request, response) => {
    try {
      const orchestrator = getOrchestrator();
      const status = orchestrator.getStatus(request.params.id);
      if (!status) return response.status(404).json({ error: "Workflow not found" });
      response.status(200).json(status);
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });

  app.get("/orchestrator/:id/result", [validApiKey], async (request, response) => {
    try {
      const orchestrator = getOrchestrator();
      const results = orchestrator.getResults(request.params.id);
      if (!results) return response.status(404).json({ error: "Workflow not found" });
      response.status(200).json(results);
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });
}

module.exports = { apiOrchestratorEndpoints };
