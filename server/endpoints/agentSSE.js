// SPDX-License-Identifier: MIT
const crypto = require("node:crypto");
const express = require("express");
const consoleLogger = require("../utils/logger/console.js");
const { Telemetry } = require("../models/telemetry");
const {
  WorkspaceAgentInvocation,
} = require("../models/workspaceAgentInvocation");
const { AgentHandler } = require("../utils/agents");
const {
  WEBSOCKET_BAIL_COMMANDS,
} = require("../utils/agents/aibitat/plugins/websocket");
const { safeJsonParse, decodeJWT } = require("../utils/http");
const { SystemSettings } = require("../models/systemSettings");
const { User } = require("../models/user");
const { EncryptionManager } = require("../utils/EncryptionManager");
const { getAuthTokenHash } = require("../utils/middleware/validatedRequest");
const { simpleRateLimit } = require("../utils/middleware/simpleRateLimit");
const EncryptionMgr = new EncryptionManager();

const MAX_SSE_CONNECTIONS = Number(process.env.AGENT_WS_MAX_CONNECTIONS) || 50;
const MAX_MESSAGE_BYTES =
  Number(process.env.AGENT_WS_MAX_MESSAGE_BYTES) || 10_485_760;

let activeConnectionCount = 0;
const activeSSESockets = new Map();

function isOriginAllowed(request) {
  if (
    process.env.NODE_ENV === "test" &&
    process.env.INTEGRATION_TEST === "true"
  ) {
    return true;
  }

  const origin = request.headers.origin;
  if (!origin) {
    // Non-browser clients (Node, curl) don't send Origin — allow in
    // development, reject in production for defence-in-depth.
    // This matches the pattern in agentWebsocket.js isOriginAllowed().
    return process.env.NODE_ENV !== "production";
  }

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

async function isAuthorizedRequest(request) {
  if (
    process.env.NODE_ENV === "test" &&
    process.env.INTEGRATION_TEST === "true"
  ) {
    return true;
  }

  const auth = request.headers.authorization;
  const token = auth ? auth.split(" ")[1] : request.query?.token;
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

  if (!process.env.AUTH_TOKEN) return true;

  const { p } = decoded;
  if (p === null || typeof p !== "string" || p.length < 16) return false;
  if (!/^[A-Za-z0-9+/=_-]+$/.test(p)) return false;

  const decrypted = EncryptionMgr.decrypt(p);
  if (!decrypted) return false;

  const bcrypt = require("bcryptjs");
  return bcrypt.compareSync(decrypted, getAuthTokenHash());
}

function relayToSocket(message) {
  try {
    if (this.handleFeedback) return this?.handleFeedback?.(message);
    if (this.handleToolApproval) return this?.handleToolApproval?.(message);
    if (this.handleClarificationResponse)
      return this?.handleClarificationResponse?.(message);
    this.checkBailCommand(message);
  } catch (e) {
    consoleLogger.error("[agentSSE] relayToSocket error:", e.message);
  }
}

function createSSESocket(res) {
  const listeners = { close: [], message: [] };
  let isClosed = false;

  const socket = {
    readyState: 1,
    supportsAgentStreaming: false,

    send(data) {
      if (isClosed || res.writableEnded) return;
      res.write(`data: ${data}\n\n`);
    },

    close(code, reason) {
      if (isClosed) return;
      isClosed = true;
      this.readyState = 3;
      try {
        if (!res.writableEnded) {
          if (code) {
            res.write(
              `event: close\ndata: ${JSON.stringify({ code, reason: reason || "" })}\n\n`,
            );
          }
          res.end();
        }
      } catch {}
      this._emit("close");
    },

    terminate() {
      if (isClosed) return;
      isClosed = true;
      this.readyState = 3;
      try {
        if (!res.writableEnded) res.end();
      } catch {}
      this._emit("close");
    },

    ping() {},

    on(event, handler) {
      if (listeners[event]) listeners[event].push(handler);
    },

    _emit(event, ...args) {
      (listeners[event] || []).forEach((fn) => fn(...args));
    },

    _onMessage(data) {
      this._emit("message", Buffer.from(data), false);
    },
  };

  return socket;
}

function agentSSE(app, routePrefix = "") {
  if (!app) return;
  const router = express.Router();

  router.get(
    "/agent/:uuid",
    [
      simpleRateLimit({
        bucket: "agent-sse-connect",
        max: 30,
        windowMs: 60 * 1000,
      }),
    ],
    async (req, res) => {
    if (!isOriginAllowed(req)) {
      consoleLogger.warn(
        `[agentSSE] Rejecting connection from disallowed origin: ${req.headers.origin || "<missing>"}`,
      );
      res.status(403).end();
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write("\n");

    if (!(await isAuthorizedRequest(req))) {
      res.write(
        `data: ${JSON.stringify({ type: "wssFailure", content: "Unauthorized", id: crypto.randomUUID() })}\n\n`,
      );
      res.end();
      return;
    }

    if (activeConnectionCount >= MAX_SSE_CONNECTIONS) {
      consoleLogger.warn(
        `[agentSSE] Rejecting connection: ${activeConnectionCount}/${MAX_SSE_CONNECTIONS} slots in use.`,
      );
      res.write(
        `data: ${JSON.stringify({ type: "wssFailure", content: "Maximum concurrent connections reached", id: crypto.randomUUID() })}\n\n`,
      );
      res.end();
      return;
    }
    activeConnectionCount++;

    const uuid = String(req.params.uuid);
    const socket = createSSESocket(res);
    activeSSESockets.set(uuid, socket);

    let isTerminated = false;

    const cleanup = () => {
      if (isTerminated) return;
      isTerminated = true;
      activeSSESockets.delete(uuid);
      if (activeConnectionCount > 0) activeConnectionCount--;
    };

    let agentHandler = null;

    req.on("close", () => {
      socket._emit("close");
      cleanup();
      if (agentHandler) {
        agentHandler.closeAlert();
        try {
          if (agentHandler.aibitat) agentHandler.aibitat.abort();
        } catch (e) {
          consoleLogger.error(
            "[agentSSE] Error aborting agent on close:",
            e.message,
          );
        }
      }
      WorkspaceAgentInvocation.close(uuid);
    });

    try {
      agentHandler = await new AgentHandler({ uuid }).init();

      if (!agentHandler.invocation) {
        socket.close();
        return;
      }

      socket.checkBailCommand = (data) => {
        const content = safeJsonParse(data)?.feedback;
        if (WEBSOCKET_BAIL_COMMANDS.includes(content)) {
          agentHandler.log(
            `User invoked bail command while processing. Closing session now.`,
          );
          try {
            agentHandler.aibitat.abort();
          } catch {}
          socket.close();
          return;
        }
      };

      socket.on("message", (data, isBinary) => {
        if (isBinary) return;
        const size =
          typeof data === "string" ? Buffer.byteLength(data) : data.length;
        if (size > MAX_MESSAGE_BYTES) {
          consoleLogger.warn(
            `[agentSSE] Message rejected: ${size} bytes exceeds ${MAX_MESSAGE_BYTES} byte limit.`,
          );
          try {
            socket.send(
              JSON.stringify({
                type: "wssFailure",
                content: "Message exceeds maximum allowed size.",
                id: crypto.randomUUID(),
              }),
            );
          } catch {}
          return;
        }
        relayToSocket.call(socket, data.toString());
      });

      await Telemetry.sendTelemetry("agent_chat_started");
      await agentHandler.createAIbitat({ socket });
      await agentHandler.startAgentCluster();
    } catch (e) {
      const id = crypto.randomUUID();
      consoleLogger.error(`[agentSSE error id=${id}]`, e);
      cleanup();

      if (e?.message?.includes("already closed")) {
        try {
          socket.send(
            JSON.stringify({
              type: "wssFailure",
              content: "Agent session has ended.",
              id,
            }),
          );
        } catch {}
        try {
          socket.close(1008, "Session ended");
        } catch {}
        return;
      }

      const content =
        e?.message?.includes("No valid provider") ||
        e?.message?.includes("No LLM provider") ||
        e?.message?.includes("API key") ||
        e?.message?.includes("base path")
          ? "Agent setup failed: please check the workspace provider and API key configuration."
          : "Internal error";
      try {
        socket.send(
          JSON.stringify({
            type: "wssFailure",
            content,
            id,
          }),
        );
      } catch {}
      try {
        socket.close();
      } catch {}
    }
  });

  router.post(
    "/agent/:uuid/message",
    [
      simpleRateLimit({
        bucket: "agent-sse-message",
        max: 60,
        windowMs: 60 * 1000,
      }),
    ],
    async (req, res) => {
    if (!(await isAuthorizedRequest(req))) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const uuid = String(req.params.uuid);
    const socket = activeSSESockets.get(uuid);
    if (!socket) {
      return res
        .status(404)
        .json({ error: "No active SSE connection for this UUID" });
    }

    let message;
    if (typeof req.body === "string") {
      message = req.body;
    } else if (req.body && typeof req.body === "object") {
      message = JSON.stringify(req.body);
    } else {
      return res.status(400).json({ error: "Empty message body" });
    }

    const size = Buffer.byteLength(message);
    if (size > MAX_MESSAGE_BYTES) {
      return res
        .status(413)
        .json({ error: "Message exceeds maximum allowed size" });
    }

    socket._onMessage(message);
    return res.status(200).json({ ok: true });
  });

  app.use(`${routePrefix}/sse`, router);
}

module.exports = { agentSSE };
