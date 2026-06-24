// SPDX-License-Identifier: MIT
/**
 * Tests for PoliticianDB._textSearchSpeeches and the semantic-to-text
 * fallback path in semanticSearchSpeeches.
 *
 * The text search is the fallback when the vector store is unavailable
 * or returns an error. It uses Prisma's `contains` filter (case-insensitive
 * on SQLite via default LIKE behaviour).
 *
 * Docs: server/utils/politician/index.js
 * Purpose: Verify fallback query construction, result mapping, and error handling.
 */

// Mock prisma before requiring the module under test.
jest.mock("../../../utils/prisma", () => {
  const mockFindMany = jest.fn();
  return {
    politicians: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
    politician_speeches: { findMany: mockFindMany },
    politician_sync_retry: { findMany: jest.fn() },
  };
});

// Mock the API/scraper/vectorStore constructors so PoliticianDB
// can be instantiated without network or DB dependencies.
jest.mock("../../../utils/politician/bundestagApi", () => ({
  BundestagApi: jest.fn().mockImplementation(() => ({
    getParliamentMembers: jest.fn(),
    getPoliticianDetails: jest.fn(),
  })),
}));

jest.mock("../../../utils/politician/abgeordnetenwatchApi", () => ({
  AbgeordnetenwatchApi: jest.fn().mockImplementation(() => ({
    getParliamentMembers: jest.fn(),
  })),
}));

jest.mock("../../../utils/politician/plenarScraper", () => ({
  PlenarScraper: jest.fn().mockImplementation(() => ({
    scrapeSpeeches: jest.fn(),
  })),
}));

jest.mock("../../../utils/politician/vectorStore", () => ({
  PoliticianVectorStore: jest.fn().mockImplementation(() => ({
    searchSpeeches: jest.fn(),
  })),
}));

const prisma = require("../../../utils/prisma");
const { PoliticianDB } = require("../../../utils/politician/index");

function makeSpeech(overrides = {}) {
  return {
    id: "speech-1",
    politicianId: "pol-1",
    speechTitle: "Budget Debate",
    speechText: "We must invest in infrastructure.",
    speechDate: new Date("2026-06-01"),
    documentUrl: "https://example.com/doc",
    speakerName: "Jane Doe",
    speakerParty: "SPD",
    session: "123",
    sitting: "45",
    ...overrides,
  };
}

describe("PoliticianDB._textSearchSpeeches", () => {
  let db;

  beforeEach(() => {
    db = new PoliticianDB();
    jest.clearAllMocks();
  });

  test("returns formatted results with metadata and score 0", async () => {
    prisma.politician_speeches.findMany.mockResolvedValue([makeSpeech()]);

    const results = await db._textSearchSpeeches("infrastructure");

    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("We must invest in infrastructure.");
    expect(results[0].score).toBe(0);
    expect(results[0].metadata.speechId).toBe("speech-1");
    expect(results[0].metadata.politicianName).toBe("Jane Doe");
    expect(results[0].metadata.party).toBe("SPD");
    expect(results[0].metadata.title).toBe("Budget Debate");
  });

  test("passes the query as a case-insensitive contains filter", async () => {
    prisma.politician_speeches.findMany.mockResolvedValue([]);

    await db._textSearchSpeeches("climate");

    const callArg = prisma.politician_speeches.findMany.mock.calls[0][0];
    // SQLite LIKE is already case-insensitive for ASCII — no `mode` property.
    expect(callArg.where.speechText).toEqual({
      contains: "climate",
    });
  });

  test("applies party filter when provided", async () => {
    prisma.politician_speeches.findMany.mockResolvedValue([]);

    await db._textSearchSpeeches("budget", { party: "Green" });

    const callArg = prisma.politician_speeches.findMany.mock.calls[0][0];
    expect(callArg.where.speakerParty).toEqual({
      contains: "Green",
    });
  });

  test("applies source filter when not all/plenarprotokolle", async () => {
    prisma.politician_speeches.findMany.mockResolvedValue([]);

    await db._textSearchSpeeches("budget", { source: "bundestag" });

    const callArg = prisma.politician_speeches.findMany.mock.calls[0][0];
    expect(callArg.where.politician).toEqual({ is: { source: "bundestag" } });
  });

  test("does not apply source filter for all", async () => {
    prisma.politician_speeches.findMany.mockResolvedValue([]);

    await db._textSearchSpeeches("budget", { source: "all" });

    const callArg = prisma.politician_speeches.findMany.mock.calls[0][0];
    expect(callArg.where.politician).toBeUndefined();
  });

  test("respects topN filter (take)", async () => {
    prisma.politician_speeches.findMany.mockResolvedValue([]);

    await db._textSearchSpeeches("budget", { topN: 5 });

    const callArg = prisma.politician_speeches.findMany.mock.calls[0][0];
    expect(callArg.take).toBe(5);
  });

  test("defaults take to 10 when topN is not provided", async () => {
    prisma.politician_speeches.findMany.mockResolvedValue([]);

    await db._textSearchSpeeches("budget");

    const callArg = prisma.politician_speeches.findMany.mock.calls[0][0];
    expect(callArg.take).toBe(10);
  });

  test("returns empty array when prisma throws", async () => {
    prisma.politician_speeches.findMany.mockRejectedValue(
      new Error("DB connection lost"),
    );

    const results = await db._textSearchSpeeches("budget");

    expect(results).toEqual([]);
  });
});

describe("PoliticianDB.semanticSearchSpeeches — fallback to text search", () => {
  let db;

  beforeEach(() => {
    db = new PoliticianDB();
    jest.clearAllMocks();
  });

  test("falls back to text search when vector store returns an error", async () => {
    db.vectorStore.searchSpeeches.mockResolvedValue({
      results: [],
      error: "vector store unavailable",
    });
    prisma.politician_speeches.findMany.mockResolvedValue([makeSpeech()]);

    const results = await db.semanticSearchSpeeches("infrastructure");

    expect(db.vectorStore.searchSpeeches).toHaveBeenCalledWith({
      query: "infrastructure",
      topN: 10,
      similarityThreshold: 0.25,
      party: null,
    });
    expect(prisma.politician_speeches.findMany).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].text).toBe("We must invest in infrastructure.");
  });

  test("does not fall back when vector search succeeds with results", async () => {
    const vectorResults = [
      {
        text: "vector result",
        metadata: { politicianId: "pol-1" },
        score: 0.85,
      },
    ];
    db.vectorStore.searchSpeeches.mockResolvedValue({
      results: vectorResults,
      error: null,
    });
    // If this were called, it would mean fallback was incorrectly triggered
    prisma.politician_speeches.findMany.mockResolvedValue([]);

    const results = await db.semanticSearchSpeeches("test", {
      source: "all",
    });

    expect(prisma.politician_speeches.findMany).not.toHaveBeenCalled();
    expect(results).toEqual(vectorResults);
  });
});
