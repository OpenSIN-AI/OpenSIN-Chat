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

const mockUserFromSession = jest.fn();
jest.mock("../../utils/http", () => ({
  reqBody: (req) => req.body,
  userFromSession: (...a) => mockUserFromSession(...a),
}));

const mockWhitelistAdd = jest.fn();
jest.mock("../../models/agentSkillWhitelist", () => ({
  AgentSkillWhitelist: { add: (...a) => mockWhitelistAdd(...a) },
}));

jest.mock("../../utils/agents/aibitat/plugins/filesystem/lib", () => ({
  isToolAvailable: jest.fn(() => true),
}));

jest.mock("../../utils/agents/aibitat/plugins/create-files/lib", () => ({
  isToolAvailable: jest.fn(() => false),
}));

const { createMockApp } = require("../helpers/mockExpressApp");
const { agentSkillWhitelistEndpoints } = require("../../endpoints/agentSkillWhitelist");

function buildApp() {
  const harness = createMockApp();
  agentSkillWhitelistEndpoints(harness.app);
  return harness;
}

describe("Agent Skill Whitelist endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("GET /agent-skills/filesystem-agent/is-available", () => {
    it("returns availability status for filesystem tool", async () => {
      const { call } = buildApp();
      const res = await call("get", "/agent-skills/filesystem-agent/is-available");
      expect(res.statusCode).toBe(200);
      expect(res.body.available).toBe(true);
    });

    it("returns 500 with error on exception", async () => {
      jest.resetModules();
      jest.mock("../../utils/agents/aibitat/plugins/filesystem/lib", () => {
        throw new Error("module fail");
      });
      const { createMockApp: freshApp } = require("../helpers/mockExpressApp");
      const { agentSkillWhitelistEndpoints: freshEndpoints } = require("../../endpoints/agentSkillWhitelist");
      const harness = freshApp();
      freshEndpoints(harness.app);
      const res = await harness.call("get", "/agent-skills/filesystem-agent/is-available");
      expect(res.statusCode).toBe(500);
      expect(res.body.available).toBe(false);
    });
  });

  describe("GET /agent-skills/create-files-agent/is-available", () => {
    it("returns availability status for create-files tool", async () => {
      const { call } = buildApp();
      const res = await call("get", "/agent-skills/create-files-agent/is-available");
      expect(res.statusCode).toBe(200);
      expect(res.body.available).toBe(false);
    });
  });

  describe("POST /agent-skills/whitelist/add", () => {
    it("rejects missing skillName with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/agent-skills/whitelist/add", {
        body: {},
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/missing skillname/i);
    });

    it("adds a skill to the whitelist successfully", async () => {
      mockUserFromSession.mockResolvedValue({ id: 1 });
      mockWhitelistAdd.mockResolvedValue({ success: true, error: null });
      const { call } = buildApp();
      const res = await call("post", "/agent-skills/whitelist/add", {
        body: { skillName: "web-search" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockWhitelistAdd).toHaveBeenCalledWith("web-search", 1);
    });

    it("returns 401 in multi-user mode when no user", async () => {
      mockUserFromSession.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("post", "/agent-skills/whitelist/add", {
        body: { skillName: "x" },
        locals: { multiUserMode: true },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 400 when add fails", async () => {
      mockUserFromSession.mockResolvedValue({ id: 1 });
      mockWhitelistAdd.mockResolvedValue({ success: false, error: "duplicate" });
      const { call } = buildApp();
      const res = await call("post", "/agent-skills/whitelist/add", {
        body: { skillName: "dup" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("duplicate");
    });

    it("returns 500 on exception", async () => {
      mockUserFromSession.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("post", "/agent-skills/whitelist/add", {
        body: { skillName: "x" },
      });
      expect(res.statusCode).toBe(500);
    });
  });
});
