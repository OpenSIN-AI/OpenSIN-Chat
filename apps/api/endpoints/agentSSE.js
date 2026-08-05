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
    // Browsers omit the Origin header on same-origin safe GET requests, and
    // the SSE stream is a fetch/EventSource GET — so real same-origin browser
    // traffic legitimately arrives with no Origin. Distinguish it from
    // cross-site/non-browser callers via Sec-Fetch-Site (a forbidden header
    // that scripts cannot spoof), falling back to a Referer-host match.
    const secFetchSite = request.headers["sec-fetch-site"];
    if (secFetchSite) {
      return (
        secFetchSite === "same-origin" ||
        secFetchSite === "same-site" ||
        secFetchSite === "none"
      );
    }
    const referer = request.headers.referer;
    const refHost = request.headers.host;
    if (referer && refHost) {
      try {
        return new URL(referer).host === refHost.toLowerCase();
      } catch {
        return false;
      }
    }
    // Non-browser clients (Node, curl) don't send Origin — allow in
    // development, reject in production for defence-in-depth.
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

  if (!process.env.AUTH_TOKEN) return false;

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
      } catch (e) {
        console.warn("[agentSSE] non-fatal error:", e?.message || e);
      }
      this._emit("close");
    },

    terminate() {
      if (isClosed) return;
      isClosed = true;
      this.readyState = 3;
      try {
        if (!res.writableEnded) res.end();
      } catch (e) {
        console.warn("[agentSSE] non-fatal error:", e?.message || e);
      }
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

      // Capture route params before the first await. This avoids relying on
      // mutable router state after asynchronous authorization completes.
      const uuid = String(req.params.uuid);
      let responseClosed = false;
      let connectionRegistered = false;
      let isTerminated = false;
      let agentHandler = null;
      let socket = null;

      const cleanup = () => {
        if (isTerminated) return;
        isTerminated = true;
        activeSSESockets.delete(uuid);
        if (connectionRegistered && activeConnectionCount > 0) {
          activeConnectionCount--;
        }
      };

      // The SSE response is the long-lived object. IncomingMessage "close"
      // can fire once the request itself is complete, before the stream ends.
      res.on("close", () => {
        responseClosed = true;
        if (!connectionRegistered || !socket) return;

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

      // A client can disconnect while authorization is pending. Do not create
      // a registry entry after the response has already gone away.
      if (responseClosed || res.destroyed || res.writableEnded) return;

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

      socket = createSSESocket(res);
      activeSSESockets.set(uuid, socket);
      connectionRegistered = true;

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
            } catch (e) {
              console.warn("[agentSSE] non-fatal error:", e?.message || e);
            }
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
            } catch (e) {
              console.warn("[agentSSE] non-fatal error:", e?.message || e);
            }
            return;
          }
          relayToSocket.call(socket, data.toString());
        });

        await Telemetry.sendTelemetry("agent_chat_started");
        await agentHandler.createAIbitat({ socket });
        await agentHandler.startAgentCluster();
      } catch (e) {
        const id = crypto.randomUUID();
        cleanup();

        if (e?.message?.includes("already closed")) {
          // Expected condition: the client (browser EventSource) reconnected or
          // navigated away and the invocation was already closed. The session
          // has already reached its terminal state (a successful deep-research
          // result was streamed and the invocation completed). This is a normal
          // lifecycle condition, NOT an error — do NOT emit a wssFailure error
          // payload (which the UI renders as a false "Konnte nicht auf die
          // Nachricht antworten / Agent session has ended." appended after the
          // result). Close cleanly with code 1000 so the client finalizes the
          // already-held result without surfacing a failure banner. Log quietly
          // at debug level instead of spamming ERROR on every reconnect attempt.
          consoleLogger.debug?.(
            `[agentSSE id=${id}] invocation already closed (client reconnect); ignoring.`,
          );
          try {
            socket.close(1000, "Session completed");
          } catch (e) {
            console.warn("[agentSSE] non-fatal error:", e?.message || e);
          }
          return;
        }

        // Genuine, unexpected failure — log at ERROR with the stack trace.
        consoleLogger.error(`[agentSSE error id=${id}]`, e);

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
        } catch (e) {
          console.warn("[agentSSE] non-fatal error:", e?.message || e);
        }
        try {
          socket.close();
        } catch (e) {
          console.warn("[agentSSE] non-fatal error:", e?.message || e);
        }
      }
    },
  );

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
      const uuid = String(req.params.uuid);
      if (!(await isAuthorizedRequest(req))) {
        return res.status(401).json({ error: "Unauthorized" });
      }

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
    },
  );

  app.use(`${routePrefix}/sse`, router);
}

/**
 * Reset module-level connection state between integration tests. This is
 * intentionally exported only as a test hook; production callers never use it.
 */
function _resetForTest() {
  for (const socket of activeSSESockets.values()) {
    try {
      socket.terminate();
    } catch {
      /* already closed */
    }
  }
  activeSSESockets.clear();
  activeConnectionCount = 0;
}

module.exports = { agentSSE, isOriginAllowed, _resetForTest };
