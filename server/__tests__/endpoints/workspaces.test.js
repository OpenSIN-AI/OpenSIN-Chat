// SPDX-License-Identifier: MIT


jest.mock("../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("../../models/workspace");
jest.mock("../../models/promptHistory");
jest.mock("../../models/documents");
jest.mock("../../models/vectors");
jest.mock("../../models/workspaceChats");
jest.mock("../../models/telemetry");
jest.mock("../../models/eventLogs");
jest.mock("../../models/workspacesSuggestedMessages");
jest.mock("../../models/workspaceThread");
jest.mock("../../utils/helpers");
jest.mock("../../utils/http", () => ({
  reqBody: jest.fn((req) => req.body),
  userFromSession: jest.fn(),
  multiUserMode: jest.fn(),
  safeJsonParse: jest.fn(),
}));
jest.mock("../../utils/helpers/chat/responses");
jest.mock("../../utils/helpers/search");
jest.mock("../../utils/files/purgeDocument");
jest.mock("../../utils/TextToSpeech", () => ({ getTTSProvider: jest.fn() }));
jest.mock("../../utils/files/multer", () => ({
  handleFileUpload: (_req, _res, next) => next(),
  handlePfpUpload: (_req, _res, next) => next(),
}));
jest.mock("../../utils/files/pfp", () => ({
  determineWorkspacePfpFilepath: jest.fn(),
  fetchPfp: jest.fn(),
}));
jest.mock("../../utils/collectorApi");
jest.mock("../../utils/EmbeddingWorkerManager", () => ({
  isNativeEmbedder: jest.fn(),
  embedFiles: jest.fn(),
  addSSEConnection: jest.fn(),
  removeSSEConnection: jest.fn(),
  removeQueuedFile: jest.fn(),
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
}));
jest.mock("../../utils/middleware/workspaceDeletionProtection", () => ({
  workspaceDeletionProtection: (_req, _res, next) => next(),
}));
jest.mock("../../endpoints/workspacesParsedFiles", () => ({
  workspaceParsedFilesEndpoints: () => {},
}));

const { Workspace } = require("../../models/workspace");
const { Document } = require("../../models/documents");
const { DocumentVectors } = require("../../models/vectors");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { Telemetry } = require("../../models/telemetry");
const { EventLogs } = require("../../models/eventLogs");
const { WorkspaceSuggestedMessages } = require("../../models/workspacesSuggestedMessages");
const { WorkspaceThread } = require("../../models/workspaceThread");
const { getVectorDbClass } = require("../../utils/helpers");
const { reqBody, userFromSession, multiUserMode, safeJsonParse } = require("../../utils/http");
const { convertToChatHistory } = require("../../utils/helpers/chat/responses");
const { searchWorkspaceAndThreads } = require("../../utils/helpers/search");
const { purgeDocument } = require("../../utils/files/purgeDocument");
const { createMockApp } = require("../helpers/mockExpressApp");
const { workspaceEndpoints } = require("../../endpoints/workspaces");

const WS_LOCALS = { workspace: { id: 1, name: "ws", slug: "ws" } };

function buildApp() {
  const harness = createMockApp();
  workspaceEndpoints(harness.app);
  return harness;
}

describe("workspaceEndpoints", () => {
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

  describe("POST /workspace/new", () => {
    it("creates a workspace", async () => {
      Workspace.new.mockResolvedValue({ workspace: { id: 1, name: "ws" }, message: null });
      const res = await app.call("post", "/workspace/new", { body: { name: "ws" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.workspace.name).toBe("ws");
    });

    it("returns 500 on error", async () => {
      Workspace.new.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/workspace/new", { body: {} });
      expect(res.statusCode).toBe(500);
    });

    it("rejects whitespace-only names with a friendly message", async () => {
      // Workspace.new is mocked; ensure the endpoint forwards the rejection
      // message back to the caller instead of crashing.
      Workspace.new.mockResolvedValue({
        workspace: null,
        message: "name cannot be null",
      });
      const res = await app.call("post", "/workspace/new", {
        body: { name: "   " },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/name cannot be null/);
      expect(res.body.workspace).toBeNull();
    });
  });

  describe("POST /workspace/:slug/update", () => {
    it("updates a workspace", async () => {
      Workspace.get.mockResolvedValue({ id: 1, slug: "ws" });
      Workspace.trackChange.mockResolvedValue();
      Workspace.update.mockResolvedValue({ workspace: { id: 1, name: "updated" }, message: null });
      const res = await app.call("post", "/workspace/ws/update", { body: { name: "updated" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.workspace.name).toBe("updated");
    });

    it("returns 400 when workspace not found", async () => {
      Workspace.get.mockResolvedValue(null);
      const res = await app.call("post", "/workspace/ws/update", { body: {} });
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on error", async () => {
      Workspace.get.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/workspace/ws/update", { body: {} });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /workspaces", () => {
    it("returns all workspaces", async () => {
      Workspace.where.mockResolvedValue([{ id: 1 }]);
      const res = await app.call("get", "/workspaces");
      expect(res.statusCode).toBe(200);
      expect(res.body.workspaces).toHaveLength(1);
    });

    it("returns 500 on error", async () => {
      Workspace.where.mockRejectedValue(new Error("fail"));
      const res = await app.call("get", "/workspaces");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /workspace/:slug", () => {
    it("returns a workspace by slug", async () => {
      Workspace.get.mockResolvedValue({ id: 1, slug: "ws" });
      const res = await app.call("get", "/workspace/ws");
      expect(res.statusCode).toBe(200);
      expect(res.body.workspace.slug).toBe("ws");
    });

    it("returns 500 on error", async () => {
      Workspace.get.mockRejectedValue(new Error("fail"));
      const res = await app.call("get", "/workspace/ws");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /workspace/:slug/chats", () => {
    it("returns chat history", async () => {
      Workspace.get.mockResolvedValue({ id: 1 });
      WorkspaceChats.forWorkspace.mockResolvedValue([{ id: 1 }]);
      const res = await app.call("get", "/workspace/ws/chats");
      expect(res.statusCode).toBe(200);
      expect(res.body.history).toBeDefined();
    });

    it("returns 400 when workspace not found", async () => {
      Workspace.get.mockResolvedValue(null);
      const res = await app.call("get", "/workspace/ws/chats");
      expect(res.statusCode).toBe(400);
    });
  });

  describe("DELETE /workspace/:slug", () => {
    it("deletes a workspace", async () => {
      Workspace.get.mockResolvedValue({ id: 1, slug: "ws" });
      Workspace.delete.mockResolvedValue();
      WorkspaceChats.delete.mockResolvedValue();
      DocumentVectors.deleteForWorkspace.mockResolvedValue();
      Document.delete.mockResolvedValue();
      getVectorDbClass.mockReturnValue({ "delete-namespace": jest.fn().mockResolvedValue() });
      const res = await app.call("delete", "/workspace/ws");
      expect(res.statusCode).toBe(200);
    });

    it("returns 400 when workspace not found", async () => {
      Workspace.get.mockResolvedValue(null);
      const res = await app.call("delete", "/workspace/ws");
      expect(res.statusCode).toBe(400);
    });
  });

  describe("DELETE /workspace/:slug/reset-vector-db", () => {
    it("resets vector db for workspace", async () => {
      Workspace.get.mockResolvedValue({ id: 1, slug: "ws" });
      DocumentVectors.deleteForWorkspace.mockResolvedValue();
      Document.delete.mockResolvedValue();
      getVectorDbClass.mockReturnValue({ "delete-namespace": jest.fn().mockResolvedValue() });
      const res = await app.call("delete", "/workspace/ws/reset-vector-db");
      expect(res.statusCode).toBe(200);
    });

    it("returns 400 when workspace not found", async () => {
      Workspace.get.mockResolvedValue(null);
      const res = await app.call("delete", "/workspace/ws/reset-vector-db");
      expect(res.statusCode).toBe(400);
    });
  });

  describe("DELETE /workspace/:slug/delete-chats", () => {
    it("deletes specific chats", async () => {
      WorkspaceChats.delete.mockResolvedValue();
      const res = await app.call("delete", "/workspace/ws/delete-chats", {
        body: { chatIds: [1, 2, 3] },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(200);
    });

    it("returns 400 when no workspace", async () => {
      const res = await app.call("delete", "/workspace/ws/delete-chats", {
        body: { chatIds: [1] },
        locals: { workspace: null },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /workspace/:slug/suggested-messages GET", () => {
    it("returns suggested messages", async () => {
      WorkspaceSuggestedMessages.getMessages.mockResolvedValue(["hello"]);
      const res = await app.call("get", "/workspace/ws/suggested-messages");
      expect(res.statusCode).toBe(200);
      expect(res.body.suggestedMessages).toHaveLength(1);
    });

    it("returns 500 on error", async () => {
      WorkspaceSuggestedMessages.getMessages.mockRejectedValue(new Error("fail"));
      const res = await app.call("get", "/workspace/ws/suggested-messages");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /workspace/:slug/suggested-messages POST", () => {
    it("saves suggested messages", async () => {
      WorkspaceSuggestedMessages.saveAll.mockResolvedValue();
      const res = await app.call("post", "/workspace/ws/suggested-messages", {
        body: { messages: ["hello", "hi"] },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 400 when messages is not array", async () => {
      const res = await app.call("post", "/workspace/ws/suggested-messages", {
        body: { messages: "not-array" },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /workspace/search", () => {
    it("returns search results", async () => {
      searchWorkspaceAndThreads.mockResolvedValue({ workspaces: [], threads: [] });
      const res = await app.call("post", "/workspace/search", {
        body: { searchTerm: "test" },
      });
      expect(res.statusCode).toBe(200);
    });

    it("returns 500 on error", async () => {
      searchWorkspaceAndThreads.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/workspace/search", {
        body: { searchTerm: "test" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /workspace/:slug/prompt-history", () => {
    it("returns prompt history", async () => {
      Workspace.promptHistory.mockResolvedValue(["prompt1"]);
      const res = await app.call("get", "/workspace/ws/prompt-history", { locals: WS_LOCALS });
      expect(res.statusCode).toBe(200);
      expect(res.body.history).toHaveLength(1);
    });

    it("returns 500 on error", async () => {
      Workspace.promptHistory.mockRejectedValue(new Error("fail"));
      const res = await app.call("get", "/workspace/ws/prompt-history", { locals: WS_LOCALS });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /workspace/:slug/prompt-history", () => {
    it("clears prompt history", async () => {
      Workspace.deleteAllPromptHistory.mockResolvedValue(true);
      const res = await app.call("delete", "/workspace/ws/prompt-history", { locals: WS_LOCALS });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("DELETE /workspace/prompt-history/:id", () => {
    it("deletes a single prompt history entry", async () => {
      const { PromptHistory } = require("../../models/promptHistory");
      PromptHistory.delete.mockResolvedValue(true);
      const res = await app.call("delete", "/workspace/prompt-history/5", { locals: WS_LOCALS });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("POST /workspace/:slug/update-chat", () => {
    it("updates assistant chat", async () => {
      WorkspaceChats.get.mockResolvedValue({ id: 1, response: '{"text":"old"}' });
      WorkspaceChats._update.mockResolvedValue();
      safeJsonParse.mockReturnValue({ text: "old" });
      const res = await app.call("post", "/workspace/ws/update-chat", {
        body: { chatId: 1, newText: "new", role: "assistant" },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(200);
    });

    it("updates user chat", async () => {
      WorkspaceChats.get.mockResolvedValue({ id: 1 });
      WorkspaceChats._update.mockResolvedValue();
      const res = await app.call("post", "/workspace/ws/update-chat", {
        body: { chatId: 1, newText: "new prompt", role: "user" },
        locals: WS_LOCALS,
      });
      expect(WorkspaceChats._update).toHaveBeenCalledWith(1, { prompt: "new prompt" });
    });

    it("returns 500 on empty text", async () => {
      const res = await app.call("post", "/workspace/ws/update-chat", {
        body: { chatId: 1, newText: "  " },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("PUT /workspace/workspace-chats/:id", () => {
    it("hides a chat", async () => {
      WorkspaceChats.get.mockResolvedValue({ id: 1 });
      WorkspaceChats._update.mockResolvedValue();
      const res = await app.call("put", "/workspace/workspace-chats/1");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 404 when chat not found", async () => {
      WorkspaceChats.get.mockResolvedValue(null);
      const res = await app.call("put", "/workspace/workspace-chats/999");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /workspace/:slug/chat-feedback/:chatId", () => {
    it("updates feedback", async () => {
      WorkspaceChats.get.mockResolvedValue({ id: 1 });
      WorkspaceChats.updateFeedbackScore.mockResolvedValue();
      const res = await app.call("post", "/workspace/ws/chat-feedback/1", {
        body: { feedback: "positive" },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(200);
    });

    it("returns 404 when chat not found", async () => {
      WorkspaceChats.get.mockResolvedValue(null);
      const res = await app.call("post", "/workspace/ws/chat-feedback/999", {
        body: { feedback: "positive" },
        locals: WS_LOCALS,
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
