// SPDX-License-Identifier: MIT


jest.mock("../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("../../utils/agentFlows", () => ({
  AgentFlows: {
    saveFlow: jest.fn(),
    loadFlow: jest.fn(),
    listFlows: jest.fn(),
    deleteFlow: jest.fn(),
    runFlow: jest.fn(),
    stopFlow: jest.fn(),
    getFlowLogs: jest.fn(),
  },
}));
jest.mock("../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: jest.fn() },
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  ROLES: { admin: "admin", manager: "manager", user: "user", all: "all" },
  flexUserRoleValid: () => (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));

const { AgentFlows } = require("../../utils/agentFlows");
const { Telemetry } = require("../../models/telemetry");
const { createMockApp } = require("../helpers/mockExpressApp");
const { agentFlowEndpoints } = require("../../endpoints/agentFlows");

function buildApp() {
  const harness = createMockApp();
  agentFlowEndpoints(harness.app);
  return harness;
}

describe("agentFlowEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    Telemetry.sendTelemetry.mockResolvedValue();
  });
  afterEach(() => jest.clearAllMocks());

  describe("POST /agent-flows/save", () => {
    it("saves a flow", async () => {
      AgentFlows.saveFlow.mockReturnValue({ success: true, uuid: "abc" });
      const res = await app.call("post", "/agent-flows/save", {
        body: { name: "flow1", config: { blocks: [] } },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 400 when name missing", async () => {
      const res = await app.call("post", "/agent-flows/save", {
        body: { config: {} },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 400 when config missing", async () => {
      const res = await app.call("post", "/agent-flows/save", {
        body: { name: "flow1" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns error when saveFlow fails", async () => {
      AgentFlows.saveFlow.mockReturnValue({ success: false, error: "bad" });
      const res = await app.call("post", "/agent-flows/save", {
        body: { name: "flow1", config: {} },
      });
      expect(res.body.error).toBe("bad");
    });

    it("sends telemetry on new flow (no uuid)", async () => {
      AgentFlows.saveFlow.mockReturnValue({ success: true, uuid: "new" });
      await app.call("post", "/agent-flows/save", {
        body: { name: "flow1", config: { blocks: [1, 2] } },
      });
      expect(Telemetry.sendTelemetry).toHaveBeenCalledWith("agent_flow_created", { blockCount: 2 });
    });

    it("skips telemetry on update (with uuid)", async () => {
      AgentFlows.saveFlow.mockReturnValue({ success: true });
      await app.call("post", "/agent-flows/save", {
        body: { name: "flow1", config: {}, uuid: "existing" },
      });
      expect(Telemetry.sendTelemetry).not.toHaveBeenCalled();
    });

    it("returns 500 on exception", async () => {
      AgentFlows.saveFlow.mockImplementation(() => { throw new Error("boom"); });
      const res = await app.call("post", "/agent-flows/save", {
        body: { name: "f", config: {} },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /agent-flows/list", () => {
    it("lists flows", async () => {
      AgentFlows.listFlows.mockReturnValue([{ name: "f1" }]);
      const res = await app.call("get", "/agent-flows/list");
      expect(res.statusCode).toBe(200);
      expect(res.body.flows).toHaveLength(1);
    });

    it("returns 500 on error", async () => {
      AgentFlows.listFlows.mockImplementation(() => { throw new Error("fail"); });
      const res = await app.call("get", "/agent-flows/list");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /agent-flows/:uuid", () => {
    it("gets a flow by uuid", async () => {
      AgentFlows.loadFlow.mockReturnValue({ name: "f1", config: {} });
      const res = await app.call("get", "/agent-flows/abc-123");
      expect(res.statusCode).toBe(200);
      expect(res.body.flow.name).toBe("f1");
    });

    it("returns 404 when flow not found", async () => {
      AgentFlows.loadFlow.mockReturnValue(null);
      const res = await app.call("get", "/agent-flows/missing");
      expect(res.statusCode).toBe(404);
    });

    it("returns 500 on error", async () => {
      AgentFlows.loadFlow.mockImplementation(() => { throw new Error("fail"); });
      const res = await app.call("get", "/agent-flows/bad");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /agent-flows/:uuid", () => {
    it("deletes a flow", async () => {
      AgentFlows.deleteFlow.mockReturnValue({ success: true });
      const res = await app.call("delete", "/agent-flows/abc");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 500 when delete fails", async () => {
      AgentFlows.deleteFlow.mockReturnValue({ success: false });
      const res = await app.call("delete", "/agent-flows/abc");
      expect(res.statusCode).toBe(500);
    });

    it("returns 500 on exception", async () => {
      AgentFlows.deleteFlow.mockImplementation(() => { throw new Error("fail"); });
      const res = await app.call("delete", "/agent-flows/abc");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /agent-flows/:uuid/toggle", () => {
    it("toggles flow active status", async () => {
      AgentFlows.loadFlow.mockReturnValue({ name: "f1", config: { active: false } });
      AgentFlows.saveFlow.mockReturnValue({ success: true });
      const res = await app.call("post", "/agent-flows/abc/toggle", {
        body: { active: true },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 404 when flow not found", async () => {
      AgentFlows.loadFlow.mockReturnValue(null);
      const res = await app.call("post", "/agent-flows/missing/toggle", {
        body: { active: true },
      });
      expect(res.statusCode).toBe(404);
    });

    it("returns 500 when save fails", async () => {
      AgentFlows.loadFlow.mockReturnValue({ name: "f1", config: {} });
      AgentFlows.saveFlow.mockReturnValue({ success: false });
      const res = await app.call("post", "/agent-flows/abc/toggle", {
        body: { active: true },
      });
      expect(res.statusCode).toBe(500);
    });

    it("returns 500 on exception", async () => {
      AgentFlows.loadFlow.mockImplementation(() => { throw new Error("fail"); });
      const res = await app.call("post", "/agent-flows/abc/toggle", {
        body: { active: true },
      });
      expect(res.statusCode).toBe(500);
    });
  });
});
