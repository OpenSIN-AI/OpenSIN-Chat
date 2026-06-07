// SPDX-License-Identifier: MIT
jest.mock("../../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const mockDB = {
  searchPoliticians: jest.fn(),
  semanticSearchSpeeches: jest.fn(),
  getParties: jest.fn(),
  getStates: jest.fn(),
  getSources: jest.fn(),
  getSyncStatus: jest.fn(),
  getPolitician: jest.fn(),
  getVotingRecord: jest.fn(),
  getSpeeches: jest.fn(),
  getMandates: jest.fn(),
  count: jest.fn(),
  vectorStore: { stats: jest.fn() },
};
jest.mock("../../../utils/politician", () => ({
  PoliticianDB: jest.fn(() => mockDB),
}));

const { createMockApp } = require("../../helpers/mockExpressApp");
const { apiPoliticianEndpoints } = require("../../../endpoints/api/politician");

function buildApp() {
  const harness = createMockApp();
  apiPoliticianEndpoints(harness.app);
  return harness;
}

describe("Politician REST endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("GET /politician/search", () => {
    it("passes filters through and returns totals", async () => {
      mockDB.searchPoliticians.mockResolvedValue([{ id: "1" }, { id: "2" }]);
      const { call } = buildApp();
      const res = await call("get", "/politician/search", {
        query: { q: "Müller", party: "AfD", state: "Berlin" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(2);
      expect(mockDB.searchPoliticians).toHaveBeenCalledWith("Müller", {
        party: "AfD",
        state: "Berlin",
      });
    });

    it("returns 500 JSON on error", async () => {
      mockDB.searchPoliticians.mockRejectedValue(new Error("db"));
      const { call } = buildApp();
      const res = await call("get", "/politician/search");
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: "Internal Server Error" });
    });
  });

  describe("GET /politician/speech-search", () => {
    it("requires q", async () => {
      const { call } = buildApp();
      const res = await call("get", "/politician/speech-search", { query: {} });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/'q'/);
    });

    it("clamps topN to the maximum", async () => {
      mockDB.semanticSearchSpeeches.mockResolvedValue([]);
      const { call } = buildApp();
      await call("get", "/politician/speech-search", {
        query: { q: "Energie", topN: "9999" },
      });
      expect(mockDB.semanticSearchSpeeches).toHaveBeenCalledWith(
        "Energie",
        expect.objectContaining({ topN: 100 }),
      );
    });

    it("falls back to default topN when not an integer", async () => {
      mockDB.semanticSearchSpeeches.mockResolvedValue([]);
      const { call } = buildApp();
      await call("get", "/politician/speech-search", {
        query: { q: "Energie", topN: "abc" },
      });
      expect(mockDB.semanticSearchSpeeches).toHaveBeenCalledWith(
        "Energie",
        expect.objectContaining({ topN: 10 }),
      );
    });
  });

  describe("GET /politician/:id", () => {
    it("returns 404 when not found", async () => {
      mockDB.getPolitician.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("get", "/politician/:id", { params: { id: "x" } });
      expect(res.statusCode).toBe(404);
    });

    it("returns the politician when found", async () => {
      mockDB.getPolitician.mockResolvedValue({ id: "1", fullName: "Max" });
      const { call } = buildApp();
      const res = await call("get", "/politician/:id", { params: { id: "1" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.politician.fullName).toBe("Max");
    });
  });

  describe("GET /politician/:id/votes", () => {
    it("returns 404 when the politician is unknown", async () => {
      mockDB.getPolitician.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("get", "/politician/:id/votes", {
        params: { id: "x" },
      });
      expect(res.statusCode).toBe(404);
      expect(mockDB.getVotingRecord).not.toHaveBeenCalled();
    });

    it("clamps an oversized limit and forwards offset", async () => {
      mockDB.getPolitician.mockResolvedValue({ id: "1" });
      mockDB.getVotingRecord.mockResolvedValue([]);
      const { call } = buildApp();
      await call("get", "/politician/:id/votes", {
        params: { id: "1" },
        query: { limit: "5000", offset: "20" },
      });
      expect(mockDB.getVotingRecord).toHaveBeenCalledWith("1", {
        limit: 200,
        offset: 20,
      });
    });

    it("rejects a negative limit by clamping to the minimum", async () => {
      mockDB.getPolitician.mockResolvedValue({ id: "1" });
      mockDB.getVotingRecord.mockResolvedValue([]);
      const { call } = buildApp();
      await call("get", "/politician/:id/votes", {
        params: { id: "1" },
        query: { limit: "-10" },
      });
      expect(mockDB.getVotingRecord).toHaveBeenCalledWith("1", {
        limit: 1,
        offset: 0,
      });
    });
  });

  describe("GET /politician/:id/speeches", () => {
    it("clamps the limit and forwards the source filter", async () => {
      mockDB.getPolitician.mockResolvedValue({ id: "1" });
      mockDB.getSpeeches.mockResolvedValue([]);
      const { call } = buildApp();
      await call("get", "/politician/:id/speeches", {
        params: { id: "1" },
        query: { limit: "9999", source: "bundestag" },
      });
      expect(mockDB.getSpeeches).toHaveBeenCalledWith("1", {
        limit: 200,
        offset: 0,
        source: "bundestag",
      });
    });
  });

  describe("GET /politician/sources", () => {
    it("returns the available sources", async () => {
      mockDB.getSources.mockResolvedValue([{ source: "bundestag", count: 5 }]);
      const { call } = buildApp();
      const res = await call("get", "/politician/sources");
      expect(res.statusCode).toBe(200);
      expect(res.body.sources).toHaveLength(1);
    });
  });
});
