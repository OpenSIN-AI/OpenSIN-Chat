// SPDX-License-Identifier: MIT
/**
 * Tests for ResearchPipeline — the deep-research orchestrator.
 *
 * Covers: job creation, status reporting, results retrieval, the full
 * search→extract→summarize pipeline, the Vane fast path, fallback summary,
 * job listing, capacity limits, and the singleton factory.
 *
 * All external dependencies (web search, Vane, content extraction, LLM
 * summarization, politician DB, SystemSettings) are mocked.
 *
 * Docs: server/utils/research/index.js
 * Purpose: Verify the pipeline's public API and async lifecycle without
 * network or LLM calls.
 */

// ── Mocks ────────────────────────────────────────────────────────────

jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: {
    get: jest.fn(),
    getValueOrFallback: jest.fn(),
  },
}));

jest.mock("../../../utils/research/webSearchEngine", () => ({
  WebSearchEngine: {
    search: jest.fn(),
  },
}));

jest.mock("../../../utils/research/vaneClient", () => ({
  VaneClient: {
    isAvailable: jest.fn(),
    answer: jest.fn(),
  },
}));

jest.mock("../../../utils/research/contentExtractor", () => ({
  ContentExtractor: {
    extract: jest.fn(),
  },
}));

jest.mock("../../../utils/research/summarizer", () => ({
  LLMSummarizer: {
    summarize: jest.fn(),
  },
}));

jest.mock("../../../utils/politician", () => ({
  PoliticianDB: jest.fn().mockImplementation(() => ({
    searchPoliticians: jest.fn(),
  })),
}));

const { SystemSettings } = require("../../../models/systemSettings");
const { WebSearchEngine } = require("../../../utils/research/webSearchEngine");
const { VaneClient } = require("../../../utils/research/vaneClient");
const {
  ContentExtractor,
} = require("../../../utils/research/contentExtractor");
const { LLMSummarizer } = require("../../../utils/research/summarizer");
const { PoliticianDB } = require("../../../utils/politician");
const {
  ResearchPipeline,
  getResearchPipeline,
} = require("../../../utils/research/index");

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Poll getStatus until the job reaches a terminal state (completed/failed)
 * or the timeout expires. The pipeline runs #runPipeline async (fire-and-
 * forget), so callers must wait for it to settle before asserting on
 * terminal fields.
 */
async function waitForTerminal(pipeline, jobId, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const st = pipeline.getStatus(jobId);
    if (st && (st.status === "completed" || st.status === "failed"))
      return st;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`Job ${jobId} did not reach terminal state in ${timeoutMs}ms`);
}

describe("ResearchPipeline", () => {
  let pipeline;
  let logSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no provider configured → classic pipeline (no Vane fast path)
    SystemSettings.get.mockResolvedValue(null);
    WebSearchEngine.search.mockResolvedValue([]);
    VaneClient.isAvailable.mockResolvedValue(false);
    VaneClient.answer.mockResolvedValue(null);
    ContentExtractor.extract.mockResolvedValue("extracted content");
    LLMSummarizer.summarize.mockResolvedValue("LLM summary");
    // PoliticianDB constructor mock already returns instance; set the
    // searchPoliticians return on the prototype instance per test.
    const mockDb = {
      searchPoliticians: jest.fn().mockResolvedValue([]),
    };
    PoliticianDB.mockImplementation(() => mockDb);
    // Suppress pipeline log noise in test output
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    pipeline = new ResearchPipeline();
  });

  afterEach(() => {
    logSpy.mockRestore();
    delete process.env.RESEARCH_MAX_ACTIVE;
    delete process.env.RESEARCH_MAX_JOBS;
  });

  // ── startResearch validation ───────────────────────────────────────

  describe("startResearch — validation", () => {
    test("throws if query is empty or whitespace", async () => {
      await expect(pipeline.startResearch({ query: "" })).rejects.toThrow(
        /query is required/i,
      );
      await expect(pipeline.startResearch({ query: "   " })).rejects.toThrow(
        /query is required/i,
      );
    });

    test("throws if query is missing", async () => {
      await expect(pipeline.startResearch({})).rejects.toThrow(
        /query is required/i,
      );
    });

    test("returns { jobId, status: 'started' } with a UUID", async () => {
      const res = await pipeline.startResearch({ query: "climate policy" });
      expect(res.status).toBe("started");
      expect(res.jobId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    test("applies default depth and sources when omitted", async () => {
      const res = await pipeline.startResearch({ query: "test query" });
      const st = pipeline.getStatus(res.jobId);
      expect(st.depth).toBe("quick");
      expect(st.sources).toEqual(["web", "politician"]);
    });
  });

  // ── getStatus ──────────────────────────────────────────────────────

  describe("getStatus", () => {
    test("returns null for an unknown jobId", () => {
      expect(pipeline.getStatus("nonexistent")).toBeNull();
    });

    test("returns job metadata for a known jobId", async () => {
      const res = await pipeline.startResearch({
        query: "AfD energy policy",
        depth: "deep",
        sources: ["web"],
      });
      const st = pipeline.getStatus(res.jobId);
      expect(st.jobId).toBe(res.jobId);
      expect(st.query).toBe("AfD energy policy");
      expect(st.depth).toBe("deep");
      expect(st.sources).toEqual(["web"]);
      expect(st.error).toBeNull();
      expect(st.createdAt).toBeInstanceOf(Date);
      expect(st.progress).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(st.steps)).toBe(true);
    });
  });

  // ── getResults ─────────────────────────────────────────────────────

  describe("getResults", () => {
    test("returns null for an unknown jobId", () => {
      expect(pipeline.getResults("nonexistent")).toBeNull();
    });

    test("returns { status, progress } while job is not completed", async () => {
      // Hang the pipeline so the job stays non-terminal.
      SystemSettings.get.mockReturnValue(new Promise(() => {}));
      const res = await pipeline.startResearch({ query: "pending job" });
      const results = pipeline.getResults(res.jobId);
      expect(results).not.toBeNull();
      expect(results.status).not.toBe("completed");
      expect(typeof results.progress).toBe("number");
    });

    test("returns full results after completion", async () => {
      WebSearchEngine.search.mockResolvedValue([
        { title: "Result 1", link: "http://example.com/1", snippet: "Snippet 1" },
      ]);
      const res = await pipeline.startResearch({
        query: "completed job",
        sources: ["web", "politician"],
      });
      await waitForTerminal(pipeline, res.jobId);

      const results = pipeline.getResults(res.jobId);
      expect(results.status).not.toBe("pending");
      expect(results.summary).toBe("LLM summary");
      expect(results.searchResults).toHaveLength(1);
      expect(results.searchResults[0].title).toBe("Result 1");
      expect(results.extractedContent).toHaveLength(1);
      expect(results.sources).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Full classic pipeline ──────────────────────────────────────────

  describe("classic pipeline (search → extract → summarize)", () => {
    test("completes with search, extract, and summarize steps", async () => {
      WebSearchEngine.search.mockResolvedValue([
        {
          title: "Energy Policy",
          link: "http://example.com/energy",
          snippet: "Snippet about energy",
        },
      ]);
      ContentExtractor.extract.mockResolvedValue("Long extracted text");
      LLMSummarizer.summarize.mockResolvedValue("Final summary");

      const res = await pipeline.startResearch({
        query: "German energy transition",
        depth: "quick",
        sources: ["web", "politician"],
      });
      const final = await waitForTerminal(pipeline, res.jobId);

      expect(final.status).toBe("completed");
      expect(final.progress).toBe(100);
      const stepNames = final.steps.map((s) => s.name);
      expect(stepNames).toContain("search");
      expect(stepNames).toContain("extract");
      expect(stepNames).toContain("summarize");
      final.steps.forEach((s) => expect(s.status).toBe("completed"));

      expect(WebSearchEngine.search).toHaveBeenCalledWith(
        "German energy transition",
      );
      expect(ContentExtractor.extract).toHaveBeenCalledWith(
        "http://example.com/energy",
      );
      expect(LLMSummarizer.summarize).toHaveBeenCalledTimes(1);
    });

    test("does not call web search when sources exclude 'web'", async () => {
      WebSearchEngine.search.mockResolvedValue([]);
      const res = await pipeline.startResearch({
        query: "politician only",
        sources: ["politician"],
      });
      await waitForTerminal(pipeline, res.jobId);
      expect(WebSearchEngine.search).not.toHaveBeenCalled();
    });

    test("does not call politician search when sources exclude 'politician'", async () => {
      WebSearchEngine.search.mockResolvedValue([
        { title: "T", link: "http://x", snippet: "S" },
      ]);
      const res = await pipeline.startResearch({
        query: "web only",
        sources: ["web"],
      });
      await waitForTerminal(pipeline, res.jobId);
      expect(PoliticianDB).not.toHaveBeenCalled();
    });

    test("expands query into multiple searches for depth='deep'", async () => {
      WebSearchEngine.search.mockResolvedValue([]);
      const res = await pipeline.startResearch({
        query: "climate change policy debate",
        depth: "deep",
        sources: ["web"],
      });
      await waitForTerminal(pipeline, res.jobId);
      // quick → 1 call; deep with >2 keywords >3 chars → 3 expansions
      expect(WebSearchEngine.search.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    test("uses fallback summary when LLM summarizer throws", async () => {
      WebSearchEngine.search.mockResolvedValue([
        { title: "Fallback", link: "http://fb", snippet: "FB snippet" },
      ]);
      LLMSummarizer.summarize.mockRejectedValue(new Error("LLM down"));

      const res = await pipeline.startResearch({ query: "fallback test" });
      const final = await waitForTerminal(pipeline, res.jobId);

      expect(final.status).toBe("completed");
      const results = pipeline.getResults(res.jobId);
      expect(results.summary).toContain("Recherche:");
      expect(results.summary).toContain("Web-Ergebnisse");
    });

    test("resilient to web search errors — completes with empty results", async () => {
      WebSearchEngine.search.mockRejectedValue(new Error("search engine down"));
      const res = await pipeline.startResearch({
        query: "resilience",
        sources: ["web"],
      });
      // #webSearch catches internally, so the pipeline still completes.
      const final = await waitForTerminal(pipeline, res.jobId);
      expect(final.status).toBe("completed");
      const results = pipeline.getResults(res.jobId);
      expect(results.searchResults).toHaveLength(0);
    });
  });

  // ── Vane fast path ─────────────────────────────────────────────────

  describe("Vane fast path", () => {
    test("completes via Vane when provider is 'vane' and available", async () => {
      SystemSettings.get.mockResolvedValue({ value: "vane" });
      VaneClient.isAvailable.mockResolvedValue(true);
      VaneClient.answer.mockResolvedValue({
        message: "Vane answer text",
        sources: [
          {
            metadata: { url: "http://vane/1", title: "Vane Source" },
            content: "source content here",
          },
        ],
      });

      const res = await pipeline.startResearch({
        query: "vane query",
        sources: ["web", "politician"],
      });
      const final = await waitForTerminal(pipeline, res.jobId);

      expect(final.status).toBe("completed");
      expect(VaneClient.answer).toHaveBeenCalledTimes(1);
      // Vane handles web; politician DB still runs separately
      expect(PoliticianDB).toHaveBeenCalled();

      const results = pipeline.getResults(res.jobId);
      expect(results.summary).toBe("Vane answer text");
      expect(results.searchResults).toHaveLength(1);
      expect(results.searchResults[0].link).toBe("http://vane/1");
    });

    test("falls back to classic pipeline when Vane is unavailable", async () => {
      SystemSettings.get.mockResolvedValue({ value: "vane" });
      VaneClient.isAvailable.mockResolvedValue(false);
      WebSearchEngine.search.mockResolvedValue([
        { title: "Classic", link: "http://c", snippet: "s" },
      ]);

      const res = await pipeline.startResearch({
        query: "fallback to classic",
        sources: ["web"],
      });
      const final = await waitForTerminal(pipeline, res.jobId);

      expect(final.status).toBe("completed");
      expect(VaneClient.answer).not.toHaveBeenCalled();
      expect(WebSearchEngine.search).toHaveBeenCalled();
    });

    test("falls back when Vane answer returns null", async () => {
      SystemSettings.get.mockResolvedValue({ value: "vane" });
      VaneClient.isAvailable.mockResolvedValue(true);
      VaneClient.answer.mockResolvedValue(null);
      WebSearchEngine.search.mockResolvedValue([]);

      const res = await pipeline.startResearch({
        query: "null vane",
        sources: ["web"],
      });
      const final = await waitForTerminal(pipeline, res.jobId);

      expect(final.status).toBe("completed");
      expect(WebSearchEngine.search).toHaveBeenCalled();
    });
  });

  // ── listJobs ───────────────────────────────────────────────────────

  describe("listJobs", () => {
    test("returns an array of job summaries", async () => {
      const res = await pipeline.startResearch({ query: "list test" });
      const jobs = pipeline.listJobs();
      expect(Array.isArray(jobs)).toBe(true);
      const mine = jobs.find((j) => j.jobId === res.jobId);
      expect(mine).toBeDefined();
      expect(mine.query).toBe("list test");
      expect(typeof mine.status).toBe("string");
      expect(typeof mine.progress).toBe("number");
    });

    test("returns empty array when no jobs exist", () => {
      const fresh = new ResearchPipeline();
      expect(fresh.listJobs()).toEqual([]);
    });
  });

  // ── Capacity limits ────────────────────────────────────────────────

  describe("capacity limits", () => {
    test("throws when too many active jobs are in-flight", async () => {
      process.env.RESEARCH_MAX_ACTIVE = "1";
      process.env.RESEARCH_MAX_JOBS = "10";
      const limited = new ResearchPipeline();
      // Pre-seed a "running" job so the BoundedJobStore active count is
      // already at the limit. (ResearchPipeline moves jobs to "searching"
      // synchronously, so the "pending" window is too brief to test via
      // a second startResearch call — we exercise the integration directly.)
      limited.activeJobs.set("seed-job", {
        status: "running",
        _createdAt: Date.now(),
      });

      await expect(
        limited.startResearch({ query: "over the limit" }),
      ).rejects.toThrow(/active/i);
    });
  });

  // ── Singleton factory ──────────────────────────────────────────────

  describe("getResearchPipeline (singleton)", () => {
    test("returns the same instance on repeated calls", () => {
      const a = getResearchPipeline();
      const b = getResearchPipeline();
      expect(a).toBe(b);
      expect(a).toBeInstanceOf(ResearchPipeline);
    });

    test("returns a new instance after _instance is reset", () => {
      const first = getResearchPipeline();
      ResearchPipeline._instance = null;
      const second = getResearchPipeline();
      expect(second).not.toBe(first);
      expect(second).toBeInstanceOf(ResearchPipeline);
    });
  });
});
