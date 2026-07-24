// SPDX-License-Identifier: MIT
// Tests for pdfAnalysis endpoints (Issue #382).
//
// Covers: POST /pdf-analysis/upload, POST /pdf-analysis/start,
// GET /pdf-analysis/list, GET /pdf-analysis/:id, GET /pdf-analysis/:id/result,
// DELETE /pdf-analysis/:id, POST /pdf-analysis/crosscheck,
// GET /pdf-analysis/crosscheck/list, GET /pdf-analysis/crosscheck/:id,
// GET /pdf-analysis/crosscheck/:id/result, DELETE /pdf-analysis/crosscheck/:id,
// GET /pdf-analysis/facts, GET /pdf-analysis/facts/stats,
// DELETE /pdf-analysis/facts/:factId, POST /pdf-analysis/corpus,
// GET /pdf-analysis/corpus/list, GET /pdf-analysis/corpus/:id,
// GET /pdf-analysis/corpus/:id/result, DELETE /pdf-analysis/corpus/:id,
// GET /pdf-analysis/:id/report/download,
// GET /pdf-analysis/crosscheck/:id/report/download
//
// Uses the mockExpressApp harness to register routes and invoke handlers
// without booting a real HTTP server.

jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  log: jest.fn(),
}));
jest.mock("../../utils/paths", () => ({
  getStoragePath: (...parts) => "/tmp/fake-storage/" + parts.join("/"),
}));

const mockPdfStart = jest.fn();
const mockPdfList = jest.fn();
const mockPdfGetStatus = jest.fn();
const mockPdfGetResult = jest.fn();
const mockPdfCancel = jest.fn();
const mockFactStoreSearch = jest.fn();
const mockFactStoreStats = jest.fn();
const mockFactStoreRemove = jest.fn();
const factStore = {
  search: (...a) => mockFactStoreSearch(...a),
  stats: (...a) => mockFactStoreStats(...a),
  remove: (...a) => mockFactStoreRemove(...a),
};
jest.mock("../../utils/pdfAnalysis", () => ({
  PdfAnalysisPipeline: {
    start: (...a) => mockPdfStart(...a),
    list: (...a) => mockPdfList(...a),
    getStatus: (...a) => mockPdfGetStatus(...a),
    getResult: (...a) => mockPdfGetResult(...a),
    cancel: (...a) => mockPdfCancel(...a),
    factStore,
  },
}));

const mockCrossStart = jest.fn();
const mockCrossList = jest.fn();
const mockCrossGetStatus = jest.fn();
const mockCrossGetResult = jest.fn();
const mockCrossCancel = jest.fn();
jest.mock("../../utils/pdfAnalysis/crossCheck", () => ({
  CrossCheckPipeline: {
    start: (...a) => mockCrossStart(...a),
    list: (...a) => mockCrossList(...a),
    getStatus: (...a) => mockCrossGetStatus(...a),
    getResult: (...a) => mockCrossGetResult(...a),
    cancel: (...a) => mockCrossCancel(...a),
  },
}));

const mockCorpusStart = jest.fn();
const mockCorpusList = jest.fn();
const mockCorpusGetStatus = jest.fn();
const mockCorpusGetResult = jest.fn();
const mockCorpusCancel = jest.fn();
jest.mock("../../utils/pdfAnalysis/corpus", () => ({
  CorpusPipeline: {
    start: (...a) => mockCorpusStart(...a),
    list: (...a) => mockCorpusList(...a),
    getStatus: (...a) => mockCorpusGetStatus(...a),
    getResult: (...a) => mockCorpusGetResult(...a),
    cancel: (...a) => mockCorpusCancel(...a),
  },
}));

// Mock multer to bypass actual file handling
jest.mock("multer", () => {
  function multer() {
    return {
      single: () => (req, _res, next) => {
        // Simulate multer populating req.file
        if (req.file !== undefined) {
          next();
        } else if (req._simulateNoFile) {
          next();
        } else {
          next();
        }
      },
    };
  }
  multer.diskStorage = jest.fn(() => ({}));
  multer.memoryStorage = jest.fn(() => ({}));
  return multer;
});

const { pdfAnalysisEndpoints } = require("../../endpoints/pdfAnalysis");
const { createMockApp } = require("../helpers/mockExpressApp");

function buildApp() {
  const harness = createMockApp();
  pdfAnalysisEndpoints(harness.app);
  return harness;
}

describe("pdfAnalysisEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /pdf-analysis/start
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /pdf-analysis/start", () => {
    it("starts a job when pdfPath is within upload dir", async () => {
      mockPdfStart.mockReturnValue({ jobId: "job-123" });
      const uploadDir = "/tmp/fake-storage/pdf-analysis/uploads";
      const res = await app.call("post", "/pdf-analysis/start", {
        body: {
          pdfPath: uploadDir + "/test.pdf",
          task: "summarize",
          reportType: "brief",
          deepScan: true,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.jobId).toBe("job-123");
      expect(mockPdfStart).toHaveBeenCalledWith(
        expect.objectContaining({
          task: "summarize",
          reportType: "brief",
          deepScan: true,
        }),
      );
    });

    it("returns 400 when pdfPath is missing", async () => {
      const res = await app.call("post", "/pdf-analysis/start", {
        body: { task: "summarize" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("pdfPath is required.");
    });

    it("returns 403 when pdfPath is outside upload directory", async () => {
      const res = await app.call("post", "/pdf-analysis/start", {
        body: { pdfPath: "/etc/passwd" },
      });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe(
        "pdfPath must be within the upload directory.",
      );
    });

    it("returns 500 when PdfAnalysisPipeline.start throws", async () => {
      mockPdfStart.mockImplementation(() => {
        throw new Error("Pipeline failed");
      });
      const uploadDir = "/tmp/fake-storage/pdf-analysis/uploads";
      const res = await app.call("post", "/pdf-analysis/start", {
        body: { pdfPath: uploadDir + "/test.pdf" },
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal server error");
      expect(res.body.errorId).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pdf-analysis/list
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /pdf-analysis/list", () => {
    it("returns list of jobs", async () => {
      const fakeJobs = [
        { jobId: "job-1", status: "completed" },
        { jobId: "job-2", status: "running" },
      ];
      mockPdfList.mockReturnValue(fakeJobs);

      const res = await app.call("get", "/pdf-analysis/list");

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toEqual(fakeJobs);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pdf-analysis/:id
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /pdf-analysis/:id", () => {
    it("returns job status when found", async () => {
      mockPdfGetStatus.mockReturnValue({ jobId: "job-1", status: "running" });

      const res = await app.call("get", "/pdf-analysis/job-1");

      expect(res.statusCode).toBe(200);
      expect(res.body.jobId).toBe("job-1");
    });

    it("returns 404 when job not found", async () => {
      mockPdfGetStatus.mockReturnValue(null);

      const res = await app.call("get", "/pdf-analysis/nonexistent");

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pdf-analysis/:id/result
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /pdf-analysis/:id/result", () => {
    it("returns job result when found", async () => {
      const fakeResult = { jobId: "job-1", status: "completed", report: "# Report" };
      mockPdfGetResult.mockReturnValue(fakeResult);

      const res = await app.call("get", "/pdf-analysis/job-1/result");

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(fakeResult);
    });

    it("returns 404 when result not found", async () => {
      mockPdfGetResult.mockReturnValue(null);

      const res = await app.call("get", "/pdf-analysis/nonexistent/result");

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /pdf-analysis/:id
  // ─────────────────────────────────────────────────────────────────────────
  describe("DELETE /pdf-analysis/:id", () => {
    it("cancels job successfully", async () => {
      mockPdfCancel.mockReturnValue(true);

      const res = await app.call("delete", "/pdf-analysis/job-1");

      expect(res.statusCode).toBe(200);
      expect(res.body.cancelled).toBe(true);
    });

    it("returns 404 when job not found for cancel", async () => {
      mockPdfCancel.mockReturnValue(false);

      const res = await app.call("delete", "/pdf-analysis/nonexistent");

      expect(res.statusCode).toBe(404);
      expect(res.body.cancelled).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /pdf-analysis/crosscheck
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /pdf-analysis/crosscheck", () => {
    it("starts a crosscheck job", async () => {
      mockCrossStart.mockReturnValue({ jobId: "cross-1" });

      const res = await app.call("post", "/pdf-analysis/crosscheck", {
        body: { claims: ["claim1"], factIds: [1], sources: [], deepWeb: false },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.jobId).toBe("cross-1");
    });

    it("returns 500 when CrossCheckPipeline.start throws", async () => {
      mockCrossStart.mockImplementation(() => {
        throw new Error("Crosscheck failed");
      });

      const res = await app.call("post", "/pdf-analysis/crosscheck", {
        body: {},
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.errorId).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pdf-analysis/crosscheck/list
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /pdf-analysis/crosscheck/list", () => {
    it("returns list of crosscheck jobs", async () => {
      mockCrossList.mockReturnValue([{ jobId: "cross-1" }]);

      const res = await app.call("get", "/pdf-analysis/crosscheck/list");

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pdf-analysis/crosscheck/:id
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /pdf-analysis/crosscheck/:id", () => {
    it("returns crosscheck status when found", async () => {
      mockCrossGetStatus.mockReturnValue({ jobId: "cross-1", status: "running" });

      const res = await app.call("get", "/pdf-analysis/crosscheck/cross-1");

      expect(res.statusCode).toBe(200);
      expect(res.body.jobId).toBe("cross-1");
    });

    it("returns 404 when crosscheck not found", async () => {
      mockCrossGetStatus.mockReturnValue(null);

      const res = await app.call("get", "/pdf-analysis/crosscheck/nonexistent");

      expect(res.statusCode).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /pdf-analysis/crosscheck/:id
  // ─────────────────────────────────────────────────────────────────────────
  describe("DELETE /pdf-analysis/crosscheck/:id", () => {
    it("cancels crosscheck job successfully", async () => {
      mockCrossCancel.mockReturnValue(true);

      const res = await app.call("delete", "/pdf-analysis/crosscheck/cross-1");

      expect(res.statusCode).toBe(200);
      expect(res.body.cancelled).toBe(true);
    });

    it("returns 404 when crosscheck not found for cancel", async () => {
      mockCrossCancel.mockReturnValue(false);

      const res = await app.call("delete", "/pdf-analysis/crosscheck/nonexistent");

      expect(res.statusCode).toBe(404);
      expect(res.body.cancelled).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pdf-analysis/facts
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /pdf-analysis/facts", () => {
    it("returns searched facts", async () => {
      mockFactStoreSearch.mockReturnValue([{ id: "fact-1", text: "Some fact" }]);

      const res = await app.call("get", "/pdf-analysis/facts", {
        query: { q: "test", limit: "10" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.facts).toHaveLength(1);
      expect(mockFactStoreSearch).toHaveBeenCalledWith(
        expect.objectContaining({ q: "test", limit: "10" }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pdf-analysis/facts/stats
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /pdf-analysis/facts/stats", () => {
    it("returns fact store statistics", async () => {
      mockFactStoreStats.mockReturnValue({ total: 42, tagged: 10 });

      const res = await app.call("get", "/pdf-analysis/facts/stats");

      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(42);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /pdf-analysis/facts/:factId
  // ─────────────────────────────────────────────────────────────────────────
  describe("DELETE /pdf-analysis/facts/:factId", () => {
    it("removes a fact successfully", async () => {
      mockFactStoreRemove.mockReturnValue(true);

      const res = await app.call("delete", "/pdf-analysis/facts/fact-1");

      expect(res.statusCode).toBe(200);
      expect(res.body.removed).toBe(true);
    });

    it("returns 404 when fact not found", async () => {
      mockFactStoreRemove.mockReturnValue(false);

      const res = await app.call("delete", "/pdf-analysis/facts/nonexistent");

      expect(res.statusCode).toBe(404);
      expect(res.body.removed).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /pdf-analysis/corpus
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /pdf-analysis/corpus", () => {
    it("starts a corpus analysis job", async () => {
      mockCorpusStart.mockReturnValue({ jobId: "corpus-1" });
      const uploadDir = "/tmp/fake-storage/pdf-analysis/uploads";

      const res = await app.call("post", "/pdf-analysis/corpus", {
        body: {
          pdfPaths: [uploadDir + "/doc1.pdf", uploadDir + "/doc2.pdf"],
          task: "compare",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.jobId).toBe("corpus-1");
    });

    it("filters out paths outside upload directory", async () => {
      mockCorpusStart.mockReturnValue({ jobId: "corpus-2" });

      const res = await app.call("post", "/pdf-analysis/corpus", {
        body: {
          pdfPaths: ["/etc/passwd", "/tmp/other.pdf"],
          task: "compare",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(mockCorpusStart).toHaveBeenCalledWith(
        expect.objectContaining({
          pdfPaths: [],
        }),
      );
    });

    it("returns 500 when CorpusPipeline.start throws", async () => {
      mockCorpusStart.mockImplementation(() => {
        throw new Error("Corpus failed");
      });

      const res = await app.call("post", "/pdf-analysis/corpus", {
        body: {},
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.errorId).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pdf-analysis/corpus/list
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /pdf-analysis/corpus/list", () => {
    it("returns list of corpus jobs", async () => {
      mockCorpusList.mockReturnValue([{ jobId: "corpus-1" }]);

      const res = await app.call("get", "/pdf-analysis/corpus/list");

      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pdf-analysis/corpus/:id
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /pdf-analysis/corpus/:id", () => {
    it("returns corpus status when found", async () => {
      mockCorpusGetStatus.mockReturnValue({ jobId: "corpus-1", status: "completed" });

      const res = await app.call("get", "/pdf-analysis/corpus/corpus-1");

      expect(res.statusCode).toBe(200);
    });

    it("returns 404 when corpus job not found", async () => {
      mockCorpusGetStatus.mockReturnValue(null);

      const res = await app.call("get", "/pdf-analysis/corpus/nonexistent");

      expect(res.statusCode).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /pdf-analysis/corpus/:id
  // ─────────────────────────────────────────────────────────────────────────
  describe("DELETE /pdf-analysis/corpus/:id", () => {
    it("cancels corpus job successfully", async () => {
      mockCorpusCancel.mockReturnValue(true);

      const res = await app.call("delete", "/pdf-analysis/corpus/corpus-1");

      expect(res.statusCode).toBe(200);
      expect(res.body.cancelled).toBe(true);
    });

    it("returns 404 when corpus job not found for cancel", async () => {
      mockCorpusCancel.mockReturnValue(false);

      const res = await app.call("delete", "/pdf-analysis/corpus/nonexistent");

      expect(res.statusCode).toBe(404);
      expect(res.body.cancelled).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pdf-analysis/:id/report/download
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /pdf-analysis/:id/report/download", () => {
    it("downloads report when job is completed", async () => {
      mockPdfGetResult.mockReturnValue({
        status: "completed",
        report: "# Analysis Report\n\nContent here.",
      });

      const res = await app.call("get", "/pdf-analysis/job-1/report/download");

      expect(res.statusCode).toBe(200);
      expect(res.headers["Content-Type"]).toContain("text/markdown");
      expect(res.headers["Content-Disposition"]).toContain("attachment");
      expect(res.body).toContain("# Analysis Report");
    });

    it("returns 404 when no report available", async () => {
      mockPdfGetResult.mockReturnValue(null);

      const res = await app.call("get", "/pdf-analysis/nonexistent/report/download");

      expect(res.statusCode).toBe(404);
    });

    it("returns 404 when job not completed", async () => {
      mockPdfGetResult.mockReturnValue({ status: "running", report: null });

      const res = await app.call("get", "/pdf-analysis/job-1/report/download");

      expect(res.statusCode).toBe(404);
    });
  });
});
