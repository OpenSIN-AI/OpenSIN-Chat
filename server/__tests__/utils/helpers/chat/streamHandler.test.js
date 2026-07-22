// SPDX-License-Identifier: MIT
/**
 * Unit tests for the shared streamChatHandler helper (Issue #369 refactor).
 * The endpoint-level integration tests in __tests__/endpoints/chat.test.js
 * cover the full request lifecycle; these tests isolate the helper's own
 * branching logic to guarantee parity between the workspace and thread paths.
 */

jest.mock("../../../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("../../../../utils/chats/stream");
jest.mock("../../../../models/telemetry");
jest.mock("../../../../models/eventLogs");
jest.mock("../../../../models/workspaceThread");
jest.mock("../../../../models/user");
jest.mock("../../../../utils/helpers/chat/responses");
jest.mock("../../../../utils/helpers/sse", () => ({
  startSSEHeartbeat: jest.fn(() => jest.fn()),
}));
jest.mock("../../../../utils/http", () => ({
  reqBody: jest.fn((req) => req.body),
  userFromSession: jest.fn(),
  multiUserMode: jest.fn(),
}));
jest.mock("../../../../endpoints/utils", () => ({
  getModelTag: jest.fn(() => "gpt-4o"),
}));

const { streamChatWithWorkspace } = require("../../../../utils/chats/stream");
const { Telemetry } = require("../../../../models/telemetry");
const { EventLogs } = require("../../../../models/eventLogs");
const { WorkspaceThread } = require("../../../../models/workspaceThread");
const { User } = require("../../../../models/user");
const { writeResponseChunk } = require("../../../../utils/helpers/chat/responses");
const { startSSEHeartbeat } = require("../../../../utils/helpers/sse");
const { reqBody, userFromSession, multiUserMode } = require("../../../../utils/http");

const {
  streamChatHandler,
  CHAT_MESSAGE_MAX_LENGTH,
} = require("../../../../utils/helpers/chat/streamHandler");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORKSPACE = { id: 1, name: "ws", slug: "ws", chatMode: "chat" };
const THREAD = { id: 10, slug: "t1", name: "Thread 1" };
const USER = { id: 1, username: "u1", dailyMessageLimit: 100 };

function mockResponse(locals = {}) {
  const headers = {};
  const res = {
    locals: { workspace: WORKSPACE, ...locals },
    statusCode: 200,
    body: null,
    ended: false,
    writableEnded: false,
    headers,
    flushHeaders: jest.fn(),
    setHeader: jest.fn((k, v) => { headers[k] = v; }),
    status: jest.fn(function (code) { this.statusCode = code; return this; }),
    json: jest.fn(function (body) { this.body = body; return this; }),
    end: jest.fn(function () { this.ended = true; this.writableEnded = true; }),
  };
  return res;
}

function mockRequest(body = {}) {
  const listeners = {};
  const req = {
    body,
    on: jest.fn((event, cb) => { listeners[event] = cb; }),
    _emit: (event) => listeners[event]?.(),
  };
  return req;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  userFromSession.mockResolvedValue(USER);
  reqBody.mockImplementation((req) => req.body);
  multiUserMode.mockReturnValue(false);
  streamChatWithWorkspace.mockResolvedValue();
  Telemetry.sendTelemetry.mockResolvedValue();
  EventLogs.logEvent.mockResolvedValue();
  writeResponseChunk.mockReturnValue();
  WorkspaceThread.autoRenameThread.mockResolvedValue();
  startSSEHeartbeat.mockReturnValue(jest.fn());
});
afterEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("streamChatHandler — input validation", () => {
  it("rejects empty string message with 400", async () => {
    const req = mockRequest({ message: "" });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Message is empty.");
    expect(streamChatWithWorkspace).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only message with 400", async () => {
    const req = mockRequest({ message: "   " });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(streamChatWithWorkspace).not.toHaveBeenCalled();
  });

  it("rejects missing message (undefined) with 400", async () => {
    const req = mockRequest({});
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(res.statusCode).toBe(400);
  });

  it(`rejects message longer than ${CHAT_MESSAGE_MAX_LENGTH} chars with 413`, async () => {
    const req = mockRequest({ message: "x".repeat(CHAT_MESSAGE_MAX_LENGTH + 1) });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(res.statusCode).toBe(413);
    expect(res.body.error).toMatch(/too long/i);
    expect(streamChatWithWorkspace).not.toHaveBeenCalled();
  });

  it(`accepts message of exactly ${CHAT_MESSAGE_MAX_LENGTH} chars`, async () => {
    const req = mockRequest({ message: "x".repeat(CHAT_MESSAGE_MAX_LENGTH) });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(streamChatWithWorkspace).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SSE setup
// ---------------------------------------------------------------------------

describe("streamChatHandler — SSE headers", () => {
  it("sets required SSE response headers before streaming", async () => {
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(res.headers["Content-Type"]).toBe("text/event-stream");
    expect(res.headers["Cache-Control"]).toBe("no-store, no-cache, must-revalidate");
    expect(res.headers["Connection"]).toBe("keep-alive");
    expect(res.flushHeaders).toHaveBeenCalled();
  });

  it("starts and stops the SSE heartbeat around the stream", async () => {
    const stopMock = jest.fn();
    startSSEHeartbeat.mockReturnValue(stopMock);
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(startSSEHeartbeat).toHaveBeenCalled();
    expect(stopMock).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Daily quota guard
// ---------------------------------------------------------------------------

describe("streamChatHandler — daily quota", () => {
  it("writes abort chunk and returns when user has exceeded quota", async () => {
    multiUserMode.mockReturnValue(true);
    User.canSendChat.mockResolvedValue(false);
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(streamChatWithWorkspace).not.toHaveBeenCalled();
    expect(writeResponseChunk).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ type: "abort", close: true }),
    );
  });

  it("proceeds normally when multi-user quota is satisfied", async () => {
    multiUserMode.mockReturnValue(true);
    User.canSendChat.mockResolvedValue(true);
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(streamChatWithWorkspace).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Workspace path (thread: null)
// ---------------------------------------------------------------------------

describe("streamChatHandler — workspace path (no thread)", () => {
  it("calls streamChatWithWorkspace with thread=null", async () => {
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res, { thread: null });
    expect(streamChatWithWorkspace).toHaveBeenCalledWith(
      expect.any(Object),
      WORKSPACE,
      "hello",
      WORKSPACE.chatMode,
      USER,
      null,
      [],
      expect.any(Object),
      "chat",
      [],
      null,
    );
  });

  it("does NOT call autoRenameThread for workspace path", async () => {
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res, { thread: null });
    expect(WorkspaceThread.autoRenameThread).not.toHaveBeenCalled();
  });

  it("logs EventLog without thread field", async () => {
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res, { thread: null });
    expect(EventLogs.logEvent).toHaveBeenCalledWith(
      "sent_chat",
      expect.not.objectContaining({ thread: expect.anything() }),
      USER.id,
    );
  });

  it("ends the response", async () => {
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(res.ended).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Thread path
// ---------------------------------------------------------------------------

describe("streamChatHandler — thread path", () => {
  it("calls streamChatWithWorkspace with the thread object", async () => {
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res, { thread: THREAD });
    expect(streamChatWithWorkspace).toHaveBeenCalledWith(
      expect.any(Object),
      WORKSPACE,
      "hello",
      WORKSPACE.chatMode,
      USER,
      THREAD,
      [],
      expect.any(Object),
      "chat",
      [],
      null,
    );
  });

  it("calls autoRenameThread for thread path", async () => {
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res, { thread: THREAD });
    expect(WorkspaceThread.autoRenameThread).toHaveBeenCalledWith(
      expect.objectContaining({ thread: THREAD, workspace: WORKSPACE }),
    );
  });

  it("emits rename_thread chunk when thread is renamed", async () => {
    WorkspaceThread.autoRenameThread.mockImplementation(({ onRename }) => {
      onRename({ slug: "new-slug", name: "New Name" });
    });
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res, { thread: THREAD });
    expect(writeResponseChunk).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ action: "rename_thread" }),
    );
  });

  it("logs EventLog with thread field", async () => {
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res, { thread: THREAD });
    expect(EventLogs.logEvent).toHaveBeenCalledWith(
      "sent_chat",
      expect.objectContaining({ thread: THREAD.name }),
      USER.id,
    );
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("streamChatHandler — error handling", () => {
  it("writes abort chunk and ends response on stream error", async () => {
    streamChatWithWorkspace.mockRejectedValue(new Error("LLM down"));
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(writeResponseChunk).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ type: "abort", error: "Internal error" }),
    );
    expect(res.ended).toBe(true);
  });

  it("includes a stable errorId in the error chunk (Issue #371)", async () => {
    streamChatWithWorkspace.mockRejectedValue(new Error("LLM down"));
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res);

    const chunk = writeResponseChunk.mock.calls.at(-1)[1];
    // A non-empty UUID-shaped id is surfaced to the client so users can quote
    // it in support tickets.
    expect(typeof chunk.errorId).toBe("string");
    expect(chunk.errorId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    // The errorId must match the id logged server-side for correlation.
    expect(chunk.errorId).toBe(chunk.id);
  });

  it("never leaks the underlying error message/stacktrace to the client", async () => {
    streamChatWithWorkspace.mockRejectedValue(
      new Error("super-secret-internal-detail"),
    );
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res);

    const chunk = writeResponseChunk.mock.calls.at(-1)[1];
    expect(chunk.error).toBe("Internal error");
    const serialized = JSON.stringify(chunk);
    expect(serialized).not.toContain("super-secret-internal-detail");
    expect(serialized).not.toContain("stack");
  });

  it("stops heartbeat even when an error is thrown", async () => {
    const stopMock = jest.fn();
    startSSEHeartbeat.mockReturnValue(stopMock);
    streamChatWithWorkspace.mockRejectedValue(new Error("fail"));
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(stopMock).toHaveBeenCalled();
  });

  it("wires AbortController to request close event", async () => {
    const req = mockRequest({ message: "hello" });
    const res = mockResponse();
    await streamChatHandler(req, res);
    expect(req.on).toHaveBeenCalledWith("close", expect.any(Function));
  });
});
