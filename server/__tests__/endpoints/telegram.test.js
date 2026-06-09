// SPDX-License-Identifier: MIT
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  isSingleUserMode: (_req, _res, next) => next(),
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { all: "<all>", admin: "admin", manager: "manager", default: "default" },
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const mockConnectorGet = jest.fn();
const mockConnectorUpsert = jest.fn();
const mockConnectorDelete = jest.fn();
const mockConnectorUpdateConfig = jest.fn();
jest.mock("../../models/externalCommunicationConnector", () => ({
  ExternalCommunicationConnector: {
    get: (...args) => mockConnectorGet(...args),
    upsert: (...args) => mockConnectorUpsert(...args),
    delete: (...args) => mockConnectorDelete(...args),
    updateConfig: (...args) => mockConnectorUpdateConfig(...args),
  },
}));

const mockTelemetrySend = jest.fn();
jest.mock("../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: (...args) => mockTelemetrySend(...args) },
}));

const mockVerifyToken = jest.fn();
const mockBotStart = jest.fn();
const mockBotStop = jest.fn();
const mockApprovePending = jest.fn();
const mockDenyPending = jest.fn();
const mockRevokeExisting = jest.fn();
const mockUpdateConfig = jest.fn();

jest.mock("../../utils/telegramBot", () => ({
  TelegramBotService: Object.assign(
    jest.fn(() => ({
      isRunning: false,
      start: (...a) => mockBotStart(...a),
      stop: (...a) => mockBotStop(...a),
      approvePendingUser: (...a) => mockApprovePending(...a),
      denyPendingUser: (...a) => mockDenyPending(...a),
      revokeExistingUser: (...a) => mockRevokeExisting(...a),
      updateConfig: (...a) => mockUpdateConfig(...a),
      pendingPairings: [],
    })),
    { verifyToken: (...a) => mockVerifyToken(...a) },
  ),
}));

jest.mock("../../utils/http", () => ({
  reqBody: (req) => req.body,
}));

const mockEventLog = jest.fn();
jest.mock("../../models/eventLogs", () => ({
  EventLogs: { logEvent: (...args) => mockEventLog(...args) },
}));

const mockWorkspaceGet = jest.fn();
const mockWorkspaceWhere = jest.fn();
const mockWorkspaceNew = jest.fn();
jest.mock("../../models/workspace", () => ({
  Workspace: {
    get: (...a) => mockWorkspaceGet(...a),
    where: (...a) => mockWorkspaceWhere(...a),
    new: (...a) => mockWorkspaceNew(...a),
  },
}));

const mockThreadWhere = jest.fn();
jest.mock("../../models/workspaceThread", () => ({
  WorkspaceThread: { where: (...a) => mockThreadWhere(...a) },
}));

jest.mock("../../utils/telegramBot/utils", () => ({
  encryptToken: (t) => `enc:${t}`,
}));

const { createMockApp } = require("../helpers/mockExpressApp");
const { telegramEndpoints } = require("../../endpoints/telegram");

function buildApp() {
  const harness = createMockApp();
  telegramEndpoints(harness.app);
  return harness;
}

describe("Telegram endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("GET /telegram/config", () => {
    it("returns null config when no connector exists", async () => {
      mockConnectorGet.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("get", "/telegram/config");
      expect(res.statusCode).toBe(200);
      expect(res.body.config).toBeNull();
    });

    it("returns config with workspace and thread details", async () => {
      mockConnectorGet.mockResolvedValue({
        active: true,
        config: {
          bot_username: "testbot",
          default_workspace: "ws1",
          approved_users: [{ active_workspace: "ws1", active_thread: "t1" }],
          voice_response_mode: "text_only",
        },
      });
      mockWorkspaceGet.mockResolvedValue({ name: "MyWS", chatModel: "gpt-4" });
      mockThreadWhere.mockResolvedValue([{ name: "Thread1" }]);
      const { call } = buildApp();
      const res = await call("get", "/telegram/config");
      expect(res.statusCode).toBe(200);
      expect(res.body.config.active).toBe(true);
      expect(res.body.config.bot_username).toBe("testbot");
      expect(res.body.config.default_workspace).toBe("MyWS");
      expect(res.body.config.voice_response_mode).toBe("text_only");
    });

    it("falls back to first available workspace when slug not found", async () => {
      mockConnectorGet.mockResolvedValue({
        active: false,
        config: { bot_username: null, default_workspace: "missing", approved_users: [] },
      });
      mockWorkspaceGet.mockResolvedValue(null);
      mockWorkspaceWhere.mockResolvedValue([{ name: "FallbackWS", chatModel: "default" }]);
      const { call } = buildApp();
      const res = await call("get", "/telegram/config");
      expect(res.statusCode).toBe(200);
      expect(res.body.config.default_workspace).toBe("FallbackWS");
    });

    it("returns 500 on exception", async () => {
      mockConnectorGet.mockRejectedValue(new Error("db fail"));
      const { call } = buildApp();
      const res = await call("get", "/telegram/config");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /telegram/connect", () => {
    it("rejects missing bot_token with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/telegram/connect", { body: {} });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/bot token/i);
    });

    it("rejects invalid bot token with 400", async () => {
      mockVerifyToken.mockResolvedValue({ valid: false, error: "Bad token" });
      const { call } = buildApp();
      const res = await call("post", "/telegram/connect", {
        body: { bot_token: "bad-token" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it("connects with valid token and existing workspace", async () => {
      mockVerifyToken.mockResolvedValue({ valid: true, username: "mybot" });
      mockWorkspaceWhere.mockResolvedValue([{ slug: "ws1" }]);
      mockConnectorGet.mockResolvedValue(null);
      mockConnectorUpsert.mockResolvedValue({ error: null });
      const { call } = buildApp();
      const res = await call("post", "/telegram/connect", {
        body: { bot_token: "valid-token", default_workspace: "ws1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bot_username).toBe("mybot");
      expect(mockBotStart).toHaveBeenCalled();
      expect(mockEventLog).toHaveBeenCalledWith(
        "telegram_bot_connected",
        expect.any(Object),
      );
    });

    it("creates workspace when none exists", async () => {
      mockVerifyToken.mockResolvedValue({ valid: true, username: "mybot" });
      mockWorkspaceWhere.mockResolvedValue([]);
      mockWorkspaceNew.mockResolvedValue({ workspace: { slug: "new-ws" } });
      mockConnectorGet.mockResolvedValue(null);
      mockConnectorUpsert.mockResolvedValue({ error: null });
      const { call } = buildApp();
      const res = await call("post", "/telegram/connect", {
        body: { bot_token: "valid-token" },
      });
      expect(res.statusCode).toBe(200);
      expect(mockWorkspaceNew).toHaveBeenCalled();
    });

    it("returns 400 when workspace cannot be created", async () => {
      mockVerifyToken.mockResolvedValue({ valid: true, username: "mybot" });
      mockWorkspaceWhere.mockResolvedValue([]);
      mockWorkspaceNew.mockResolvedValue({ workspace: null });
      const { call } = buildApp();
      const res = await call("post", "/telegram/connect", {
        body: { bot_token: "valid-token" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/workspace/i);
    });

    it("returns 500 on upsert error", async () => {
      mockVerifyToken.mockResolvedValue({ valid: true, username: "mybot" });
      mockWorkspaceWhere.mockResolvedValue([{ slug: "ws1" }]);
      mockConnectorGet.mockResolvedValue(null);
      mockConnectorUpsert.mockResolvedValue({ error: "write failed" });
      const { call } = buildApp();
      const res = await call("post", "/telegram/connect", {
        body: { bot_token: "valid-token" },
      });
      expect(res.statusCode).toBe(500);
    });

    it("returns 500 on exception", async () => {
      mockVerifyToken.mockRejectedValue(new Error("network"));
      const { call } = buildApp();
      const res = await call("post", "/telegram/connect", {
        body: { bot_token: "valid-token" },
      });
      expect(res.statusCode).toBe(500);
    });

    it("preserves approved_users on reconnect", async () => {
      mockVerifyToken.mockResolvedValue({ valid: true, username: "mybot" });
      mockWorkspaceWhere.mockResolvedValue([{ slug: "ws1" }]);
      mockConnectorGet.mockResolvedValue({
        config: { approved_users: [{ chatId: 123 }], voice_response_mode: "mirror" },
      });
      mockConnectorUpsert.mockResolvedValue({ error: null });
      const { call } = buildApp();
      const res = await call("post", "/telegram/connect", {
        body: { bot_token: "new-token" },
      });
      expect(res.statusCode).toBe(200);
      expect(mockConnectorUpsert).toHaveBeenCalledWith(
        "telegram",
        expect.objectContaining({
          approved_users: [{ chatId: 123 }],
          voice_response_mode: "mirror",
        }),
      );
    });
  });

  describe("POST /telegram/disconnect", () => {
    it("disconnects successfully", async () => {
      mockBotStop.mockResolvedValue(undefined);
      mockConnectorDelete.mockResolvedValue(undefined);
      const { call } = buildApp();
      const res = await call("post", "/telegram/disconnect");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockEventLog).toHaveBeenCalledWith("telegram_bot_disconnected");
    });

    it("returns 500 on exception", async () => {
      mockBotStop.mockRejectedValue(new Error("stop fail"));
      const { call } = buildApp();
      const res = await call("post", "/telegram/disconnect");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /telegram/status", () => {
    it("returns active status when connector and service running", async () => {
      mockConnectorGet.mockResolvedValue({
        active: true,
        config: { bot_username: "bot" },
      });
      const { call } = buildApp();
      const res = await call("get", "/telegram/status");
      expect(res.statusCode).toBe(200);
      expect(res.body.active).toBe(false);
      expect(res.body.bot_username).toBe("bot");
    });

    it("returns inactive when no connector", async () => {
      mockConnectorGet.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("get", "/telegram/status");
      expect(res.statusCode).toBe(200);
      expect(res.body.active).toBeFalsy();
      expect(res.body.bot_username).toBeNull();
    });

    it("returns 500 on exception", async () => {
      mockConnectorGet.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("get", "/telegram/status");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /telegram/pending-users", () => {
    it("returns empty list by default", async () => {
      const { call } = buildApp();
      const res = await call("get", "/telegram/pending-users");
      expect(res.statusCode).toBe(200);
      expect(res.body.users).toEqual([]);
    });

    it("returns pending pairings from service", async () => {
      const { call } = buildApp();
      const res = await call("get", "/telegram/pending-users");
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
    });
  });

  describe("GET /telegram/approved-users", () => {
    it("returns approved users from connector config", async () => {
      mockConnectorGet.mockResolvedValue({
        config: { approved_users: [{ chatId: 1 }, { chatId: 2 }] },
      });
      const { call } = buildApp();
      const res = await call("get", "/telegram/approved-users");
      expect(res.statusCode).toBe(200);
      expect(res.body.users).toHaveLength(2);
    });

    it("returns empty list when no connector", async () => {
      mockConnectorGet.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("get", "/telegram/approved-users");
      expect(res.statusCode).toBe(200);
      expect(res.body.users).toEqual([]);
    });

    it("returns 500 on exception", async () => {
      mockConnectorGet.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("get", "/telegram/approved-users");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /telegram/approve-user", () => {
    it("rejects missing chatId with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/telegram/approve-user", { body: {} });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/chatId/i);
    });

    it("approves a user successfully", async () => {
      mockApprovePending.mockResolvedValue(undefined);
      const { call } = buildApp();
      const res = await call("post", "/telegram/approve-user", {
        body: { chatId: 123 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockEventLog).toHaveBeenCalledWith("telegram_user_approved", { chatId: 123 });
    });

    it("returns 500 on exception", async () => {
      mockApprovePending.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("post", "/telegram/approve-user", {
        body: { chatId: 123 },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /telegram/deny-user", () => {
    it("rejects missing chatId with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/telegram/deny-user", { body: {} });
      expect(res.statusCode).toBe(400);
    });

    it("denies a user successfully", async () => {
      mockDenyPending.mockResolvedValue(undefined);
      const { call } = buildApp();
      const res = await call("post", "/telegram/deny-user", {
        body: { chatId: 456 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockEventLog).toHaveBeenCalledWith("telegram_user_denied", { chatId: 456 });
    });

    it("returns 500 on exception", async () => {
      mockDenyPending.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("post", "/telegram/deny-user", {
        body: { chatId: 456 },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /telegram/revoke-user", () => {
    it("rejects missing chatId with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/telegram/revoke-user", { body: {} });
      expect(res.statusCode).toBe(400);
    });

    it("revokes a user successfully", async () => {
      mockRevokeExisting.mockResolvedValue(undefined);
      const { call } = buildApp();
      const res = await call("post", "/telegram/revoke-user", {
        body: { chatId: 789 },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockEventLog).toHaveBeenCalledWith("telegram_user_revoked", { chatId: 789 });
    });

    it("returns 500 on exception", async () => {
      mockRevokeExisting.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("post", "/telegram/revoke-user", {
        body: { chatId: 789 },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /telegram/update-config", () => {
    it("rejects invalid voice_response_mode with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/telegram/update-config", {
        body: { voice_response_mode: "invalid" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/no valid/i);
    });

    it("rejects empty body with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/telegram/update-config", { body: {} });
      expect(res.statusCode).toBe(400);
    });

    it("updates config with valid voice_response_mode", async () => {
      mockConnectorUpdateConfig.mockResolvedValue({ error: null });
      const { call } = buildApp();
      const res = await call("post", "/telegram/update-config", {
        body: { voice_response_mode: "mirror" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockConnectorUpdateConfig).toHaveBeenCalledWith(
        "telegram",
        { voice_response_mode: "mirror" },
      );
    });

    it("returns 500 when updateConfig fails", async () => {
      mockConnectorUpdateConfig.mockResolvedValue({ error: "db error" });
      const { call } = buildApp();
      const res = await call("post", "/telegram/update-config", {
        body: { voice_response_mode: "always_voice" },
      });
      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it("returns 500 on exception", async () => {
      mockConnectorUpdateConfig.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("post", "/telegram/update-config", {
        body: { voice_response_mode: "text_only" },
      });
      expect(res.statusCode).toBe(500);
    });
  });
});
