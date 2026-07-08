// SPDX-License-Identifier: MIT
// Purpose: REST endpoints for agent triggers — CRUD, toggle, list runs, replay.
// Docs: agentTriggersEndpoint.doc.md

const express = require("express");
const { AgentTriggers } = require("../models/agentTriggers");
const { triggerEngine } = require("../utils/agents/triggerEngine");
const { Workspace } = require("../models/workspace");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { simpleRateLimit } = require("../utils/middleware/simpleRateLimit");
const { reqBody } = require("../utils/http");
const consoleLogger = require("../utils/logger/console.js");

function agentTriggerEndpoints(app) {
  if (!app) return;
  const router = express.Router();

  // List triggers for a workspace
  router.get(
    "/workspace/:slug/triggers",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, res) => {
      try {
        const workspace = await Workspace.get({ slug: req.params.slug });
        if (!workspace)
          return res
            .status(404)
            .json({ success: false, error: "Workspace not found" });
        const triggers = await AgentTriggers.list(workspace.id);
        return res.json({ success: true, triggers });
      } catch (e) {
        consoleLogger.error("[triggers list]", e);
        return res
          .status(500)
          .json({ success: false, error: "Internal error" });
      }
    },
  );

  // Create a trigger
  router.post(
    "/workspace/:slug/triggers",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin]),
      simpleRateLimit({ bucket: "triggers-create", max: 20, windowMs: 60_000 }),
    ],
    async (req, res) => {
      try {
        const workspace = await Workspace.get({ slug: req.params.slug });
        if (!workspace)
          return res
            .status(404)
            .json({ success: false, error: "Workspace not found" });

        const { name, agentName, type, config } = reqBody(req);
        if (!name || !agentName || !type || !config) {
          return res.status(400).json({
            success: false,
            error: "name, agentName, type, and config are required",
          });
        }

        if (!["schedule", "polling"].includes(type)) {
          return res.status(400).json({
            success: false,
            error: "type must be 'schedule' or 'polling'",
          });
        }

        const trigger = await AgentTriggers.create({
          workspaceId: workspace.id,
          agentName,
          name,
          type,
          config,
        });
        return res.json({ success: true, trigger });
      } catch (e) {
        consoleLogger.error("[triggers create]", e);
        return res
          .status(500)
          .json({ success: false, error: "Internal error" });
      }
    },
  );

  // Update a trigger
  router.patch(
    "/workspace/:slug/triggers/:triggerId",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, res) => {
      try {
        const { triggerId } = req.params;
        const patch = reqBody(req);
        const trigger = await AgentTriggers.update(triggerId, patch);
        return res.json({ success: true, trigger });
      } catch (e) {
        consoleLogger.error("[triggers update]", e);
        return res
          .status(500)
          .json({ success: false, error: "Internal error" });
      }
    },
  );

  // Delete a trigger
  router.delete(
    "/workspace/:slug/triggers/:triggerId",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, res) => {
      try {
        await AgentTriggers.delete(req.params.triggerId);
        return res.json({ success: true });
      } catch (e) {
        consoleLogger.error("[triggers delete]", e);
        return res
          .status(500)
          .json({ success: false, error: "Internal error" });
      }
    },
  );

  // Toggle trigger active status
  router.post(
    "/workspace/:slug/triggers/:triggerId/toggle",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, res) => {
      try {
        const { active } = reqBody(req);
        const trigger = await AgentTriggers.toggle(
          req.params.triggerId,
          active,
        );
        return res.json({ success: true, trigger });
      } catch (e) {
        consoleLogger.error("[triggers toggle]", e);
        return res
          .status(500)
          .json({ success: false, error: "Internal error" });
      }
    },
  );

  // List runs for a trigger
  router.get(
    "/workspace/:slug/triggers/:triggerId/runs",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, res) => {
      try {
        const runs = await AgentTriggers.listRuns(req.params.triggerId, 50);
        return res.json({ success: true, runs });
      } catch (e) {
        consoleLogger.error("[trigger runs list]", e);
        return res
          .status(500)
          .json({ success: false, error: "Internal error" });
      }
    },
  );

  // Manually replay a failed run
  router.post(
    "/workspace/:slug/triggers/:triggerId/runs/:runId/replay",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, res) => {
      try {
        await triggerEngine.replayRun(req.params.runId);
        return res.json({ success: true });
      } catch (e) {
        consoleLogger.error("[trigger replay]", e);
        return res.status(500).json({ success: false, error: e.message });
      }
    },
  );

  // Manually fire a trigger (test)
  router.post(
    "/workspace/:slug/triggers/:triggerId/fire",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (req, res) => {
      try {
        const trigger = await AgentTriggers.get(req.params.triggerId);
        if (!trigger)
          return res
            .status(404)
            .json({ success: false, error: "Trigger not found" });
        // Fire immediately in background
        triggerEngine
          ._executeTrigger(trigger)
          .catch((e) => consoleLogger.error("[trigger fire]", e));
        return res.json({ success: true, message: "Trigger fired" });
      } catch (e) {
        consoleLogger.error("[trigger fire]", e);
        return res
          .status(500)
          .json({ success: false, error: "Internal error" });
      }
    },
  );

  app.use("/api", router);
}

module.exports = { agentTriggerEndpoints };
