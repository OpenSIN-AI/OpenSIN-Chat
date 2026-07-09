// SPDX-License-Identifier: MIT
/**
 * Integration tests for agentWebsocket.js error paths (Issue #372).
 *
 * agentWebsocket.js had zero test coverage. It mirrors the same
 * duplication/error-path shape as agentSSE.js and chat.js's pre-refactor
 * streamHandler (#369/#371): connection guards, CSWSH origin checks, auth,
 * AgentHandler lifecycle, and a catch-all error handler mapping known
 * failure messages to friendly WebSocket payloads while logging a
 * correlation id server-side.
 *
 * These tests boot a real HTTP server with `@mintplex-labs/express-ws`
 * (the same library production uses) and connect with a real `ws` client,
 * so the actual route registration and dispatch logic is exercised end to
 * end.
 */

process.env.NODE_ENV = "test";
process.env.INTEGRATION_TEST = "true";
// Keep the connection cap small so the "max connections" test below opens
// a handful of sockets instead of the production default of 50.
process.env.AGENT_WS_MAX_CONNECTIONS = "5";

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));
jest.mock("../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: jest.fn(() => Promise.resolve()) },
}));
jest.mock("../../models/workspaceAgentInvocation", () => ({
  WorkspaceAgentInvocation: { close: jest.fn() },
}));
jest.mock("../../utils/agents/aibitat/plugins/websocket", () => ({
  WEBSOCKET_BAIL_COMMANDS: ["exit", "stop"],
}));
jest.mock("../../models/systemSettings", () => ({
  SystemSettings: { isMultiUserMode: jest.fn(() => Promise.resolve(false)) },
}));
jest.mock("../../models/user", () => ({ User: { get: jest.fn() } }));
jest.mock("../../utils/EncryptionManager", () => ({
  EncryptionManager: jest.fn().mockImplementation(() => ({
    decrypt: jest.fn((v) => v),
  })),
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  getAuthTokenHash: jest.fn(() => "hash"),
}));

const AgentHandlerMock = { init: jest.fn() };
jest.mock("../../utils/agents", () => ({
  AgentHandler: jest.fn().mockImplementation(() => AgentHandlerMock),
}));

const express = require("express");
const http = require("node:http");
const WebSocket = require("ws");
const expressWs = require("@mintplex-labs/express-ws").default;
const { agentWebsocket, _resetForTest } = require("../../endpoints/agentWebsocket");
const {
  WorkspaceAgentInvocation,
} = require("../../models/workspaceAgentInvocation");

/** Waits for the next JSON message on a ws client, with a safety timeout. */
function nextMessage(ws, { timeoutMs = 3000 } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("nextMessage: timed out waiting for a message")),
      timeoutMs,
    );
    ws.once("message", (data) => {
      clearTimeout(timer);
      resolve(JSON.parse(data.toString()));
    });
    ws.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Waits for the socket 'close' event, resolving with (code, reason). */
function nextClose(ws, { timeoutMs = 3000 } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("nextClose: timed out waiting for close")),
      timeoutMs,
    );
    ws.once("close", (code, reason) => {
      clearTimeout(timer);
      resolve({ code, reason: reason?.toString() || "" });
    });
  });
}

describe("agentWebsocket — error paths", () => {
  let server;
  let baseUrl;
  let getWss;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset module-level connection counter so the previous test's sockets
    // don't bleed into this test and cause spurious 1013 over-capacity rejections.
    _resetForTest();
    const app = express();
    // expressWs must be bound to the *same* http.Server instance we listen
    // on — passing no server makes it create an internal one that never
    // receives our upgrade requests (mirrors the real boot order in
    // utils/boot/index.js, which always passes the real server).
    server = http.createServer(app);
    ({ getWss } = expressWs(app, server));
    agentWebsocket(app, "");
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `ws://127.0.0.1:${server.address().port}`;
  });

  afterEach(async () => {
    // Upgraded WebSocket sockets are not reliably released by
    // server.closeAllConnections() — the `ws` library manages them
    // separately once the HTTP upgrade completes. Terminate every
    // server-side client explicitly first, otherwise server.close()'s
    // callback never fires and the test hangs until Jest's per-test
    // timeout (exactly the kind of leak tracked in #373).
    getWss()
      .clients.forEach((client) => client.terminate());
    await new Promise((r) => setTimeout(r, 20));
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  it("maps a missing-provider AgentHandler failure to a friendly setup message", async () => {
    AgentHandlerMock.init.mockRejectedValue(
      new Error("No valid provider configured for this workspace"),
    );
    const ws = new WebSocket(`${baseUrl}/agent-invocation/uuid-1`);
    const payload = await nextMessage(ws);

    expect(payload.type).toBe("wssFailure");
    expect(payload.content).toMatch(/provider and API key configuration/i);
    expect(typeof payload.id).toBe("string");
    ws.terminate();
  });

  it("maps an unrecognized AgentHandler failure to a generic Internal error (no leak)", async () => {
    AgentHandlerMock.init.mockRejectedValue(
      new Error("ENOENT: /very/internal/secret/path.db"),
    );
    const ws = new WebSocket(`${baseUrl}/agent-invocation/uuid-2`);
    const payload = await nextMessage(ws);

    expect(payload.content).toBe("Internal error");
    expect(payload.content).not.toMatch(/ENOENT|secret\/path/);
    ws.terminate();
  });

  it("treats an 'already closed' invocation as permanent and closes with code 1008", async () => {
    AgentHandlerMock.init.mockRejectedValue(
      new Error("Invocation is already closed"),
    );
    const ws = new WebSocket(`${baseUrl}/agent-invocation/uuid-3`);
    const payload = await nextMessage(ws);
    expect(payload.content).toBe("Agent session has ended.");

    const closeEvent = await nextClose(ws);
    expect(closeEvent.code).toBe(1008);
  });

  it("gives every error payload a stable correlation id distinct per connection", async () => {
    AgentHandlerMock.init.mockRejectedValue(new Error("boom"));
    const ws1 = new WebSocket(`${baseUrl}/agent-invocation/uuid-a`);
    const ws2 = new WebSocket(`${baseUrl}/agent-invocation/uuid-b`);
    const [p1, p2] = await Promise.all([nextMessage(ws1), nextMessage(ws2)]);

    expect(p1.id).not.toBe(p2.id);
    ws1.terminate();
    ws2.terminate();
  });

  it("rejects connections once MAX_WS_CONNECTIONS concurrent slots are in use", async () => {
    // The connection-count guard increments *after* AgentHandler.init()
    // resolves (see agentWebsocket.js), so init() must resolve quickly and
    // a later lifecycle step must hang — otherwise no slot is ever counted
    // as occupied.
    AgentHandlerMock.init.mockResolvedValue({
      invocation: { id: "inv-fill" },
      closeAlert: jest.fn(),
      createAIbitat: jest.fn(() => new Promise(() => {})), // never resolves
      startAgentCluster: jest.fn(() => new Promise(() => {})),
      aibitat: { abort: jest.fn() },
      log: jest.fn(),
    });

    const max = Number(process.env.AGENT_WS_MAX_CONNECTIONS);
    const sockets = Array.from(
      { length: max },
      (_, i) => new WebSocket(`${baseUrl}/agent-invocation/fill-${i}`),
    );
    try {
      await Promise.all(
        sockets.map(
          (ws) =>
            new Promise((resolve, reject) => {
              ws.once("open", resolve);
              ws.once("error", reject);
            }),
        ),
      );
      // Give the post-open, post-init slot-increment logic a moment to run
      // for every socket before we attempt the overflow connection.
      await new Promise((r) => setTimeout(r, 200));

      const overflow = new WebSocket(`${baseUrl}/agent-invocation/overflow`);
      const closeEvent = await nextClose(overflow);
      expect(closeEvent.code).toBe(1013);
      expect(closeEvent.reason).toMatch(/maximum concurrent/i);
    } finally {
      sockets.forEach((s) => s.terminate());
      // Force-terminate the server-side socket objects too (not just the
      // client side) and give the "close" cleanup() handlers time to
      // decrement activeConnectionCount before the next test runs —
      // otherwise the module-level counter leaks into it and every
      // subsequent connection gets wrongly rejected as over-capacity.
      getWss().clients.forEach((c) => c.terminate());
      await new Promise((r) => setTimeout(r, 300));
    }
  }, 15000);

  it("closes the invocation via WorkspaceAgentInvocation.close when the client disconnects", async () => {
    AgentHandlerMock.init.mockResolvedValue({
      invocation: { id: "inv-1" },
      closeAlert: jest.fn(),
      createAIbitat: jest.fn(() => new Promise(() => {})), // never resolves
      startAgentCluster: jest.fn(() => new Promise(() => {})),
      aibitat: { abort: jest.fn() },
      log: jest.fn(),
    });

    const ws = new WebSocket(`${baseUrl}/agent-invocation/uuid-disconnect`);
    await new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });
    // The initial "Verbindung hergestellt..." status message confirms the
    // handler reached the post-auth/post-init code path before we disconnect.
    await nextMessage(ws);

    ws.terminate();
    await new Promise((r) => setTimeout(r, 150));

    expect(WorkspaceAgentInvocation.close).toHaveBeenCalledWith(
      "uuid-disconnect",
    );
  });

  it("closes with code 1008 when the connection Origin header is disallowed", async () => {
    // isOriginAllowed() checks the real Origin/CORS_ORIGIN/host logic only
    // when NOT running under the INTEGRATION_TEST bypass (that flag also
    // short-circuits auth, which every other test in this file relies on).
    // Temporarily disable it for this one request so the production origin
    // check actually executes; the origin check runs unconditionally before
    // auth, so a disallowed origin is rejected before auth is ever reached.
    const previous = process.env.INTEGRATION_TEST;
    process.env.INTEGRATION_TEST = "false";
    try {
      const ws = new WebSocket(`${baseUrl}/agent-invocation/uuid-origin`, {
        headers: { Origin: "https://evil.example.com" },
      });
      const closeEvent = await nextClose(ws);
      expect(closeEvent.code).toBe(1008);
      expect(closeEvent.reason).toMatch(/origin/i);
    } finally {
      process.env.INTEGRATION_TEST = previous;
    }
  });
});
