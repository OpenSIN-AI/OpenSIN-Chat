// SPDX-License-Identifier: MIT

jest.mock("../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("../../utils/chats/stream");
jest.mock("../../models/telemetry");
jest.mock("../../models/eventLogs");
jest.mock("../../models/workspaceThread");
jest.mock("../../models/user");
jest.mock("../../utils/helpers/chat/responses");
jest.mock("../../utils/http", () => ({
  reqBody: jest.fn((req) => req.body),
  userFromSession: jest.fn(),
  multiUserMode: jest.fn(),
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  ROLES: { admin: "admin", manager: "manager", user: "user", all: "all" },
  flexUserRoleValid: () => (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/validWorkspace", () => ({
  validWorkspaceSlug: (_req, _res, next) => next(),
  validWorkspaceAndThreadSlug: (_req, _res, next) => next(),
}));

const { streamChatWithWorkspace } = require("../../utils/chats/stream");
const { Telemetry } = require("../../models/telemetry");
const { EventLogs } = require("../../models/eventLogs");
const { WorkspaceThread } = require("../../models/workspaceThread");
const { User } = require("../../models/user");
const { writeResponseChunk } = require("../../utils/helpers/chat/responses");
const { reqBody, userFromSession, multiUserMode } = require("../../utils/http");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  ROLES,
  flexUserRoleValid,
} = require("../../utils/middleware/multiUserProtected");
const {
  validWorkspaceSlug,
  validWorkspaceAndThreadSlug,
} = require("../../utils/middleware/validWorkspace");
const { createMockApp } = require("../helpers/mockExpressApp");
const { chatEndpoints } = require("../../endpoints/chat");

const WS_LOCALS = {
  workspace: { id: 1, name: "ws", slug: "ws", chatMode: "chat" },
};
const THREAD_LOCALS = {
  workspace: { id: 1, name: "ws", slug: "ws", chatMode: "chat" },
  thread: { id: 10, slug: "t1", name: "Thread 1" },
};

function buildApp() {
  const harness = createMockApp();
  chatEndpoints(harness.app);
  return harness;
}

describe("chatEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    userFromSession.mockResolvedValue({
      id: 1,
      username: "user1",
      dailyMessageLimit: 100,
    });
    reqBody.mockImplementation((req) => req.body);
    multiUserMode.mockReturnValue(false);
    streamChatWithWorkspace.mockResolvedValue();
    Telemetry.sendTelemetry.mockResolvedValue();
    EventLogs.logEvent.mockResolvedValue();
    writeResponseChunk.mockReturnValue();
    WorkspaceThread.autoRenameThread.mockResolvedValue();
  });
  afterEach(() => jest.clearAllMocks());

  describe("POST /workspace/:slug/stream-chat", () => {
    it("streams a workspace chat", async () => {
      const res = await app.call("post", "/workspace/ws/stream-chat", {
        body: { message: "hello" },
        locals: WS_LOCALS,
      });
      expect(streamChatWithWorkspace).toHaveBeenCalled();
      expect(Telemetry.sendTelemetry).toHaveBeenCalled();
      expect(res.ended).toBe(true);
    });

    it("returns 400 when message is empty", async () => {
      const res = await app.call("post", "/workspace/ws/stream-chat", {
        body: { message: "" },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Message is empty.");
    });

    it("returns 400 when message is whitespace", async () => {
      const res = await app.call("post", "/workspace/ws/stream-chat", {
        body: { message: "   " },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 413 when message exceeds the chat size cap", async () => {
      const huge = "x".repeat(50_000);
      const res = await app.call("post", "/workspace/ws/stream-chat", {
        body: { message: huge },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(413);
      expect(res.body.error).toMatch(/too long/i);
      // The expensive LLM call must NOT be made for oversize payloads.
      expect(streamChatWithWorkspace).not.toHaveBeenCalled();
    });

    it("accepts messages just under the cap", async () => {
      const max = "x".repeat(32_000);
      const res = await app.call("post", "/workspace/ws/stream-chat", {
        body: { message: max },
        locals: WS_LOCALS,
      });
      expect(res.ended).toBe(true);
      expect(streamChatWithWorkspace).toHaveBeenCalled();
    });

    it("sets SSE headers", async () => {
      await app.call("post", "/workspace/ws/stream-chat", {
        body: { message: "hello" },
        locals: WS_LOCALS,
      });
      const res = await app.call("post", "/workspace/ws/stream-chat", {
        body: { message: "hi" },
        locals: WS_LOCALS,
      });
      expect(res.headers["Content-Type"]).toBe("text/event-stream");
      expect(res.headers["Cache-Control"]).toBe("no-cache");
    });

    it("sends quota abort when user exceeds limit", async () => {
      multiUserMode.mockReturnValue(true);
      User.canSendChat.mockResolvedValue(false);
      const res = await app.call("post", "/workspace/ws/stream-chat", {
        body: { message: "hello" },
        locals: WS_LOCALS,
      });
      expect(writeResponseChunk).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ type: "abort" }),
      );
    });

    it("handles errors gracefully", async () => {
      streamChatWithWorkspace.mockRejectedValue(new Error("LLM down"));
      const res = await app.call("post", "/workspace/ws/stream-chat", {
        body: { message: "hello" },
        locals: WS_LOCALS,
      });
      expect(writeResponseChunk).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ error: "Internal error", type: "abort" }),
      );
    });
  });

  describe("POST /workspace/:slug/thread/:threadSlug/stream-chat", () => {
    it("streams a thread chat", async () => {
      const res = await app.call(
        "post",
        "/workspace/ws/thread/t1/stream-chat",
        {
          body: { message: "hello" },
          locals: THREAD_LOCALS,
        },
      );
      expect(streamChatWithWorkspace).toHaveBeenCalledWith(
        expect.any(Object),
        THREAD_LOCALS.workspace,
        "hello",
        "chat",
        expect.any(Object),
        THREAD_LOCALS.thread,
        [],
        expect.any(Object),
      );
    });

    it("returns 400 when message is empty", async () => {
      const res = await app.call(
        "post",
        "/workspace/ws/thread/t1/stream-chat",
        {
          body: { message: "" },
          locals: THREAD_LOCALS,
        },
      );
      expect(res.statusCode).toBe(400);
    });

    it("returns 413 when thread message exceeds the chat size cap", async () => {
      const huge = "x".repeat(50_000);
      const res = await app.call(
        "post",
        "/workspace/ws/thread/t1/stream-chat",
        {
          body: { message: huge },
          locals: THREAD_LOCALS,
        },
      );
      expect(res.statusCode).toBe(413);
      expect(streamChatWithWorkspace).not.toHaveBeenCalled();
    });

    it("auto-renames thread", async () => {
      await app.call("post", "/workspace/ws/thread/t1/stream-chat", {
        body: { message: "hello" },
        locals: THREAD_LOCALS,
      });
      expect(WorkspaceThread.autoRenameThread).toHaveBeenCalled();
    });

    it("handles errors gracefully", async () => {
      streamChatWithWorkspace.mockRejectedValue(new Error("fail"));
      const res = await app.call(
        "post",
        "/workspace/ws/thread/t1/stream-chat",
        {
          body: { message: "hello" },
          locals: THREAD_LOCALS,
        },
      );
      expect(writeResponseChunk).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ error: "Internal error", type: "abort" }),
      );
    });
  });
});
