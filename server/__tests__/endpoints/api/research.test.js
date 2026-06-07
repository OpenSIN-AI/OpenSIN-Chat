// SPDX-License-Identifier: MIT
jest.mock("../../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const mockPipeline = {
  startResearch: jest.fn(),
  listJobs: jest.fn(),
  getStatus: jest.fn(),
  getResults: jest.fn(),
};
jest.mock("../../../utils/research", () => ({
  getResearchPipeline: jest.fn(() => mockPipeline),
}));

const { createMockApp } = require("../../helpers/mockExpressApp");
const { apiResearchEndpoints } = require("../../../endpoints/api/research");

function buildApp() {
  const harness = createMockApp();
  apiResearchEndpoints(harness.app);
  return harness;
}

describe("Research REST endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("POST /research/start validation", () => {
    it("rejects a missing query with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/research/start", { body: {} });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/query is required/);
      expect(mockPipeline.startResearch).not.toHaveBeenCalled();
    });

    it("rejects a blank query with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/research/start", { body: { query: "   " } });
      expect(res.statusCode).toBe(400);
    });

    it("rejects an overlong query with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/research/start", {
        body: { query: "x".repeat(2001) },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/2000 characters/);
    });

    it("rejects an invalid depth with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/research/start", {
        body: { query: "test", depth: "ultra" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/depth/);
    });

    it("rejects unknown sources with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/research/start", {
        body: { query: "test", sources: ["web", "tiktok"] },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/sources/);
    });

    it("rejects an empty sources array with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/research/start", {
        body: { query: "test", sources: [] },
      });
      expect(res.statusCode).toBe(400);
    });

    it("accepts a valid payload and forwards defaults", async () => {
      mockPipeline.startResearch.mockResolvedValue({ jobId: "abc" });
      const { call } = buildApp();
      const res = await call("post", "/research/start", {
        body: { query: "Energiepolitik" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ jobId: "abc" });
      expect(mockPipeline.startResearch).toHaveBeenCalledWith({
        query: "Energiepolitik",
        depth: "quick",
        sources: ["web", "politician"],
        workspaceId: null,
      });
    });

    it("returns 500 with a generic message when the pipeline throws", async () => {
      mockPipeline.startResearch.mockRejectedValue(new Error("boom"));
      const { call } = buildApp();
      const res = await call("post", "/research/start", {
        body: { query: "test" },
      });
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal Server Error");
      expect(res.body.error).not.toMatch(/boom/);
    });
  });

  describe("GET /research/list", () => {
    it("returns the job list", async () => {
      mockPipeline.listJobs.mockReturnValue([{ id: "1" }]);
      const { call } = buildApp();
      const res = await call("get", "/research/list");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ jobs: [{ id: "1" }] });
    });

    it("returns 500 JSON (not the buggy sendStatus) on error", async () => {
      mockPipeline.listJobs.mockImplementation(() => {
        throw new Error("db down");
      });
      const { call } = buildApp();
      const res = await call("get", "/research/list");
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Internal Server Error" });
    });
  });

  describe("GET /research/:id", () => {
    it("returns 404 when the job is unknown", async () => {
      mockPipeline.getStatus.mockReturnValue(null);
      const { call } = buildApp();
      const res = await call("get", "/research/:id", { params: { id: "nope" } });
      expect(res.statusCode).toBe(404);
    });

    it("returns the status when found", async () => {
      mockPipeline.getStatus.mockReturnValue({ id: "1", status: "done" });
      const { call } = buildApp();
      const res = await call("get", "/research/:id", { params: { id: "1" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("done");
    });
  });

  describe("GET /research/:id/result", () => {
    it("returns 404 when results are missing", async () => {
      mockPipeline.getResults.mockReturnValue(null);
      const { call } = buildApp();
      const res = await call("get", "/research/:id/result", {
        params: { id: "nope" },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
