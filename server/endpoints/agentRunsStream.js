// SPDX-License-Identifier: MIT
// Purpose: SSE multiplex endpoint that streams ALL agent run events for a
//          workspace to the frontend right-sidebar "Agent Sessions" panel.
//          Reconnect-safe: sends snapshot of active runs on connect.
// Docs: agentRunsStream.doc.md

const express = require('express');
const { agentRunBus } = require('../utils/agents/runBus');
const { AgentRuns } = require('../models/agentRuns');
const { Workspace } = require('../models/workspace');
const { validatedRequest } = require('../utils/middleware/validatedRequest');
const { simpleRateLimit } = require('../utils/middleware/simpleRateLimit');
const { decodeJWT } = require('../utils/http');
const { SystemSettings } = require('../models/systemSettings');
const { User } = require('../models/user');
const { EncryptionManager } = require('../utils/EncryptionManager');
const { getAuthTokenHash } = require('../utils/middleware/validatedRequest');
const consoleLogger = require('../utils/logger/console.js');

const EncryptionMgr = new EncryptionManager();

// Reuse the same auth logic as agentSSE.js
async function isAuthorizedRequest(request) {
  if (
    process.env.NODE_ENV === 'test' &&
    process.env.INTEGRATION_TEST === 'true'
  ) {
    return true;
  }

  const auth = request.headers.authorization;
  const token = auth ? auth.split(' ')[1] : request.query?.token;
  if (!token) return false;

  const decoded = decodeJWT(token);
  if (!decoded) return false;

  const multiUserMode = await SystemSettings.isMultiUserMode();
  if (multiUserMode) {
    if (!decoded.id) return false;
    const user = await User.get({ id: decoded.id });
    if (!user || user.suspended) return false;
    return true;
  }

  if (!process.env.AUTH_TOKEN) return false;

  const { p } = decoded;
  if (p === null || typeof p !== 'string' || p.length < 16) return false;
  if (!/^[A-Za-z0-9+/=_-]+$/.test(p)) return false;

  const decrypted = EncryptionMgr.decrypt(p);
  if (!decrypted) return false;

  const bcrypt = require('bcryptjs');
  return bcrypt.compareSync(decrypted, getAuthTokenHash());
}

function isOriginAllowed(request) {
  if (
    process.env.NODE_ENV === 'test' &&
    process.env.INTEGRATION_TEST === 'true'
  ) {
    return true;
  }
  const origin = request.headers.origin;
  if (!origin) return process.env.NODE_ENV !== 'production';

  const corsOrigin = process.env.CORS_ORIGIN;
  if (corsOrigin) {
    const allowed = corsOrigin
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (allowed.includes('*')) return true;
    return allowed.some(
      (allowedOrigin) => origin.toLowerCase() === allowedOrigin.toLowerCase()
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
    '/workspace/:slug/agent-runs/stream',
    [
      simpleRateLimit({
        bucket: 'agent-runs-stream',
        max: 30,
        windowMs: 60 * 1000,
      }),
    ],
    async (req, res) => {
      // Auth check
      const authorized = await isAuthorizedRequest(req);
      if (!authorized) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      if (!isOriginAllowed(req)) {
        return res
          .status(403)
          .json({ success: false, error: 'Origin not allowed' });
      }

      const slug = req.params.slug;

      // Resolve workspace
      const workspace = await Workspace.get({ slug });
      if (!workspace) {
        return res
          .status(404)
          .json({ success: false, error: 'Workspace not found' });
      }

      // SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(': connected\n\n');

      const send = (event, data) => {
        try {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch (_e) {
          // connection may have closed
        }
      };

      // 1) Snapshot: send active runs on connect (reconnect-safe)
      try {
        const active = await AgentRuns.getActive(workspace.id);
        for (const run of active) {
          send('run.started', {
            runId: run.id,
            parentRunId: run.parent_run_id,
            agentName: run.agent_name,
            model: run.model,
            status: run.status,
            ts: new Date(run.started_at).getTime(),
          });
        }
      } catch (e) {
        consoleLogger.error('[agentRunsStream] snapshot error:', e.message);
      }

      // 2) Subscribe to live events for this workspace
      const onEvent = (evt) => {
        if (evt.workspaceSlug === slug) {
          send(evt.event, evt.data);
        }
      };
      agentRunBus.on('agentrun', onEvent);

      // Keep-alive every 15s
      const keepAlive = setInterval(() => {
        try {
          res.write(': keep-alive\n\n');
        } catch {}
      }, 15000);

      // Cleanup on disconnect
      const cleanup = () => {
        clearInterval(keepAlive);
        agentRunBus.off('agentrun', onEvent);
      };
      req.on('close', cleanup);
      res.on('error', cleanup);
    }
  );

  // POST /workspace/:slug/agent-runs/:runId/cancel
  router.post(
    '/workspace/:slug/agent-runs/:runId/cancel',
    [validatedRequest],
    async (req, res) => {
      const { runId } = req.params;
      agentRunBus.emit('cancel', { runId });
      try {
        await AgentRuns.updateStatus(runId, 'cancelled');
      } catch {}
      return res.json({ success: true });
    }
  );

  // POST /workspace/:slug/agent-runs/:runId/respond
  router.post(
    '/workspace/:slug/agent-runs/:runId/respond',
    [validatedRequest],
    async (req, res) => {
      const { runId } = req.params;
      agentRunBus.emit('respond', { runId, payload: req.body });
      return res.json({ success: true });
    }
  );

  app.use('/api', router);
}

module.exports = { agentRunsStream };
