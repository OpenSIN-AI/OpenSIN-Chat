// SPDX-License-Identifier: MIT
// Purpose: SSE multiplex endpoint that streams ALL agent run events for a
//          workspace to the frontend right-sidebar "Agent Sessions" panel.
//          Reconnect-safe: sends snapshot of active runs on connect.
// Docs: agentRunsStream.doc.md

const express = require("express");
const { agentRunBus } = require("../utils/agents/runBus");
const { AgentRuns } = require("../models/agentRuns");
const { Workspace } = require("../models/workspace");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { simpleRateLimit } = require("../utils/middleware/simpleRateLimit");
const { decodeJWT } = require("../utils/http");
const { SystemSettings } = require("../models/systemSettings");
const { User } = require("../models/user");
const { EncryptionManager } = require("../utils/EncryptionManager");
const { getAuthTokenHash } = require("../utils/middleware/validatedRequest");
const consoleLogger = require("../utils/logger/console.js");

const EncryptionMgr = new EncryptionManager();

/**
 * Authenticate the SSE client and return the resolved user (multi-user) so
 * workspace membership can be enforced. Returns null when unauthorized.
 * @returns {Promise<{ multiUserMode: boolean, user: object|null }|null>}
 */
async function resolveAuthorizedUser(request) {
  if (
    process.env.NODE_ENV === "test" &&
    process.env.INTEGRATION_TEST === "true"
  ) {
    return { multiUserMode: false, user: null };
  }

  const auth = request.headers.authorization;
  const token = auth ? auth.split(" ")[1] : request.query?.token;
  if (!token) return null;

  const decoded = decodeJWT(token);
  if (!decoded) return null;

  const multiUserMode = await SystemSettings.isMultiUserMode();
  if (multiUserMode) {
    if (!decoded.id) return null;
    const user = await User.get({ id: decoded.id });
    if (!user || user.suspended) return null;
    return { multiUserMode: true, user };
  }

  if (!process.env.AUTH_TOKEN) return null;

  const { p } = decoded;
  if (p === null || typeof p !== "string" || p.length < 16) return null;
  if (!/^[A-Za-z0-9+/=_-]+$/.test(p)) return null;

  const decrypted = EncryptionMgr.decrypt(p);
  if (!decrypted) return null;

  const bcrypt = require("bcryptjs");
  if (!bcrypt.compareSync(decrypted, getAuthTokenHash())) return null;
  return { multiUserMode: false, user: null };
}

/** @deprecated use resolveAuthorizedUser — kept for tests that spy on the name */
async function isAuthorizedRequest(request) {
  return (await resolveAuthorizedUser(request)) !== null;
}

function isOriginAllowed(request) {
  if (
    process.env.NODE_ENV === "test" &&
    process.env.INTEGRATION_TEST === "true"
  ) {
    return true;
  }
  const origin = request.headers.origin;
  if (!origin) return process.env.NODE_ENV !== "production";

  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    const allowed = corsOrigin
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allowed.includes("*")) return true;
    return allowed.some(
      (allowedOrigin) => origin.toLowerCase() === allowedOrigin.toLowerCase(),
    );
  }

  const host = request.headers.host;
  if (!host) return false;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host.toLowerCase();
  } catch {
    return false;
  }
}

function agentRunsStream(app) {
  if (!app) return;
  const router = express.Router();

  // GET /workspace/:slug/agent-runs/stream — SSE multiplex
  router.get(
    "/workspace/:slug/agent-runs/stream",
    [
      simpleRateLimit({
        bucket: "agent-runs-stream",
        max: 30,
        windowMs: 60 * 1000,
      }),
    ],
    async (req, res) => {
      // Auth check — resolve the user so multi-user workspace ACL can apply.
      const auth = await resolveAuthorizedUser(req);
      if (!auth) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
      if (!isOriginAllowed(req)) {
        return res
          .status(403)
          .json({ success: false, error: "Origin not allowed" });
      }

      const slug = req.params.slug;

      // Multi-user: only members of the workspace may subscribe to its agent
      // run events (prevents IDOR via known/guessable slugs).
      const workspace = auth.multiUserMode
        ? await Workspace.getWithUser(auth.user, { slug })
        : await Workspace.get({ slug });
      if (!workspace) {
        return res
          .status(404)
          .json({ success: false, error: "Workspace not found" });
      }

      // SSE headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(": connected\n\n");

      const send = (event, data) => {
        try {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch {
          // connection may have closed
        }
      };

      // 1) Snapshot: send active runs on connect (reconnect-safe)
      try {
        const active = await AgentRuns.getActive(workspace.id);
        for (const run of active) {
          send("run.started", {
            runId: run.id,
            parentRunId: run.parent_run_id,
            agentName: run.agent_name,
            model: run.model,
            status: run.status,
            ts: new Date(run.started_at).getTime(),
          });
        }
      } catch (e) {
        consoleLogger.error("[agentRunsStream] snapshot error:", e.message);
      }

      // 2) Subscribe to live events for this workspace
      const onEvent = (evt) => {
        if (evt.workspaceSlug === slug) {
          send(evt.event, evt.data);
        }
      };
      agentRunBus.on("agentrun", onEvent);

      // Keep-alive every 15s
      const keepAlive = setInterval(() => {
        try {
          res.write(": keep-alive\n\n");
        } catch (e) {
          console.warn("[agentRunsStream] non-fatal error:", e?.message || e);
        }
      }, 15000);

      // Cleanup on disconnect
      const cleanup = () => {
        clearInterval(keepAlive);
        agentRunBus.off("agentrun", onEvent);
      };
      req.on("close", cleanup);
      res.on("error", cleanup);
    },
  );

  // POST /workspace/:slug/agent-runs/:runId/cancel
  router.post(
    "/workspace/:slug/agent-runs/:runId/cancel",
    [validatedRequest],
    async (req, res) => {
      const { slug, runId } = req.params;
      const workspace = await resolveWorkspaceForRequest(req, res, slug);
      if (!workspace) {
        return res
          .status(404)
          .json({ success: false, error: "Workspace not found" });
      }
      agentRunBus.emit("cancel", { runId, workspaceId: workspace.id });
      try {
        await AgentRuns.updateStatus(runId, "cancelled");
      } catch (e) {
        console.warn("[agentRunsStream] non-fatal error:", e?.message || e);
      }
      return res.json({ success: true });
    },
  );

  // POST /workspace/:slug/agent-runs/:runId/respond
  router.post(
    "/workspace/:slug/agent-runs/:runId/respond",
    [validatedRequest],
    async (req, res) => {
      const { slug, runId } = req.params;
      const workspace = await resolveWorkspaceForRequest(req, res, slug);
      if (!workspace) {
        return res
          .status(404)
          .json({ success: false, error: "Workspace not found" });
      }
      agentRunBus.emit("respond", {
        runId,
        workspaceId: workspace.id,
        payload: req.body,
      });
      return res.json({ success: true });
    },
  );

  app.use("/api", router);
}

/**
 * Resolve a workspace for a session-authenticated request, enforcing
 * multi-user membership when applicable.
 */
async function resolveWorkspaceForRequest(req, res, slug) {
  const multiUser = !!res.locals?.multiUserMode;
  const user = res.locals?.user || null;
  if (multiUser) {
    if (!user) return null;
    return Workspace.getWithUser(user, { slug });
  }
  return Workspace.get({ slug });
}

module.exports = {
  agentRunsStream,
  isAuthorizedRequest,
  resolveAuthorizedUser,
  resolveWorkspaceForRequest,
};
