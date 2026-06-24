// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const crypto = require("node:crypto");
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
const EncryptionMgr = new EncryptionManager();

// ── Connection safety limits ───────────────────────────────────────────────
const MAX_WS_CONNECTIONS = Number(process.env.AGENT_WS_MAX_CONNECTIONS) || 50;
const MAX_MESSAGE_BYTES =
  Number(process.env.AGENT_WS_MAX_MESSAGE_BYTES) || 10_485_760; // 10 MiB (base64 images)
const HEARTBEAT_INTERVAL_MS =
  Number(process.env.AGENT_WS_HEARTBEAT_MS) || 30_000;
const HEARTBEAT_TIMEOUT_MS = HEARTBEAT_INTERVAL_MS * 2;

// Track active connections per-process for DoS protection.
let activeConnectionCount = 0;

let _wsLock = Promise.resolve();
async function withWsLock(fn) {
  _wsLock = _wsLock.then(fn, fn);
  return _wsLock;
}

/**
 * Validate the Origin header to prevent Cross-Site WebSocket Hijacking (CSWSH).
 * In browser context the WebSocket API always sends Origin; its absence on a
 * browser-initiated connection is suspicious and we reject it.  In test mode
 * or non-browser clients (curl, server-to-server) the header may be absent
 * and we allow it when running outside production.
 */
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
    return process.env.NODE_ENV !== "production";
  }

  // Reject obviously foreign origins.  The CORS_ORIGIN env var (if set)
  // is the authoritative allow-list; otherwise fall back to same-host.
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

  // No explicit CORS_ORIGIN: allow same-host origins only.
  const host = request.headers.host;
  if (!host) return false;
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host.toLowerCase();
  } catch {
    return false;
  }
}

// Setup listener for incoming messages to relay to socket so it can be handled by agent plugin.
function relayToSocket(message) {
  try {
    if (this.handleFeedback) return this?.handleFeedback?.(message);
    if (this.handleToolApproval) return this?.handleToolApproval?.(message);
    if (this.handleClarificationResponse)
      return this?.handleClarificationResponse?.(message);
    this.checkBailCommand(message);
  } catch (e) {
    consoleLogger.error("[agentWebsocket] relayToSocket error:", e.message);
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

  const { p } = decoded;
  if (p === null || typeof p !== "string" || p.length < 16) return false;
  if (!/^[A-Za-z0-9+/=_-]+$/.test(p)) return false;

  const decrypted = EncryptionMgr.decrypt(p);
  if (!decrypted) return false;

  const bcrypt = require("bcryptjs");
  return bcrypt.compareSync(decrypted, getAuthTokenHash());
}

function agentWebsocket(app, routePrefix = "") {
  if (!app) return;
  // `@mintplex-labs/express-ws` only patches `.ws` onto objects that exist
  // (and are passed) when `expressWs(app)` runs. The main `app` always has it;
  // a plain `express.Router()` created *before` expressWs ran does NOT.
  // So this MUST be called with the main `app` (not the apiRouter), and we
  // prefix the route with `/api` so it still matches the client URL
  // `${websocketURI()}/api/agent-invocation/:uuid`.
  if (typeof app.ws !== "function") {
    consoleLogger.error(
      "[agentWebsocket] `.ws` is not available on the provided app/router — " +
        "agent WebSocket route NOT registered. Agents will fail to connect. " +
        "Ensure agentWebsocket(app) is called with the main express app after expressWs(app).",
    );
    return;
  }

  app.ws(
    `${routePrefix}/agent-invocation/:uuid`,
    async function (socket, request) {
      // ── Connection-level guards ──────────────────────────────────────────
      // CSWSH protection: validate Origin header.
      if (!isOriginAllowed(request)) {
        consoleLogger.warn(
          `[agentWebsocket] Rejecting connection from disallowed origin: ${request.headers.origin || "<missing>"}`,
        );
        socket.close(1008, "Origin not allowed");
        return;
      }

      let heartbeatInterval = null;
      let heartbeatTimeout = null;
      let isTerminated = false;

      // Heartbeat: detect dead connections that half-open TCP keeps alive.
      // The ws library auto-responds to ping with pong; we just need to
      // track whether the pong arrived before the timeout.
      const startHeartbeat = () => {
        heartbeatInterval = setInterval(() => {
          if (socket.readyState !== 1 /* OPEN */) return;
          // Clear previous pong timeout; if pong doesn't arrive in time,
          // the connection is stale and we terminate it.
          clearTimeout(heartbeatTimeout);
          heartbeatTimeout = setTimeout(() => {
            consoleLogger.warn(
              "[agentWebsocket] Heartbeat timeout — terminating stale connection.",
            );
            try {
              socket.terminate();
            } catch {
              /* already closed */
            }
          }, HEARTBEAT_TIMEOUT_MS);

          // Send a ping; the ws library fires "pong" automatically.
          try {
            socket.ping();
          } catch {
            /* socket gone */
          }
        }, HEARTBEAT_INTERVAL_MS);

        // Reset the pong-timeout whenever a pong arrives.
        socket.on("pong", () => {
          clearTimeout(heartbeatTimeout);
        });
      };

      const cleanup = () => {
        if (isTerminated) return;
        isTerminated = true;
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
        withWsLock(() => {
          if (activeConnectionCount > 0) activeConnectionCount--;
        }).catch(() => {});
      };

      try {
        if (!(await isAuthorizedRequest(request))) {
          socket.close(1008, "Unauthorized");
          return;
        }

        const agentHandler = await new AgentHandler({
          uuid: String(request.params.uuid),
        }).init();

        if (!agentHandler.invocation) {
          socket.close();
          return;
        }

        let wsRejected = false;
        await withWsLock(() => {
          if (activeConnectionCount >= MAX_WS_CONNECTIONS) {
            consoleLogger.warn(
              `[agentWebsocket] Rejecting connection: ${activeConnectionCount}/${MAX_WS_CONNECTIONS} slots in use.`,
            );
            try {
              socket.close(1013, "Maximum concurrent connections reached");
            } catch {
              /* socket gone */
            }
            wsRejected = true;
            return;
          }
          activeConnectionCount++;
        });
        if (wsRejected) return;

        startHeartbeat();

        socket.on("message", (data, isBinary) => {
          // Message size limit: prevent OOM via oversized payloads.
          if (isBinary) return; // We only accept text frames.
          const size =
            typeof data === "string" ? Buffer.byteLength(data) : data.length;
          if (size > MAX_MESSAGE_BYTES) {
            consoleLogger.warn(
              `[agentWebsocket] Message rejected: ${size} bytes exceeds ${MAX_MESSAGE_BYTES} byte limit.`,
            );
            try {
              socket.send(
                JSON.stringify({
                  type: "wssFailure",
                  content: "Message exceeds maximum allowed size.",
                  id: crypto.randomUUID(),
                }),
              );
            } catch {
              /* socket gone */
            }
            return;
          }
          relayToSocket.call(socket, data.toString());
        });

        socket.on("close", () => {
          cleanup();
          agentHandler.closeAlert();
          // Abort the agent cluster so it stops consuming LLM tokens and
          // releases resources immediately on client disconnect.
          try {
            if (agentHandler.aibitat) {
              agentHandler.aibitat.abort();
            }
          } catch (e) {
            consoleLogger.error(
              "[agentWebsocket] Error aborting agent on close:",
              e.message,
            );
          }
          WorkspaceAgentInvocation.close(String(request.params.uuid));
          return;
        });

        socket.on("error", (error) => {
          consoleLogger.error(
            "[agentWebsocket] Socket error:",
            error?.message || error,
          );
          cleanup();
          try {
            if (agentHandler.aibitat) agentHandler.aibitat.abort();
          } catch {
            /* already cleaned up */
          }
        });

        socket.checkBailCommand = (data) => {
          const content = safeJsonParse(data)?.feedback;
          if (WEBSOCKET_BAIL_COMMANDS.includes(content)) {
            agentHandler.log(
              `User invoked bail command while processing. Closing session now.`,
            );
            try {
              agentHandler.aibitat.abort();
            } catch {
              /* already aborted */
            }
            socket.close();
            return;
          }
        };

        await Telemetry.sendTelemetry("agent_chat_started");
        await agentHandler.createAIbitat({ socket });
        await agentHandler.startAgentCluster();
      } catch (e) {
        const id = crypto.randomUUID();

        consoleLogger.error(`[wss error id=${id}]`, e);
        cleanup();

        // If the invocation is already closed (e.g. reconnection to a
        // disconnected session), close with 1008 so the frontend knows
        // this is permanent and does not attempt reconnection.
        if (e?.message?.includes("already closed")) {
          try {
            socket.send(
              JSON.stringify({
                type: "wssFailure",
                content: "Agent session has ended.",
                id,
              }),
            );
          } catch {
            /* socket already gone */
          }
          try {
            socket.close(1008, "Session ended");
          } catch {
            /* socket already gone */
          }
          return;
        }

        // Surface a clear, non-secret setup message so the frontend does not
        // show the generic "Internal error" on every agent chat attempt when the
        // provider/API key is missing or misconfigured. The full error is still
        // logged server-side with the id above.
        const content =
          e?.message?.includes("No valid provider") ||
          e?.message?.includes("No LLM provider") ||
          e?.message?.includes("API key") ||
          e?.message?.includes("base path")
            ? "Agent setup failed: please check the workspace provider and API key configuration."
            : "Internal error";
        try {
          if (socket)
            socket.send(
              JSON.stringify({
                type: "wssFailure",
                content,
                id,
              }),
            );
        } catch {
          /* socket already gone */
        }
        socket?.close();
      }
    },
  );
}

module.exports = { agentWebsocket };
