// SPDX-License-Identifier: MIT
// Purpose: REST endpoint for manual subagent spawning + listing subagent tree.
//          Allows the frontend or API clients to spawn subagents and
//          query the run tree for a given parent run.
// Docs: subagentEndpoint.doc.md

const express = require("express");
const { subagentSpawner } = require("../utils/agents/subagentSpawner");
const { AgentRuns } = require("../models/agentRuns");
const { Workspace } = require("../models/workspace");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { reqBody } = require("../utils/http");
const consoleLogger = require("../utils/logger/console.js");

function subagentEndpoints(app) {
  if (!app) return;
  const router = express.Router();

  // POST /workspace/:slug/agent-runs/:runId/spawn — spawn a subagent under a parent run
  router.post(
    "/workspace/:slug/agent-runs/:runId/spawn",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, res) => {
      try {
        const { slug, runId } = req.params;
        const { agentName, prompt, model } = reqBody(req);

        if (!agentName || !prompt) {
          return res.status(400).json({
            success: false,
            error: "agentName and prompt are required",
          });
        }

        const workspace = await Workspace.get({ slug });
        if (!workspace) {
          return res
            .status(404)
            .json({ success: false, error: "Workspace not found" });
        }

        // Spawn in background — return immediately
        const spawnPromise = subagentSpawner.spawn({
          parentRunId: runId,
          workspaceId: workspace.id,
          workspaceSlug: slug,
          agentName,
          prompt,
          model: model || null,
        });

        // Don't await — let it run in background, frontend sees it via SSE
        res.json({
          success: true,
          message: "Subagent spawning",
          parentRunId: runId,
        });

        // Handle the promise in background
        spawnPromise.catch((e) =>
          consoleLogger.error(`[subagent spawn] ${e.message}`),
        );
      } catch (e) {
        consoleLogger.error("[subagent spawn]", e);
        return res.status(500).json({ success: false, error: "Internal error" });
      }
    },
  );

  // GET /workspace/:slug/agent-runs/:runId/tree — get run tree for a parent run
  router.get(
    "/workspace/:slug/agent-runs/:runId/tree",
    [validatedRequest],
    async (req, res) => {
      try {
        const { runId } = req.params;
        // Get the parent run + all descendants
        const tree = await AgentRuns.getRunTree(runId);
        return res.json({ success: true, tree });
      } catch (e) {
        consoleLogger.error("[subagent tree]", e);
        return res.status(500).json({ success: false, error: "Internal error" });
      }
    },
  );

  app.use("/api", router);
}

module.exports = { subagentEndpoints };
