// SPDX-License-Identifier: MIT
/**
 * Integration tests for agentSSE.js error paths (Issue #372).
 *
 * agentSSE.js has no test coverage at all today. It shares the same
 * duplication/error-path shape as chat.js before its streamHandler.js
 * refactor (see #369/#371): connection guards, auth, AgentHandler
 * lifecycle, and a catch-all error handler that maps known failure
 * messages ("No valid provider", "API key", "already closed") to
 * user-friendly SSE payloads while logging a correlation id server-side.
 *
 * These tests spin up a real HTTP server (agentSSE mounts a real
 * express.Router()) and use the Node 20+ global `fetch` to read the
 * SSE stream, so the actual Express routing/dispatch logic is exercised
 * end to end rather than re-implemented in a mock harness.
 */

process.env.NODE_ENV = "test";
process.env.INTEGRATION_TEST = "true";

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
jest.mock("../../utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (_req, _res, next) => next(),
}));

const AgentHandlerMock = { init: jest.fn() };
jest.mock("../../utils/agents", () => ({
  AgentHandler: jest.fn().mockImplementation(() => AgentHandlerMock),
}));

const express = require("express");
const http = require("node:http");
const { agentSSE } = require("../../endpoints/agentSSE");
const {
  WorkspaceAgentInvocation,
} = require("../../models/workspaceAgentInvocation");

/**
 * Reads Server-Sent Events off a fetch Response body until either the
 * predicate matches a fully-parsed `data:` payload or the overall timeout
 * elapses. Always releases the reader so the test server can close cleanly.
 */
async function readUntil(response, predicate, { timeoutMs = 3000 } = {}) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  async function readLoop() {
    while (true) {
      const { value, done } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer
          .split("\n\n")
          .map((c) => c.trim())
          .filter((c) => c.startsWith("data: "));
        for (const chunk of chunks) {
          const payload = JSON.parse(chunk.slice("data: ".length));
          if (predicate(payload)) return payload;
        }
      }
      if (done) throw new Error("readUntil: stream ended before predicate matched");
    }
  }

  try {
    return await Promise.race([
      readLoop(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("readUntil: predicate never matched before timeout")),
          timeoutMs,
        ),
      ),
    ]);
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* already closed */
    }
  }
}

describe("agentSSE — error paths", () => {
  let server;
  let baseUrl;

  beforeEach(async () => {
    jest.clearAllMocks();
    const app = express();
    app.use(express.json());
    agentSSE(app);
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(async () => {
    // Force-close any lingering SSE keep-alive sockets so server.close()
    // resolves immediately instead of waiting out the HTTP keep-alive
    // timeout. Without this, aborted-but-not-yet-torn-down connections from
    // the client-disconnect / oversized-message tests add several seconds
    // per test and risk exactly the kind of Jest open-handle leak tracked
    // in #373.
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  it("maps a missing-provider AgentHandler failure to a friendly setup message", async () => {
    AgentHandlerMock.init.mockRejectedValue(
      new Error("No valid provider configured for this workspace"),
    );

    const res = await fetch(`${baseUrl}/sse/agent/test-uuid-1`);
    const payload = await readUntil(res, (p) => p.type === "wssFailure");

    expect(payload.type).toBe("wssFailure");
    expect(payload.content).toMatch(/provider and API key configuration/i);
    expect(typeof payload.id).toBe("string");
    expect(payload.id.length).toBeGreaterThan(0);
  });

  it("maps an API-key AgentHandler failure to the same friendly setup message", async () => {
    AgentHandlerMock.init.mockRejectedValue(new Error("Invalid API key"));

    const res = await fetch(`${baseUrl}/sse/agent/test-uuid-2`);
    const payload = await readUntil(res, (p) => p.type === "wssFailure");

    expect(payload.content).toMatch(/provider and API key configuration/i);
  });

  it("maps an unrecognized AgentHandler failure to a generic Internal error (no leak)", async () => {
    AgentHandlerMock.init.mockRejectedValue(
      new Error("ENOENT: something/very/internal/path.db"),
    );

    const res = await fetch(`${baseUrl}/sse/agent/test-uuid-3`);
    const payload = await readUntil(res, (p) => p.type === "wssFailure");

    expect(payload.content).toBe("Internal error");
    expect(payload.content).not.toMatch(/ENOENT|internal\/path/);
  });

  it("gives every error payload a stable correlation id distinct per request", async () => {
    AgentHandlerMock.init.mockRejectedValue(new Error("boom"));

    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/sse/agent/uuid-a`),
      fetch(`${baseUrl}/sse/agent/uuid-b`),
    ]);
    const [p1, p2] = await Promise.all([
      readUntil(res1, (p) => p.type === "wssFailure"),
      readUntil(res2, (p) => p.type === "wssFailure"),
    ]);

    expect(p1.id).not.toBe(p2.id);
  });

  it("treats an 'already closed' invocation as a permanent session-ended failure", async () => {
    AgentHandlerMock.init.mockRejectedValue(
      new Error("Invocation is already closed"),
    );

    const res = await fetch(`${baseUrl}/sse/agent/test-uuid-4`);
    const payload = await readUntil(res, (p) => p.type === "wssFailure");

    expect(payload.content).toBe("Agent session has ended.");
  });

  it("closes the invocation via WorkspaceAgentInvocation.close on client disconnect", async () => {
    // Keep AgentHandler.init() pending so the connection stays open long
    // enough for us to abort it from the client side.
    let releaseInit;
    AgentHandlerMock.init.mockReturnValue(
      new Promise((resolve) => {
        releaseInit = resolve;
      }),
    );

    const controller = new AbortController();
    const fetchPromise = fetch(`${baseUrl}/sse/agent/test-uuid-5`, {
      signal: controller.signal,
    }).catch(() => null);

    // Give the server a moment to register the connection, then disconnect.
    await new Promise((r) => setTimeout(r, 100));
    controller.abort();
    await fetchPromise;
    await new Promise((r) => setTimeout(r, 100));

    expect(WorkspaceAgentInvocation.close).toHaveBeenCalledWith(
      "test-uuid-5",
    );
    releaseInit({ invocation: null }); // avoid dangling handler work
  });

  it("returns 404 from POST /agent/:uuid/message when no SSE connection is active", async () => {
    const res = await fetch(`${baseUrl}/sse/agent/no-such-uuid/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: "hi" }),
    });
    expect(res.status).toBe(404);
  });

  it("rejects an oversized POST message with 413", async () => {
    // AgentHandler never resolves invocation here; we only need the socket
    // registered in activeSSESockets, which happens before init() settles.
    AgentHandlerMock.init.mockReturnValue(new Promise(() => {}));

    const controller = new AbortController();
    fetch(`${baseUrl}/sse/agent/big-msg-uuid`, {
      signal: controller.signal,
    }).catch(() => null);
    await new Promise((r) => setTimeout(r, 150));

    const oversized = "x".repeat(11 * 1024 * 1024); // > 10 MiB default limit
    const res = await fetch(`${baseUrl}/sse/agent/big-msg-uuid/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: oversized }),
    });
    expect(res.status).toBe(413);
    controller.abort();
  });
});
