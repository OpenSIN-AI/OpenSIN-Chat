// SPDX-License-Identifier: MIT
jest.mock("../../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const mockOrchestrator = {
  startWorkflow: jest.fn(),
  listWorkflows: jest.fn(),
  getStatus: jest.fn(),
  getResults: jest.fn(),
};
jest.mock("../../../utils/orchestrator", () => ({
  getOrchestrator: jest.fn(() => mockOrchestrator),
}));

const { createMockApp } = require("../../helpers/mockExpressApp");
const { apiOrchestratorEndpoints } = require("../../../endpoints/api/orchestrator");

function buildApp() {
  const harness = createMockApp();
  apiOrchestratorEndpoints(harness.app);
  return harness;
}

describe("Orchestrator REST endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("POST /orchestrator/start validation", () => {
    it("rejects a missing goal with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/orchestrator/start", { body: {} });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/goal is required/);
      expect(mockOrchestrator.startWorkflow).not.toHaveBeenCalled();
    });

    it("rejects an overlong goal with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/orchestrator/start", {
        body: { goal: "x".repeat(2001) },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/2000 characters/);
    });

    it("rejects non-array steps with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/orchestrator/start", {
        body: { goal: "test", steps: "nope" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/steps/);
    });

    it("rejects non-object options with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/orchestrator/start", {
        body: { goal: "test", options: [1, 2] },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/options/);
    });

    it("accepts a valid goal", async () => {
      mockOrchestrator.startWorkflow.mockResolvedValue({ workflowId: "wf1" });
      const { call } = buildApp();
      const res = await call("post", "/orchestrator/start", {
        body: { goal: "Recherche und Bericht" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.workflowId).toBe("wf1");
      expect(mockOrchestrator.startWorkflow).toHaveBeenCalledWith({
        goal: "Recherche und Bericht",
        steps: undefined,
        options: undefined,
      });
    });

    it("returns a generic 500 when the orchestrator throws", async () => {
      mockOrchestrator.startWorkflow.mockRejectedValue(new Error("secret detail"));
      const { call } = buildApp();
      const res = await call("post", "/orchestrator/start", {
        body: { goal: "test" },
      });
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal Server Error");
    });
  });

  describe("GET /orchestrator/list", () => {
    it("returns the workflow list", async () => {
      mockOrchestrator.listWorkflows.mockReturnValue([{ id: "wf1" }]);
      const { call } = buildApp();
      const res = await call("get", "/orchestrator/list");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ workflows: [{ id: "wf1" }] });
    });

    it("returns 500 JSON on error", async () => {
      mockOrchestrator.listWorkflows.mockImplementation(() => {
        throw new Error("boom");
      });
      const { call } = buildApp();
      const res = await call("get", "/orchestrator/list");
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Internal Server Error" });
    });
  });

  describe("GET /orchestrator/:id", () => {
    it("returns 404 for unknown workflows", async () => {
      mockOrchestrator.getStatus.mockReturnValue(null);
      const { call } = buildApp();
      const res = await call("get", "/orchestrator/:id", {
        params: { id: "nope" },
      });
      expect(res.statusCode).toBe(404);
    });

    it("returns status when found", async () => {
      mockOrchestrator.getStatus.mockReturnValue({ workflowId: "wf1" });
      const { call } = buildApp();
      const res = await call("get", "/orchestrator/:id", {
        params: { id: "wf1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.workflowId).toBe("wf1");
    });
  });

  describe("GET /orchestrator/:id/result", () => {
    it("returns 404 when results are missing", async () => {
      mockOrchestrator.getResults.mockReturnValue(null);
      const { call } = buildApp();
      const res = await call("get", "/orchestrator/:id/result", {
        params: { id: "nope" },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
