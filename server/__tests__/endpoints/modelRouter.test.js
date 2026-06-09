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

const mockGetAllWithCounts = jest.fn();
const mockGetWithRulesAndCount = jest.fn();
const mockRouterCreate = jest.fn();
const mockRouterUpdate = jest.fn();
const mockRouterDelete = jest.fn();
jest.mock("../../models/modelRouter", () => ({
  ModelRouter: {
    getAllWithCounts: (...a) => mockGetAllWithCounts(...a),
    getWithRulesAndCount: (...a) => mockGetWithRulesAndCount(...a),
    create: (...a) => mockRouterCreate(...a),
    update: (...a) => mockRouterUpdate(...a),
    delete: (...a) => mockRouterDelete(...a),
  },
}));

const mockRuleCreate = jest.fn();
const mockRuleUpdate = jest.fn();
const mockRuleDelete = jest.fn();
const mockReorderRules = jest.fn();
jest.mock("../../models/modelRouterRule", () => ({
  ModelRouterRule: {
    create: (...a) => mockRuleCreate(...a),
    update: (...a) => mockRuleUpdate(...a),
    delete: (...a) => mockRuleDelete(...a),
    reorderRules: (...a) => mockReorderRules(...a),
  },
}));

const mockTelemetrySend = jest.fn().mockResolvedValue(undefined);
jest.mock("../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: (...a) => mockTelemetrySend(...a) },
}));

const mockInvalidate = jest.fn();
jest.mock("../../utils/router", () => ({
  ModelRouterService: { invalidateRouter: (...a) => mockInvalidate(...a) },
}));

const { createMockApp } = require("../helpers/mockExpressApp");
const { modelRouterEndpoints } = require("../../endpoints/modelRouter");

function buildApp() {
  const harness = createMockApp();
  modelRouterEndpoints(harness.app);
  return harness;
}

describe("Model Router endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("GET /model-routers", () => {
    it("returns all routers with counts", async () => {
      mockGetAllWithCounts.mockResolvedValue([
        { id: 1, name: "R1", ruleCount: 3 },
      ]);
      const { call } = buildApp();
      const res = await call("get", "/model-routers");
      expect(res.statusCode).toBe(200);
      expect(res.body.routers).toHaveLength(1);
    });

    it("returns 500 on exception", async () => {
      mockGetAllWithCounts.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("get", "/model-routers");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /model-routers/:id", () => {
    it("returns a router with rules", async () => {
      mockGetWithRulesAndCount.mockResolvedValue({
        id: 1,
        name: "R1",
        rules: [],
      });
      const { call } = buildApp();
      const res = await call("get", "/model-routers/:id", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.router.name).toBe("R1");
    });

    it("returns 404 when router not found", async () => {
      mockGetWithRulesAndCount.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("get", "/model-routers/:id", {
        params: { id: "99" },
      });
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it("returns 500 on exception", async () => {
      mockGetWithRulesAndCount.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("get", "/model-routers/:id", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /model-routers/new", () => {
    it("creates a new router", async () => {
      mockUserFromSession.mockResolvedValue({ id: 1 });
      const router = { id: 1, name: "NewRouter" };
      mockRouterCreate.mockResolvedValue({ router, error: null });
      const { call } = buildApp();
      const res = await call("post", "/model-routers/new", {
        body: { name: "NewRouter" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.router.name).toBe("NewRouter");
      expect(mockTelemetrySend).toHaveBeenCalledWith("model_router_created");
    });

    it("returns 400 when create fails", async () => {
      mockUserFromSession.mockResolvedValue({ id: 1 });
      mockRouterCreate.mockResolvedValue({ router: null, error: "bad data" });
      const { call } = buildApp();
      const res = await call("post", "/model-routers/new", {
        body: { name: "Bad" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on exception", async () => {
      mockUserFromSession.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("post", "/model-routers/new", {
        body: { name: "X" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("PUT /model-routers/:id", () => {
    it("updates a router and invalidates cache", async () => {
      const updated = { id: 1, name: "Updated" };
      mockRouterUpdate.mockResolvedValue({ router: updated, error: null });
      const { call } = buildApp();
      const res = await call("put", "/model-routers/:id", {
        params: { id: "1" },
        body: { name: "Updated" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.router.name).toBe("Updated");
      expect(mockInvalidate).toHaveBeenCalledWith(1);
    });

    it("returns 400 when update fails", async () => {
      mockRouterUpdate.mockResolvedValue({ router: null, error: "conflict" });
      const { call } = buildApp();
      const res = await call("put", "/model-routers/:id", {
        params: { id: "1" },
        body: { name: "X" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on exception", async () => {
      mockRouterUpdate.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("put", "/model-routers/:id", {
        params: { id: "1" },
        body: { name: "X" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /model-routers/:id", () => {
    it("deletes a router and invalidates cache", async () => {
      mockRouterDelete.mockResolvedValue(true);
      const { call } = buildApp();
      const res = await call("delete", "/model-routers/:id", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockInvalidate).toHaveBeenCalledWith(1);
    });

    it("returns 400 when delete fails", async () => {
      mockRouterDelete.mockResolvedValue(false);
      const { call } = buildApp();
      const res = await call("delete", "/model-routers/:id", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/failed to delete/i);
    });

    it("returns 500 on exception", async () => {
      mockRouterDelete.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("delete", "/model-routers/:id", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /model-routers/:id/rules/new", () => {
    it("creates a new rule and invalidates cache", async () => {
      mockUserFromSession.mockResolvedValue({ id: 1 });
      const rule = { id: 10, pattern: "foo" };
      mockRuleCreate.mockResolvedValue({ rule, error: null });
      const { call } = buildApp();
      const res = await call("post", "/model-routers/:id/rules/new", {
        params: { id: "1" },
        body: { pattern: "foo" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.rule.pattern).toBe("foo");
      expect(mockInvalidate).toHaveBeenCalledWith(1);
      expect(mockTelemetrySend).toHaveBeenCalledWith("model_router_rule_created");
    });

    it("returns 400 when rule create fails", async () => {
      mockUserFromSession.mockResolvedValue({ id: 1 });
      mockRuleCreate.mockResolvedValue({ rule: null, error: "bad" });
      const { call } = buildApp();
      const res = await call("post", "/model-routers/:id/rules/new", {
        params: { id: "1" },
        body: { pattern: "bad" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on exception", async () => {
      mockUserFromSession.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("post", "/model-routers/:id/rules/new", {
        params: { id: "1" },
        body: {},
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("PUT /model-routers/:id/rules/reorder", () => {
    it("reorders rules and invalidates cache", async () => {
      mockReorderRules.mockResolvedValue({ success: true, error: null });
      const { call } = buildApp();
      const res = await call("put", "/model-routers/:id/rules/reorder", {
        params: { id: "1" },
        body: { ruleUpdates: [{ id: 1, priority: 0 }, { id: 2, priority: 1 }] },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockInvalidate).toHaveBeenCalledWith(1);
    });

    it("rejects non-array ruleUpdates with 400", async () => {
      const { call } = buildApp();
      const res = await call("put", "/model-routers/:id/rules/reorder", {
        params: { id: "1" },
        body: { ruleUpdates: "not-array" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/ruleUpdates/i);
    });

    it("returns 400 when reorder fails", async () => {
      mockReorderRules.mockResolvedValue({ success: false, error: "bad order" });
      const { call } = buildApp();
      const res = await call("put", "/model-routers/:id/rules/reorder", {
        params: { id: "1" },
        body: { ruleUpdates: [] },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on exception", async () => {
      mockReorderRules.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("put", "/model-routers/:id/rules/reorder", {
        params: { id: "1" },
        body: { ruleUpdates: [] },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("PUT /model-routers/:id/rules/:ruleId", () => {
    it("updates a rule and invalidates cache", async () => {
      const rule = { id: 10, pattern: "updated" };
      mockRuleUpdate.mockResolvedValue({ rule, error: null });
      const { call } = buildApp();
      const res = await call("put", "/model-routers/:id/rules/:ruleId", {
        params: { id: "1", ruleId: "10" },
        body: { pattern: "updated" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.rule.pattern).toBe("updated");
      expect(mockInvalidate).toHaveBeenCalledWith(1);
    });

    it("returns 400 when rule update fails", async () => {
      mockRuleUpdate.mockResolvedValue({ rule: null, error: "bad" });
      const { call } = buildApp();
      const res = await call("put", "/model-routers/:id/rules/:ruleId", {
        params: { id: "1", ruleId: "10" },
        body: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on exception", async () => {
      mockRuleUpdate.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("put", "/model-routers/:id/rules/:ruleId", {
        params: { id: "1", ruleId: "10" },
        body: {},
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /model-routers/:id/rules/:ruleId", () => {
    it("deletes a rule and invalidates cache", async () => {
      mockRuleDelete.mockResolvedValue(true);
      const { call } = buildApp();
      const res = await call("delete", "/model-routers/:id/rules/:ruleId", {
        params: { id: "1", ruleId: "10" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockInvalidate).toHaveBeenCalledWith(1);
    });

    it("returns 400 when rule delete fails", async () => {
      mockRuleDelete.mockResolvedValue(false);
      const { call } = buildApp();
      const res = await call("delete", "/model-routers/:id/rules/:ruleId", {
        params: { id: "1", ruleId: "10" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/failed to delete/i);
    });

    it("returns 500 on exception", async () => {
      mockRuleDelete.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("delete", "/model-routers/:id/rules/:ruleId", {
        params: { id: "1", ruleId: "10" },
      });
      expect(res.statusCode).toBe(500);
    });
  });
});
