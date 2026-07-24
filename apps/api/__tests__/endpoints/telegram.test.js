// SPDX-License-Identifier: MIT
// Tests for telegram endpoints (Issue #382).
//
// Covers: GET /telegram/config, POST /telegram/connect,
// POST /telegram/disconnect, GET /telegram/status,
// GET /telegram/pending-users, GET /telegram/approved-users,
// POST /telegram/approve-user, POST /telegram/deny-user,
// POST /telegram/revoke-user, POST /telegram/update-config

jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { admin: "admin", manager: "manager" },
}));
jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  log: jest.fn(),
}));
jest.mock("../../utils/http", () => ({
  reqBody: (req) => req.body,
}));

const mockConnectorGet = jest.fn();
const mockConnectorUpsert = jest.fn();
const mockConnectorDelete = jest.fn();
const mockConnectorUpdateConfig = jest.fn();
jest.mock("../../models/externalCommunicationConnector", () => ({
  ExternalCommunicationConnector: {
    get: (...a) => mockConnectorGet(...a),
    upsert: (...a) => mockConnectorUpsert(...a),
    delete: (...a) => mockConnectorDelete(...a),
    updateConfig: (...a) => mockConnectorUpdateConfig(...a),
  },
}));

const mockWorkspaceGet = jest.fn();
jest.mock("../../models/workspace", () => ({
  Workspace: { get: (...a) => mockWorkspaceGet(...a) },
}));

jest.mock("../../endpoints/utils", () => ({
  getModelTag: () => "openai:gpt-4o",
}));

// Mock global fetch for validateBotToken
global.fetch = jest.fn();

const { telegramEndpoints } = require("../../endpoints/telegram");
const { createMockApp } = require("../helpers/mockExpressApp");

function buildApp() {
  const harness = createMockApp();
  telegramEndpoints(harness.app);
  return harness;
}

describe("telegramEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
    global.fetch.mockReset();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /telegram/config
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /telegram/config", () => {
    it("returns safe config when connector exists", async () => {
      mockConnectorGet.mockResolvedValue({
        active: true,
        config: {
          bot_username: "my_bot",
          default_workspace: "ws-1",
          active_thread_name: "Main Thread",
          chat_model: "openai:gpt-4o",
          voice_response_mode: "text_only",
        },
      });

      const res = await app.call("get", "/telegram/config");

      expect(res.statusCode).toBe(200);
      expect(res.body.config).not.toBeNull();
      expect(res.body.config.active).toBe(true);
      expect(res.body.config.bot_username).toBe("my_bot");
      expect(res.body.error).toBeNull();
    });

    it("returns null config when no connector exists", async () => {
      mockConnectorGet.mockResolvedValue(null);

      const res = await app.call("get", "/telegram/config");

      expect(res.statusCode).toBe(200);
      expect(res.body.config).toBeNull();
    });

    it("returns 500 on error", async () => {
      mockConnectorGet.mockRejectedValue(new Error("DB error"));

      const res = await app.call("get", "/telegram/config");

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal server error");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /telegram/connect
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /telegram/connect", () => {
    it("connects bot with valid token", async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({
          ok: true,
          result: { username: "test_bot" },
        }),
      });
      mockConnectorUpsert.mockResolvedValue({ error: null });

      const res = await app.call("post", "/telegram/connect", {
        body: { bot_token: "123:ABC", default_workspace: "ws-1" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bot_username).toBe("test_bot");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.telegram.org/bot123:ABC/getMe",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("returns 400 when bot_token is missing", async () => {
      const res = await app.call("post", "/telegram/connect", {
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Bot token is required");
    });

    it("returns 400 when token validation fails", async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({
          ok: false,
          description: "Unauthorized",
        }),
      });

      const res = await app.call("post", "/telegram/connect", {
        body: { bot_token: "invalid" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Unauthorized");
    });

    it("returns 400 when fetch throws (network error)", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const res = await app.call("post", "/telegram/connect", {
        body: { bot_token: "123:ABC" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Failed to validate bot token");
    });

    it("returns 400 when connector upsert returns error", async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({ ok: true, result: { username: "bot" } }),
      });
      mockConnectorUpsert.mockResolvedValue({ error: "Already exists" });

      const res = await app.call("post", "/telegram/connect", {
        body: { bot_token: "123:ABC" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Already exists");
    });

    it("returns 500 on unexpected error", async () => {
      mockConnectorUpsert.mockRejectedValue(new Error("Fatal"));

      global.fetch.mockResolvedValue({
        json: async () => ({ ok: true, result: { username: "bot" } }),
      });

      const res = await app.call("post", "/telegram/connect", {
        body: { bot_token: "123:ABC" },
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal server error");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /telegram/disconnect
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /telegram/disconnect", () => {
    it("disconnects the bot successfully", async () => {
      mockConnectorDelete.mockResolvedValue(true);

      const res = await app.call("post", "/telegram/disconnect");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockConnectorDelete).toHaveBeenCalledWith("telegram");
    });

    it("returns 500 on error", async () => {
      mockConnectorDelete.mockRejectedValue(new Error("DB error"));

      const res = await app.call("post", "/telegram/disconnect");

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /telegram/status
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /telegram/status", () => {
    it("returns active status when connector exists", async () => {
      mockConnectorGet.mockResolvedValue({
        active: true,
        config: { bot_username: "my_bot" },
      });

      const res = await app.call("get", "/telegram/status");

      expect(res.statusCode).toBe(200);
      expect(res.body.active).toBe(true);
      expect(res.body.bot_username).toBe("my_bot");
    });

    it("returns inactive when no connector exists", async () => {
      mockConnectorGet.mockResolvedValue(null);

      const res = await app.call("get", "/telegram/status");

      expect(res.statusCode).toBe(200);
      expect(res.body.active).toBe(false);
      expect(res.body.bot_username).toBeNull();
    });

    it("returns 500 on error", async () => {
      mockConnectorGet.mockRejectedValue(new Error("DB error"));

      const res = await app.call("get", "/telegram/status");

      expect(res.statusCode).toBe(500);
      expect(res.body.active).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /telegram/pending-users
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /telegram/pending-users", () => {
    it("returns pending users list", async () => {
      mockConnectorGet.mockResolvedValue({
        config: { pending_users: [{ chatId: 1, name: "Alice" }] },
      });

      const res = await app.call("get", "/telegram/pending-users");

      expect(res.statusCode).toBe(200);
      expect(res.body.users).toHaveLength(1);
    });

    it("returns empty list when no connector", async () => {
      mockConnectorGet.mockResolvedValue(null);

      const res = await app.call("get", "/telegram/pending-users");

      expect(res.statusCode).toBe(200);
      expect(res.body.users).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /telegram/approved-users
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /telegram/approved-users", () => {
    it("returns approved users list", async () => {
      mockConnectorGet.mockResolvedValue({
        config: { approved_users: [{ chatId: 1, name: "Bob" }] },
      });

      const res = await app.call("get", "/telegram/approved-users");

      expect(res.statusCode).toBe(200);
      expect(res.body.users).toHaveLength(1);
    });

    it("returns empty list when no connector", async () => {
      mockConnectorGet.mockResolvedValue(null);

      const res = await app.call("get", "/telegram/approved-users");

      expect(res.statusCode).toBe(200);
      expect(res.body.users).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /telegram/approve-user
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /telegram/approve-user", () => {
    it("approves a pending user", async () => {
      mockConnectorGet.mockResolvedValue({
        config: {
          pending_users: [{ chatId: 123, name: "Alice" }],
          approved_users: [],
        },
      });
      mockConnectorUpdateConfig.mockResolvedValue({ error: null });

      const res = await app.call("post", "/telegram/approve-user", {
        body: { chatId: 123 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockConnectorUpdateConfig).toHaveBeenCalledWith(
        "telegram",
        expect.objectContaining({
          approved_users: expect.arrayContaining([
            expect.objectContaining({ chatId: 123 }),
          ]),
        }),
      );
    });

    it("returns 400 when chatId is missing", async () => {
      const res = await app.call("post", "/telegram/approve-user", {
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("chatId is required");
    });

    it("returns 400 when bot is not connected", async () => {
      mockConnectorGet.mockResolvedValue(null);

      const res = await app.call("post", "/telegram/approve-user", {
        body: { chatId: 123 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Telegram bot is not connected");
    });

    it("returns 400 when user not found in pending list", async () => {
      mockConnectorGet.mockResolvedValue({
        config: { pending_users: [], approved_users: [] },
      });

      const res = await app.call("post", "/telegram/approve-user", {
        body: { chatId: 999 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("User not found in pending list");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /telegram/deny-user
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /telegram/deny-user", () => {
    it("denies a pending user", async () => {
      mockConnectorGet.mockResolvedValue({
        config: {
          pending_users: [{ chatId: 123, name: "Alice" }],
        },
      });
      mockConnectorUpdateConfig.mockResolvedValue({ error: null });

      const res = await app.call("post", "/telegram/deny-user", {
        body: { chatId: 123 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 400 when chatId is missing", async () => {
      const res = await app.call("post", "/telegram/deny-user", {
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("chatId is required");
    });

    it("returns 400 when user not in pending list", async () => {
      mockConnectorGet.mockResolvedValue({
        config: { pending_users: [{ chatId: 456 }] },
      });

      const res = await app.call("post", "/telegram/deny-user", {
        body: { chatId: 999 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("User not found in pending list");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /telegram/revoke-user
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /telegram/revoke-user", () => {
    it("revokes an approved user", async () => {
      mockConnectorGet.mockResolvedValue({
        config: {
          approved_users: [{ chatId: 123, name: "Bob" }],
        },
      });
      mockConnectorUpdateConfig.mockResolvedValue({ error: null });

      const res = await app.call("post", "/telegram/revoke-user", {
        body: { chatId: 123 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 400 when chatId is missing", async () => {
      const res = await app.call("post", "/telegram/revoke-user", {
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("chatId is required");
    });

    it("returns 400 when user not in approved list", async () => {
      mockConnectorGet.mockResolvedValue({
        config: { approved_users: [{ chatId: 456 }] },
      });

      const res = await app.call("post", "/telegram/revoke-user", {
        body: { chatId: 999 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("User not found in approved list");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /telegram/update-config
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /telegram/update-config", () => {
    it("updates allowed config keys", async () => {
      mockConnectorUpdateConfig.mockResolvedValue({ error: null });

      const res = await app.call("post", "/telegram/update-config", {
        body: { voice_response_mode: "voice", default_workspace: "ws-2" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockConnectorUpdateConfig).toHaveBeenCalledWith(
        "telegram",
        { voice_response_mode: "voice", default_workspace: "ws-2" },
      );
    });

    it("returns 400 when no valid keys provided", async () => {
      const res = await app.call("post", "/telegram/update-config", {
        body: { invalid_key: "value" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("No valid config keys to update");
    });

    it("returns 400 when updates is not an object", async () => {
      const res = await app.call("post", "/telegram/update-config", {
        body: "not-an-object",
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Invalid config updates");
    });

    it("returns 400 when updateConfig returns error", async () => {
      mockConnectorUpdateConfig.mockResolvedValue({ error: "Invalid value" });

      const res = await app.call("post", "/telegram/update-config", {
        body: { voice_response_mode: "invalid" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Invalid value");
    });
  });
});
