// SPDX-License-Identifier: MIT
// Tests for embedManagement endpoints (Issue #382).
//
// Covers: GET /embeds, POST /embeds/new, POST /embed/update/:embedId,
// DELETE /embed/:embedId, POST /embed/chats, DELETE /embed/chats/:chatId.
//
// Uses the mockExpressApp harness to register routes and invoke handlers
// without booting a real HTTP server. Middleware arrays are ignored by
// the harness; the final handler is captured per route.

jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { admin: "admin", manager: "manager" },
}));
jest.mock("../../utils/middleware/embedMiddleware", () => ({
  validEmbedConfigId: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/chatHistoryViewable", () => ({
  chatHistoryViewable: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (_req, _res, next) => next(),
}));
jest.mock("../../utils/http", () => ({
  reqBody: jest.fn((req) => req.body),
  userFromSession: jest.fn(async (req) => ({
    id: 1,
    username: "admin",
    role: "admin",
  })),
}));
jest.mock("../../models/embedChats", () => ({
  EmbedChats: {
    whereWithEmbedAndWorkspace: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("../../models/embedConfig", () => ({
  EmbedConfig: {
    whereWithWorkspace: jest.fn(),
    new: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("../../models/eventLogs", () => ({
  EventLogs: {
    logEvent: jest.fn().mockResolvedValue(true),
  },
}));

const { embedManagementEndpoints } = require("../../endpoints/embedManagement");
const { EmbedConfig } = require("../../models/embedConfig");
const { EmbedChats } = require("../../models/embedChats");
const { EventLogs } = require("../../models/eventLogs");
const { userFromSession } = require("../../utils/http");
const { createMockApp } = require("../helpers/mockExpressApp");

function buildApp() {
  const harness = createMockApp();
  embedManagementEndpoints(harness.app);
  return harness;
}

describe("embedManagementEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });
  afterEach(() => jest.clearAllMocks());

  // ───────────────────────────────────────────────────────────
  // GET /embeds
  // ───────────────────────────────────────────────────────────
  describe("GET /embeds", () => {
    it("returns all embeds with 200", async () => {
      const fakeEmbeds = [
        { id: 1, name: "Embed A" },
        { id: 2, name: "Embed B" },
      ];
      EmbedConfig.whereWithWorkspace.mockResolvedValue(fakeEmbeds);

      const res = await app.call("get", "/embeds");

      expect(res.statusCode).toBe(200);
      expect(res.body.embeds).toEqual(fakeEmbeds);
      expect(EmbedConfig.whereWithWorkspace).toHaveBeenCalledWith(
        {},
        null,
        { createdAt: "desc" },
      );
    });

    it("returns 500 on error", async () => {
      EmbedConfig.whereWithWorkspace.mockRejectedValue(new Error("DB error"));

      const res = await app.call("get", "/embeds");

      expect(res.statusCode).toBe(500);
    });
  });

  // ───────────────────────────────────────────────────────────
  // POST /embeds/new
  // ───────────────────────────────────────────────────────────
  describe("POST /embeds/new", () => {
    it("creates a new embed and logs the event", async () => {
      const fakeEmbed = { id: 10, name: "New Embed" };
      EmbedConfig.new.mockResolvedValue({ embed: fakeEmbed, message: null });

      const res = await app.call("post", "/embeds/new", {
        body: { name: "New Embed", workspaceId: 5 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.embed).toEqual(fakeEmbed);
      expect(res.body.error).toBeNull();
      expect(EmbedConfig.new).toHaveBeenCalled();
      expect(EventLogs.logEvent).toHaveBeenCalledWith(
        "embed_created",
        { embedId: 10 },
        1,
      );
    });

    it("returns the error message when creation fails", async () => {
      EmbedConfig.new.mockResolvedValue({
        embed: null,
        message: "Invalid config",
      });

      const res = await app.call("post", "/embeds/new", {
        body: { name: "Bad Embed" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.embed).toBeNull();
      expect(res.body.error).toBe("Invalid config");
      expect(EventLogs.logEvent).not.toHaveBeenCalled();
    });

    it("returns 500 on exception", async () => {
      EmbedConfig.new.mockRejectedValue(new Error("Crash"));

      const res = await app.call("post", "/embeds/new", {
        body: { name: "Crash Embed" },
      });

      expect(res.statusCode).toBe(500);
    });
  });

  // ───────────────────────────────────────────────────────────
  // POST /embed/update/:embedId
  // ───────────────────────────────────────────────────────────
  describe("POST /embed/update/:embedId", () => {
    it("updates an embed and logs the event", async () => {
      EmbedConfig.update.mockResolvedValue({ success: true, error: null });

      const res = await app.call("post", "/embed/update/5", {
        body: { name: "Updated Name" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.error).toBeNull();
      expect(EmbedConfig.update).toHaveBeenCalledWith("5", { name: "Updated Name" });
      expect(EventLogs.logEvent).toHaveBeenCalledWith(
        "embed_updated",
        { embedId: "5" },
        1,
      );
    });

    it("returns the error when update fails", async () => {
      EmbedConfig.update.mockResolvedValue({
        success: false,
        error: "Not found",
      });

      const res = await app.call("post", "/embed/update/99", {
        body: { name: "Updated" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Not found");
    });

    it("returns 500 on exception", async () => {
      EmbedConfig.update.mockRejectedValue(new Error("Crash"));

      const res = await app.call("post", "/embed/update/5", {
        body: {},
      });

      expect(res.statusCode).toBe(500);
    });
  });

  // ───────────────────────────────────────────────────────────
  // DELETE /embed/:embedId
  // ───────────────────────────────────────────────────────────
  describe("DELETE /embed/:embedId", () => {
    it("deletes an embed and logs the event", async () => {
      EmbedConfig.delete.mockResolvedValue(true);

      const res = await app.call("delete", "/embed/7");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.error).toBeNull();
      expect(EmbedConfig.delete).toHaveBeenCalledWith({ id: 7 });
      expect(EventLogs.logEvent).toHaveBeenCalledWith(
        "embed_deleted",
        { embedId: "7" },
        undefined,
      );
    });

    it("returns 500 on exception", async () => {
      EmbedConfig.delete.mockRejectedValue(new Error("DB error"));

      const res = await app.call("delete", "/embed/7");

      expect(res.statusCode).toBe(500);
    });
  });

  // ───────────────────────────────────────────────────────────
  // POST /embed/chats
  // ───────────────────────────────────────────────────────────
  describe("POST /embed/chats", () => {
    it("returns paginated embed chats", async () => {
      const fakeChats = [
        { id: 1, prompt: "hello" },
        { id: 2, prompt: "world" },
      ];
      EmbedChats.whereWithEmbedAndWorkspace.mockResolvedValue(fakeChats);
      EmbedChats.count.mockResolvedValue(25);

      const res = await app.call("post", "/embed/chats", {
        body: { offset: 0, limit: 20 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.chats).toEqual(fakeChats);
      expect(res.body.totalChats).toBe(25);
      // hasPages = totalChats > (offset + 1) * limit = 25 > 20 = true
      expect(res.body.hasPages).toBe(true);
      expect(EmbedChats.whereWithEmbedAndWorkspace).toHaveBeenCalledWith(
        {},
        20,
        { id: "desc" },
        0,
      );
    });

    it("clamps limit to max 100", async () => {
      EmbedChats.whereWithEmbedAndWorkspace.mockResolvedValue([]);
      EmbedChats.count.mockResolvedValue(0);

      await app.call("post", "/embed/chats", {
        body: { offset: 0, limit: 500 },
      });

      expect(EmbedChats.whereWithEmbedAndWorkspace).toHaveBeenCalledWith(
        {},
        100,
        { id: "desc" },
        0,
      );
    });

    it("defaults offset and limit when not provided", async () => {
      EmbedChats.whereWithEmbedAndWorkspace.mockResolvedValue([]);
      EmbedChats.count.mockResolvedValue(0);

      await app.call("post", "/embed/chats", {
        body: {},
      });

      expect(EmbedChats.whereWithEmbedAndWorkspace).toHaveBeenCalledWith(
        {},
        20,
        { id: "desc" },
        0,
      );
    });

    it("returns 500 on exception", async () => {
      EmbedChats.whereWithEmbedAndWorkspace.mockRejectedValue(new Error("DB error"));

      const res = await app.call("post", "/embed/chats", {
        body: {},
      });

      expect(res.statusCode).toBe(500);
    });
  });

  // ───────────────────────────────────────────────────────────
  // DELETE /embed/chats/:chatId
  // ───────────────────────────────────────────────────────────
  describe("DELETE /embed/chats/:chatId", () => {
    it("deletes a chat by id and returns success", async () => {
      EmbedChats.delete.mockResolvedValue(true);

      const res = await app.call("delete", "/embed/chats/42");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.error).toBeNull();
      expect(EmbedChats.delete).toHaveBeenCalledWith({ id: 42 });
    });

    it("returns 500 on exception", async () => {
      EmbedChats.delete.mockRejectedValue(new Error("DB error"));

      const res = await app.call("delete", "/embed/chats/42");

      expect(res.statusCode).toBe(500);
    });
  });
});
