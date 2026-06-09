// SPDX-License-Identifier: MIT


jest.mock("../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { WorkspaceThread } = require("../../models/workspaceThread");
const { WorkspaceThreadFolder } = require("../../models/workspaceThreadFolder");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { Telemetry } = require("../../models/telemetry");
const { EventLogs } = require("../../models/eventLogs");
const { reqBody, userFromSession, multiUserMode, safeJsonParse } = require("../../utils/http");
const { convertToChatHistory } = require("../../utils/helpers/chat/responses");
const { createMockApp } = require("../helpers/mockExpressApp");
const { workspaceThreadEndpoints } = require("../../endpoints/workspaceThreads");

jest.mock("../../models/workspaceThread");
jest.mock("../../models/workspaceThreadFolder");
jest.mock("../../models/workspaceChats");
jest.mock("../../models/telemetry");
jest.mock("../../models/eventLogs");
jest.mock("../../utils/http");
jest.mock("../../utils/helpers/chat/responses");
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

const WS_LOCALS = { workspace: { id: 1, name: "ws", slug: "ws" } };
const THREAD_LOCALS = { workspace: { id: 1, name: "ws", slug: "ws" }, thread: { id: 10, slug: "t1", name: "Thread 1" } };

function buildApp() {
  const harness = createMockApp();
  workspaceThreadEndpoints(harness.app);
  return harness;
}

describe("workspaceThreadEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    userFromSession.mockResolvedValue({ id: 1, username: "user1" });
    reqBody.mockImplementation((req) => req.body);
    multiUserMode.mockReturnValue(false);
    Telemetry.sendTelemetry.mockResolvedValue();
    EventLogs.logEvent.mockResolvedValue();
    convertToChatHistory.mockImplementation((h) => h);
  });
  afterEach(() => jest.clearAllMocks());

  describe("POST /workspace/:slug/thread/new", () => {
    it("creates a thread", async () => {
      WorkspaceThread.new.mockResolvedValue({ thread: { id: 10, slug: "t1" }, message: null });
      const res = await app.call("post", "/workspace/ws/thread/new", { locals: WS_LOCALS });
      expect(res.statusCode).toBe(200);
      expect(res.body.thread.id).toBe(10);
    });

    it("returns 500 on error", async () => {
      WorkspaceThread.new.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/workspace/ws/thread/new", { locals: WS_LOCALS });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /workspace/:slug/threads", () => {
    it("returns threads and folders", async () => {
      WorkspaceThread.where.mockResolvedValue([{ id: 10 }]);
      WorkspaceThreadFolder.where.mockResolvedValue([{ id: 1 }]);
      WorkspaceChats.count.mockResolvedValue(5);
      const res = await app.call("get", "/workspace/ws/threads", { locals: WS_LOCALS });
      expect(res.statusCode).toBe(200);
      expect(res.body.threads).toHaveLength(1);
      expect(res.body.folders).toHaveLength(1);
      expect(res.body.defaultThreadChatCount).toBe(5);
    });

    it("returns 500 on error", async () => {
      WorkspaceThread.where.mockRejectedValue(new Error("fail"));
      const res = await app.call("get", "/workspace/ws/threads", { locals: WS_LOCALS });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /workspace/:slug/thread/:threadSlug", () => {
    it("deletes a thread", async () => {
      WorkspaceThread.delete.mockResolvedValue();
      const res = await app.call("delete", "/workspace/ws/thread/t1", { locals: THREAD_LOCALS });
      expect(res.statusCode).toBe(200);
    });

    it("returns 500 on error", async () => {
      WorkspaceThread.delete.mockRejectedValue(new Error("fail"));
      const res = await app.call("delete", "/workspace/ws/thread/t1", { locals: THREAD_LOCALS });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /workspace/:slug/thread-bulk-delete", () => {
    it("bulk deletes threads", async () => {
      WorkspaceThread.delete.mockResolvedValue();
      const res = await app.call("delete", "/workspace/ws/thread-bulk-delete", {
        body: { slugs: ["t1", "t2"] },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(200);
    });

    it("returns 200 when slugs empty", async () => {
      const res = await app.call("delete", "/workspace/ws/thread-bulk-delete", {
        body: { slugs: [] },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(200);
    });

    it("returns 500 on error", async () => {
      WorkspaceThread.delete.mockRejectedValue(new Error("fail"));
      const res = await app.call("delete", "/workspace/ws/thread-bulk-delete", {
        body: { slugs: ["t1"] },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /workspace/:slug/thread/:threadSlug/chats", () => {
    it("returns thread chat history", async () => {
      WorkspaceChats.where.mockResolvedValue([{ id: 1 }]);
      const res = await app.call("get", "/workspace/ws/thread/t1/chats", { locals: THREAD_LOCALS });
      expect(res.statusCode).toBe(200);
      expect(res.body.history).toBeDefined();
    });

    it("returns 500 on error", async () => {
      WorkspaceChats.where.mockRejectedValue(new Error("fail"));
      const res = await app.call("get", "/workspace/ws/thread/t1/chats", { locals: THREAD_LOCALS });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /workspace/:slug/thread/:threadSlug/update", () => {
    it("updates a thread", async () => {
      WorkspaceThread.update.mockResolvedValue({ thread: { id: 10, name: "Renamed" }, message: null });
      const res = await app.call("post", "/workspace/ws/thread/t1/update", {
        body: { name: "Renamed" },
        locals: THREAD_LOCALS,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.thread.name).toBe("Renamed");
    });

    it("returns 500 on error", async () => {
      WorkspaceThread.update.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/workspace/ws/thread/t1/update", {
        body: {},
        locals: THREAD_LOCALS,
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /workspace/:slug/thread/:threadSlug/delete-edited-chats", () => {
    it("deletes chats from startingId", async () => {
      WorkspaceChats.delete.mockResolvedValue();
      const res = await app.call("delete", "/workspace/ws/thread/t1/delete-edited-chats", {
        body: { startingId: 50 },
        locals: THREAD_LOCALS,
      });
      expect(res.statusCode).toBe(200);
    });

    it("returns 500 on error", async () => {
      WorkspaceChats.delete.mockRejectedValue(new Error("fail"));
      const res = await app.call("delete", "/workspace/ws/thread/t1/delete-edited-chats", {
        body: { startingId: 50 },
        locals: THREAD_LOCALS,
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /workspace/:slug/thread/:threadSlug/update-chat", () => {
    it("updates assistant chat text", async () => {
      WorkspaceChats.get.mockResolvedValue({ id: 1, response: '{"text":"old"}' });
      WorkspaceChats._update.mockResolvedValue();
      safeJsonParse.mockReturnValue({ text: "old" });
      const res = await app.call("post", "/workspace/ws/thread/t1/update-chat", {
        body: { chatId: 1, newText: "new text", role: "assistant" },
        locals: THREAD_LOCALS,
      });
      expect(res.statusCode).toBe(200);
    });

    it("updates user chat text", async () => {
      WorkspaceChats.get.mockResolvedValue({ id: 1 });
      WorkspaceChats._update.mockResolvedValue();
      const res = await app.call("post", "/workspace/ws/thread/t1/update-chat", {
        body: { chatId: 1, newText: "new prompt", role: "user" },
        locals: THREAD_LOCALS,
      });
      expect(WorkspaceChats._update).toHaveBeenCalledWith(1, { prompt: "new prompt" });
    });

    it("returns 500 when newText empty", async () => {
      const res = await app.call("post", "/workspace/ws/thread/t1/update-chat", {
        body: { chatId: 1, newText: "  ", role: "assistant" },
        locals: THREAD_LOCALS,
      });
      expect(res.statusCode).toBe(500);
    });

    it("returns 500 when chat not found", async () => {
      WorkspaceChats.get.mockResolvedValue(null);
      const res = await app.call("post", "/workspace/ws/thread/t1/update-chat", {
        body: { chatId: 999, newText: "hi", role: "assistant" },
        locals: THREAD_LOCALS,
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /workspace/:slug/thread-folder/new", () => {
    it("creates a folder", async () => {
      WorkspaceThreadFolder.new.mockResolvedValue({ folder: { id: 1, name: "F1" }, message: null });
      const res = await app.call("post", "/workspace/ws/thread-folder/new", {
        body: { name: "F1" },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.folder.name).toBe("F1");
    });

    it("returns 500 on error", async () => {
      WorkspaceThreadFolder.new.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/workspace/ws/thread-folder/new", {
        body: { name: "F1" },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /workspace/:slug/thread-folder/:folderId/update", () => {
    it("updates a folder", async () => {
      WorkspaceThreadFolder.update.mockResolvedValue({ folder: { id: 1, name: "Updated" }, message: null });
      const res = await app.call("post", "/workspace/ws/thread-folder/1/update", {
        body: { name: "Updated" },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.folder.name).toBe("Updated");
    });

    it("returns 500 on error", async () => {
      WorkspaceThreadFolder.update.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/workspace/ws/thread-folder/1/update", {
        body: {},
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /workspace/:slug/thread-folder/:folderId", () => {
    it("deletes a folder", async () => {
      WorkspaceThreadFolder.delete.mockResolvedValue(true);
      const res = await app.call("delete", "/workspace/ws/thread-folder/1", { locals: WS_LOCALS });
      expect(res.statusCode).toBe(200);
    });

    it("returns 500 when delete fails", async () => {
      WorkspaceThreadFolder.delete.mockResolvedValue(false);
      const res = await app.call("delete", "/workspace/ws/thread-folder/1", { locals: WS_LOCALS });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /workspace/:slug/thread/:threadSlug/assign-folder", () => {
    it("assigns a folder to a thread", async () => {
      WorkspaceThreadFolder.assignThread.mockResolvedValue(true);
      const res = await app.call("post", "/workspace/ws/thread/t1/assign-folder", {
        body: { folderId: 5 },
        locals: THREAD_LOCALS,
      });
      expect(res.statusCode).toBe(200);
    });

    it("returns 500 when assign fails", async () => {
      WorkspaceThreadFolder.assignThread.mockResolvedValue(false);
      const res = await app.call("post", "/workspace/ws/thread/t1/assign-folder", {
        body: { folderId: 5 },
        locals: THREAD_LOCALS,
      });
      expect(res.statusCode).toBe(500);
    });

    it("returns 500 on error", async () => {
      WorkspaceThreadFolder.assignThread.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/workspace/ws/thread/t1/assign-folder", {
        body: { folderId: 5 },
        locals: THREAD_LOCALS,
      });
      expect(res.statusCode).toBe(500);
    });
  });
});
