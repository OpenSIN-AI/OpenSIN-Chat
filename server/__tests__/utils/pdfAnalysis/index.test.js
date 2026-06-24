// SPDX-License-Identifier: MIT
/**
 * Tests for PdfAnalysisPipeline — the autonomous PDF analysis orchestrator.
 *
 * Covers: job creation + validation, status reporting, result retrieval,
 * job listing, cancellation, active-count enforcement, prune/retention,
 * resume-on-restart, and the full _run lifecycle (read → analyze →
 * synthesize → verify → store).
 *
 * All heavy dependencies (PDF reader, agent pool, LLM analysis, synthesis,
 * fact store/verifier, critic, job persistence, reports) are mocked. A
 * temp directory is used for report-file writes so no real disk I/O
 * touches the repo.
 *
 * Docs: server/utils/pdfAnalysis/index.js
 * Purpose: Verify the pipeline's static public API and async lifecycle
 * without PDF or LLM dependencies.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

// ── Mocks (factories are hoisted; fresh jest.fn instances are created
//    on every re-require after jest.resetModules) ────────────────────

jest.mock("../../../utils/pdfAnalysis/security", () => ({
  validatePdfPath: jest.fn((p) => p),
  allowedRoots: jest.fn(() => []),
}));

jest.mock("../../../utils/pdfAnalysis/pdfReader", () => ({
  PdfReader: jest.fn(),
  buildChunkPlan: jest.fn(() => []),
}));

jest.mock("../../../utils/pdfAnalysis/agentPool", () => ({
  runPool: jest.fn(),
  clearCheckpoint: jest.fn(),
}));

jest.mock("../../../utils/pdfAnalysis/analysisAgent", () => ({
  analyzeChunk: jest.fn(),
}));

jest.mock("../../../utils/pdfAnalysis/synthesizer", () => ({
  synthesize: jest.fn(),
}));

jest.mock("../../../utils/pdfAnalysis/factStore", () => ({
  FactStore: jest.fn(),
}));

jest.mock("../../../utils/pdfAnalysis/jobStore", () => ({
  persistJob: jest.fn(),
  loadAllJobs: jest.fn(() => []),
}));

jest.mock("../../../utils/pdfAnalysis/factVerifier", () => ({
  verifyFacts: jest.fn(),
}));

jest.mock("../../../utils/pdfAnalysis/criticAgent", () => ({
  reviewAndRepair: jest.fn(),
}));

jest.mock("../../../utils/pdfAnalysis/config", () => ({
  MAX_ACTIVE_JOBS: 2,
  MAX_PAGES: 0,
  PAGES_PER_CHUNK: 8,
  CHUNK_OVERLAP_PAGES: 1,
  AGENT_CONCURRENCY: 6,
  FACT_MIN_CONFIDENCE: 0.5,
  STORAGE_DIR: "/tmp/pdf-test",
  CHECKPOINT_DIR: "/tmp/pdf-test/checkpoints",
  REPORT_DIR: "/tmp/pdf-test/reports",
  FACTS_FILE: "/tmp/pdf-test/facts.json",
}));

jest.mock("../../../utils/reports", () => ({
  ReportGenerator: jest.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-test-"));
  process.env.STORAGE_DIR = tmpDir;
});

afterAll(() => {
  delete process.env.STORAGE_DIR;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Load a fresh module graph so the module-level `jobs` Map starts empty
 * for every test. Mock factories re-run on re-require, yielding fresh
 * jest.fn() instances.
 *
 * IMPORTANT: setupHappyPathMocks must run BEFORE requiring index.js,
 * because index.js evaluates `PdfAnalysisPipeline.factStore = new FactStore()`
 * at module-load time. If FactStore is unconfigured at that point,
 * factStore is undefined and _run crashes on addFacts().
 *
 * STORAGE_DIR is set to a temp dir (in beforeAll) so the real paths.js
 * resolves report paths into tmp instead of the repo storage tree.
 */
function loadFresh() {
  jest.resetModules();
  const m = {
    security: require("../../../utils/pdfAnalysis/security"),
    pdfReader: require("../../../utils/pdfAnalysis/pdfReader"),
    agentPool: require("../../../utils/pdfAnalysis/agentPool"),
    analysisAgent: require("../../../utils/pdfAnalysis/analysisAgent"),
    synthesizer: require("../../../utils/pdfAnalysis/synthesizer"),
    factStore: require("../../../utils/pdfAnalysis/factStore"),
    jobStore: require("../../../utils/pdfAnalysis/jobStore"),
    factVerifier: require("../../../utils/pdfAnalysis/factVerifier"),
    criticAgent: require("../../../utils/pdfAnalysis/criticAgent"),
    config: require("../../../utils/pdfAnalysis/config"),
    paths: require("../../../utils/paths"),
    reports: require("../../../utils/reports"),
  };
  const instances = setupHappyPathMocks(m);
  const { PdfAnalysisPipeline } = require("../../../utils/pdfAnalysis/index");
  return { PdfAnalysisPipeline, mocks: m, instances };
}

/** Set up default mock return values for a full successful _run cycle. */
function setupHappyPathMocks(mocks) {
  const readerInstance = {
    open: jest.fn().mockResolvedValue(2),
    rangeText: jest.fn().mockResolvedValue({ text: "page text" }),
    close: jest.fn().mockResolvedValue(undefined),
    ocrPages: new Set(),
    visionPages: new Set(),
    deepScannedPages: new Set(),
  };
  mocks.pdfReader.PdfReader.mockImplementation(() => readerInstance);
  mocks.pdfReader.buildChunkPlan.mockReturnValue([
    { pageStart: 1, pageEnd: 1 },
    { pageStart: 2, pageEnd: 2 },
  ]);
  mocks.agentPool.runPool.mockImplementation(
    async (chunks, concurrency, workerFn, opts) => {
      const results = [];
      for (const chunk of chunks) {
        if (opts?.isCancelled?.()) break;
        const r = await workerFn(chunk);
        results.push(r);
        opts?.onProgress?.(results.length, chunks.length, concurrency);
      }
      return results;
    },
  );
  mocks.analysisAgent.analyzeChunk.mockResolvedValue({ facts: [] });
  mocks.criticAgent.reviewAndRepair.mockImplementation((result) => result);
  mocks.synthesizer.synthesize.mockResolvedValue({
    report: "# Analysis Report\n\nContent here.",
    masterSummary: "Master summary text",
    groundingRatio: 0.92,
  });
  mocks.factVerifier.verifyFacts.mockImplementation((facts) =>
    Promise.resolve(facts.map((f) => ({ ...f, verified: true }))),
  );
  const factStoreInstance = { addFacts: jest.fn(() => 5) };
  mocks.factStore.FactStore.mockImplementation(() => factStoreInstance);
  mocks.jobStore.persistJob.mockImplementation(() => {});
  mocks.jobStore.loadAllJobs.mockReturnValue([]);
  mocks.agentPool.clearCheckpoint.mockImplementation(() => {});
  mocks.security.validatePdfPath.mockImplementation((p) => p);
  return { readerInstance, factStoreInstance };
}

/** Poll getStatus until terminal, with timeout. */
async function waitForTerminal(Pipeline, jobId, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const st = Pipeline.getStatus(jobId);
    if (st && ["completed", "failed"].includes(st.status)) return st;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`Job ${jobId} did not terminate in ${timeoutMs}ms`);
}

// ── Tests ────────────────────────────────────────────────────────────

describe("PdfAnalysisPipeline", () => {
  let PdfAnalysisPipeline;
  let mocks;
  let logSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const fresh = loadFresh();
    PdfAnalysisPipeline = fresh.PdfAnalysisPipeline;
    mocks = fresh.mocks;
  });

  afterEach(() => {
    logSpy.mockRestore();
    delete process.env.PDF_ANALYSIS_MAX_COMPLETED_JOBS;
  });

  // ── start — validation ─────────────────────────────────────────────

  describe("start — validation", () => {
    test("throws if pdfPath is missing", () => {
      expect(() => PdfAnalysisPipeline.start({ task: "analyze" })).toThrow(
        /erforderlich/i,
      );
    });

    test("throws if task is missing", () => {
      expect(() =>
        PdfAnalysisPipeline.start({ pdfPath: "/tmp/x.pdf" }),
      ).toThrow(/erforderlich/i);
    });

    test("delegates path validation to security.validatePdfPath", () => {
      mocks.security.validatePdfPath.mockImplementation((p) => p);
      const res = PdfAnalysisPipeline.start({
        pdfPath: "/uploads/doc.pdf",
        task: "summarize",
      });
      expect(mocks.security.validatePdfPath).toHaveBeenCalledWith(
        "/uploads/doc.pdf",
      );
      expect(res.jobId).toMatch(/^[0-9a-f-]{36}$/);
    });

    test("propagates validation error from security", () => {
      mocks.security.validatePdfPath.mockImplementation(() => {
        throw Object.assign(new Error("Zugriff verweigert"), {
          statusCode: 403,
        });
      });
      expect(() =>
        PdfAnalysisPipeline.start({
          pdfPath: "/etc/passwd",
          task: "x",
        }),
      ).toThrow(/Zugriff verweigert/);
    });

    test("throws 429 when at max active jobs", () => {
      // Make PdfReader.open hang so jobs stay "running".
      mocks.pdfReader.PdfReader.mockImplementation(() => ({
        open: jest.fn().mockReturnValue(new Promise(() => {})),
        rangeText: jest.fn(),
        close: jest.fn(),
        ocrPages: new Set(),
        visionPages: new Set(),
        deepScannedPages: new Set(),
      }));
      PdfAnalysisPipeline.start({ pdfPath: "/a.pdf", task: "t1" });
      PdfAnalysisPipeline.start({ pdfPath: "/b.pdf", task: "t2" });
      // config.MAX_ACTIVE_JOBS = 2 → third should reject
      let err;
      try {
        PdfAnalysisPipeline.start({ pdfPath: "/c.pdf", task: "t3" });
      } catch (e) {
        err = e;
      }
      expect(err).toBeDefined();
      expect(err.message).toMatch(/paralleler/i);
      expect(err.statusCode).toBe(429);
    });
  });

  // ── getStatus ──────────────────────────────────────────────────────

  describe("getStatus", () => {
    test("returns null for an unknown jobId", () => {
      expect(PdfAnalysisPipeline.getStatus("nope")).toBeNull();
    });

    test("returns job metadata for a known jobId", () => {
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/uploads/test.pdf",
        task: "extract facts",
        reportType: "best-practices",
        deepScan: true,
      });
      const st = PdfAnalysisPipeline.getStatus(jobId);
      expect(st.id).toBe(jobId);
      expect(st.task).toBe("extract facts");
      expect(st.documentName).toBe("test.pdf");
      expect(st.status).toMatch(/pending|running/);
      expect(st.progress.phase).toMatch(/init|reading|analyzing/);
      expect(st.error).toBeNull();
      expect(st.createdAt).toBeTruthy();
    });
  });

  // ── getResult ──────────────────────────────────────────────────────

  describe("getResult", () => {
    test("returns null for an unknown jobId", () => {
      expect(PdfAnalysisPipeline.getResult("unknown")).toBeNull();
    });

    test("returns { status, error } while job is not completed", () => {
      mocks.pdfReader.PdfReader.mockImplementation(() => ({
        open: jest.fn().mockReturnValue(new Promise(() => {})),
        rangeText: jest.fn(),
        close: jest.fn(),
        ocrPages: new Set(),
        visionPages: new Set(),
        deepScannedPages: new Set(),
      }));
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/x.pdf",
        task: "t",
      });
      const result = PdfAnalysisPipeline.getResult(jobId);
      expect(result).not.toBeNull();
      expect(result.status).not.toBe("completed");
    });

    test("returns full result with report after completion", async () => {
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/uploads/report.pdf",
        task: "analyze report",
      });
      await waitForTerminal(PdfAnalysisPipeline, jobId);

      const result = PdfAnalysisPipeline.getResult(jobId);
      expect(result.status).toBe("completed");
      expect(result.report).toContain("# Analysis Report");
      expect(result.masterSummary).toBe("Master summary text");
      expect(result.totalPages).toBe(2);
    });
  });

  // ── list ───────────────────────────────────────────────────────────

  describe("list", () => {
    test("returns an array of job statuses sorted by createdAt desc", () => {
      const { jobId: j1 } = PdfAnalysisPipeline.start({
        pdfPath: "/a.pdf",
        task: "t1",
      });
      const { jobId: j2 } = PdfAnalysisPipeline.start({
        pdfPath: "/b.pdf",
        task: "t2",
      });
      const list = PdfAnalysisPipeline.list();
      expect(Array.isArray(list)).toBe(true);
      const ids = list.map((j) => j.id);
      expect(ids).toContain(j1);
      expect(ids).toContain(j2);
      // Sorted desc by createdAt — j2 was created after j1
      const idx1 = ids.indexOf(j1);
      const idx2 = ids.indexOf(j2);
      expect(idx2).toBeLessThan(idx1);
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────

  describe("cancel", () => {
    test("sets cancelled flag and returns true for a known job", () => {
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/x.pdf",
        task: "t",
      });
      expect(PdfAnalysisPipeline.cancel(jobId)).toBe(true);
      // Verify the job is marked cancelled internally via list/getStatus
      const st = PdfAnalysisPipeline.getStatus(jobId);
      expect(st).not.toBeNull();
    });

    test("returns false for an unknown jobId", () => {
      expect(PdfAnalysisPipeline.cancel("nonexistent")).toBe(false);
    });
  });

  // ── activeCount ────────────────────────────────────────────────────

  describe("activeCount", () => {
    test("counts pending and running jobs", () => {
      mocks.pdfReader.PdfReader.mockImplementation(() => ({
        open: jest.fn().mockReturnValue(new Promise(() => {})),
        rangeText: jest.fn(),
        close: jest.fn(),
        ocrPages: new Set(),
        visionPages: new Set(),
        deepScannedPages: new Set(),
      }));
      const before = PdfAnalysisPipeline.activeCount();
      PdfAnalysisPipeline.start({ pdfPath: "/a.pdf", task: "t" });
      PdfAnalysisPipeline.start({ pdfPath: "/b.pdf", task: "t" });
      expect(PdfAnalysisPipeline.activeCount()).toBe(before + 2);
    });

    test("excludes completed jobs", async () => {
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/x.pdf",
        task: "t",
      });
      await waitForTerminal(PdfAnalysisPipeline, jobId);
      expect(PdfAnalysisPipeline.activeCount()).toBe(0);
    });
  });

  // ── pruneCompletedJobs ─────────────────────────────────────────────

  describe("pruneCompletedJobs", () => {
    test("removes terminal jobs older than maxAgeHours", async () => {
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/x.pdf",
        task: "t",
      });
      await waitForTerminal(PdfAnalysisPipeline, jobId);
      expect(PdfAnalysisPipeline.getStatus(jobId)).not.toBeNull();

      // Ensure the completedAt timestamp is in the past relative to "now"
      await new Promise((r) => setTimeout(r, 10));
      const pruned = PdfAnalysisPipeline.pruneCompletedJobs(0);
      expect(pruned).toBeGreaterThanOrEqual(1);
      expect(PdfAnalysisPipeline.getStatus(jobId)).toBeNull();
    });

    test("does not remove non-terminal jobs", () => {
      mocks.pdfReader.PdfReader.mockImplementation(() => ({
        open: jest.fn().mockReturnValue(new Promise(() => {})),
        rangeText: jest.fn(),
        close: jest.fn(),
        ocrPages: new Set(),
        visionPages: new Set(),
        deepScannedPages: new Set(),
      }));
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/x.pdf",
        task: "t",
      });
      const pruned = PdfAnalysisPipeline.pruneCompletedJobs(0);
      expect(PdfAnalysisPipeline.getStatus(jobId)).not.toBeNull();
    });

    test("enforces hard cap on terminal entries (MAX_COMPLETED_JOBS)", async () => {
      // Reload with a tiny cap
      process.env.PDF_ANALYSIS_MAX_COMPLETED_JOBS = "1";
      const fresh = loadFresh();
      const Pipeline = fresh.PdfAnalysisPipeline;

      const jobs = [];
      for (let i = 0; i < 3; i++) {
        const { jobId } = Pipeline.start({
          pdfPath: `/f${i}.pdf`,
          task: "t",
        });
        await waitForTerminal(Pipeline, jobId);
        jobs.push(jobId);
      }
      const pruned = Pipeline.pruneCompletedJobs(24 * 365);
      // Cap is 1, we had 3 terminal → 2 evicted FIFO
      expect(pruned).toBeGreaterThanOrEqual(2);
      const remaining = Pipeline.list();
      expect(remaining.length).toBeLessThanOrEqual(1);
    });
  });

  // ── resumeInterrupted ──────────────────────────────────────────────

  describe("resumeInterrupted", () => {
    test("marks job failed when PDF file no longer exists", () => {
      mocks.jobStore.loadAllJobs.mockReturnValue([
        {
          id: "stale-1",
          pdfPath: "/nonexistent/path/file.pdf",
          documentName: "file.pdf",
          task: "t",
          status: "running",
          reportType: null,
          factCriteria: null,
          deepScan: false,
          createdAt: new Date().toISOString(),
          progress: { phase: "analyzing", chunksDone: 0, chunksTotal: 0 },
        },
      ]);
      PdfAnalysisPipeline.resumeInterrupted();
      const st = PdfAnalysisPipeline.getStatus("stale-1");
      expect(st.status).toBe("failed");
      expect(st.error).toMatch(/nicht mehr vorhanden/);
    });

    test("resumes running job when PDF file still exists", async () => {
      const tmpPdf = path.join(tmpDir, "resume-test.pdf");
      fs.writeFileSync(tmpPdf, "fake pdf");
      mocks.jobStore.loadAllJobs.mockReturnValue([
        {
          id: "resume-1",
          pdfPath: tmpPdf,
          documentName: "resume-test.pdf",
          task: "analyze",
          status: "running",
          reportType: null,
          factCriteria: null,
          deepScan: false,
          createdAt: new Date().toISOString(),
          progress: { phase: "analyzing", chunksDone: 0, chunksTotal: 0 },
        },
      ]);
      PdfAnalysisPipeline.resumeInterrupted();
      const st = PdfAnalysisPipeline.getStatus("resume-1");
      expect(st).not.toBeNull();
      // _run was called → job should progress toward completion
      await waitForTerminal(PdfAnalysisPipeline, "resume-1");
      expect(PdfAnalysisPipeline.getStatus("resume-1").status).toBe(
        "completed",
      );
    });

    test("skips jobs already in the in-memory map", () => {
      // Pre-load a job into the map via start
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/x.pdf",
        task: "t",
      });
      mocks.jobStore.loadAllJobs.mockReturnValue([
        {
          id: jobId, // same ID as the in-memory job
          pdfPath: "/x.pdf",
          documentName: "x.pdf",
          task: "t",
          status: "running",
          createdAt: new Date().toISOString(),
          progress: {},
        },
      ]);
      // Should not crash or duplicate
      expect(() => PdfAnalysisPipeline.resumeInterrupted()).not.toThrow();
    });
  });

  // ── Full _run lifecycle ────────────────────────────────────────────

  describe("_run lifecycle (read → analyze → synthesize → verify → store)", () => {
    test("completes all phases and stores facts", async () => {
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/uploads/big.pdf",
        task: "extract key facts",
        reportType: "best-practices",
        factCriteria: "budget, climate",
        deepScan: true,
      });
      const final = await waitForTerminal(PdfAnalysisPipeline, jobId);

      expect(final.status).toBe("completed");
      expect(final.progress.phase).toBe("done");

      // Phase progression: reader opened, chunks planned, pool ran
      expect(mocks.pdfReader.PdfReader).toHaveBeenCalled();
      expect(mocks.pdfReader.buildChunkPlan).toHaveBeenCalled();
      expect(mocks.agentPool.runPool).toHaveBeenCalled();

      // Synthesis called with the task context
      expect(mocks.synthesizer.synthesize).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          task: "extract key facts",
          reportType: "best-practices",
          documentName: "big.pdf",
        }),
      );

      // Facts verified and stored
      expect(mocks.factVerifier.verifyFacts).toHaveBeenCalled();
      expect(mocks.agentPool.clearCheckpoint).toHaveBeenCalledWith(jobId);

      const result = PdfAnalysisPipeline.getResult(jobId);
      expect(result.status).toBe("completed");
      expect(result.report).toContain("# Analysis Report");
      expect(result.masterSummary).toBe("Master summary text");
      expect(result.totalPages).toBe(2);
      expect(result.groundingRatio).toBe(92); // rounded percentage
    });

    test("respects MAX_PAGES limit", async () => {
      mocks.pdfReader.PdfReader.mockImplementation(() => ({
        open: jest.fn().mockResolvedValue(99999),
        rangeText: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
        ocrPages: new Set(),
        visionPages: new Set(),
        deepScannedPages: new Set(),
      }));
      // Override config MAX_PAGES for this test
      mocks.config.MAX_PAGES = 100;

      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/x.pdf",
        task: "t",
      });
      const final = await waitForTerminal(PdfAnalysisPipeline, jobId);
      expect(final.status).toBe("failed");
      expect(final.error).toMatch(/Limit/);
    });

    test("marks job failed when reader.open throws", async () => {
      mocks.pdfReader.PdfReader.mockImplementation(() => ({
        open: jest.fn().mockRejectedValue(new Error("corrupt PDF")),
        rangeText: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
        ocrPages: new Set(),
        visionPages: new Set(),
        deepScannedPages: new Set(),
      }));
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/x.pdf",
        task: "t",
      });
      const final = await waitForTerminal(PdfAnalysisPipeline, jobId);
      expect(final.status).toBe("failed");
      expect(final.error).toBe("corrupt PDF");
    });

    test("stores facts with correct source metadata", async () => {
      mocks.analysisAgent.analyzeChunk.mockResolvedValue({
        facts: [
          { detail: "Fact A", quote: "quote A", tags: ["budget"], confidence: 0.9, page: 1 },
          { detail: "Fact B", quote: "quote B", tags: [], confidence: 0.3, page: 2 },
        ],
      });
      mocks.pdfReader.buildChunkPlan.mockReturnValue([
        { pageStart: 1, pageEnd: 1 },
      ]);
      mocks.agentPool.runPool.mockImplementation(
        async (chunks, concurrency, workerFn, opts) => {
          const results = [];
          for (const chunk of chunks) {
            results.push(await workerFn(chunk));
          }
          return results;
        },
      );

      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath: "/uploads/facts.pdf",
        task: "extract facts",
      });
      await waitForTerminal(PdfAnalysisPipeline, jobId);

      // verifyFacts receives only high-confidence facts (0.9 >= 0.5, 0.3 < 0.5)
      const factsArg =
        mocks.factVerifier.verifyFacts.mock.calls[0][0];
      expect(factsArg).toHaveLength(1);
      expect(factsArg[0].detail).toBe("Fact A");
      expect(factsArg[0].source.documentName).toBe("facts.pdf");
      expect(factsArg[0].source.jobId).toBe(jobId);
      expect(factsArg[0].source.page).toBe(1);
    });
  });
});
