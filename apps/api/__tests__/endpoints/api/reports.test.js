// SPDX-License-Identifier: MIT
const os = require("os");
const fs = require("fs");
const path = require("path");

// STORAGE_DIR is resolved at module load time, so set it before requiring the
// endpoint module. NODE_ENV during tests is not "development", so the module
// uses path.resolve(STORAGE_DIR, "generated-reports").
const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "reports-test-"));
process.env.STORAGE_DIR = TMP_ROOT;
const REPORTS_DIR = path.join(TMP_ROOT, "generated-reports");

jest.mock("../../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const mockGenerate = jest.fn();
jest.mock("../../../utils/reports", () => ({
  ReportGenerator: { generate: (...args) => mockGenerate(...args) },
}));

const mockPipeline = { getResults: jest.fn() };
jest.mock("../../../utils/research", () => ({
  getResearchPipeline: jest.fn(() => mockPipeline),
}));

const { createMockApp } = require("../../helpers/mockExpressApp");
const { apiReportsEndpoints } = require("../../../endpoints/api/reports");

function buildApp() {
  const harness = createMockApp();
  apiReportsEndpoints(harness.app);
  return harness;
}

afterAll(() => {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
});

describe("Reports REST endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("POST /reports/generate validation", () => {
    it("rejects an invalid template with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/reports/generate", {
        body: { title: "T", template: "fancy" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/template/);
      expect(mockGenerate).not.toHaveBeenCalled();
    });

    it("rejects an empty payload with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/reports/generate", { body: {} });
      expect(res.statusCode).toBe(400);
    });

    it("rejects a non-array searchResults with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/reports/generate", {
        body: { title: "T", searchResults: "nope" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/searchResults/);
    });

    it("generates a report for a valid payload", async () => {
      mockGenerate.mockResolvedValue({ fileName: "r.pdf", fileSizeKB: "1.0" });
      const { call } = buildApp();
      const res = await call("post", "/reports/generate", {
        body: { title: "Bericht", summary: "Inhalt", template: "brief" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.fileName).toBe("r.pdf");
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Bericht", template: "brief" }),
      );
    });

    it("hydrates from a research job when researchJobId is provided", async () => {
      mockPipeline.getResults.mockReturnValue({
        query: "AfD Energie",
        summary: "Zusammenfassung",
        searchResults: [{ title: "A" }],
        politicianResults: [],
        extractedContent: [],
      });
      mockGenerate.mockResolvedValue({ fileName: "r.pdf", fileSizeKB: "1.0" });
      const { call } = buildApp();
      const res = await call("post", "/reports/generate", {
        body: { researchJobId: "job1" },
      });
      expect(res.statusCode).toBe(200);
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({ summary: "Zusammenfassung" }),
      );
    });

    it("returns a generic 500 when generation throws", async () => {
      mockGenerate.mockRejectedValue(new Error("pdf failure internals"));
      const { call } = buildApp();
      const res = await call("post", "/reports/generate", {
        body: { title: "T" },
      });
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal Server Error");
    });
  });

  describe("GET /reports/list", () => {
    it("returns an empty list when the directory is absent", async () => {
      fs.rmSync(REPORTS_DIR, { recursive: true, force: true });
      const { call } = buildApp();
      const res = await call("get", "/reports/list");
      expect(res.statusCode).toBe(200);
      expect(res.body.reports).toEqual([]);
    });

    it("lists generated PDF files", async () => {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
      fs.writeFileSync(path.join(REPORTS_DIR, "a.pdf"), "%PDF-1.7");
      fs.writeFileSync(path.join(REPORTS_DIR, "ignore.txt"), "nope");
      const { call } = buildApp();
      const res = await call("get", "/reports/list");
      expect(res.statusCode).toBe(200);
      const names = res.body.reports.map((r) => r.fileName);
      expect(names).toContain("a.pdf");
      expect(names).not.toContain("ignore.txt");
    });
  });

  describe("GET /reports/:fileName", () => {
    it("returns 404 for a missing report", async () => {
      const { call } = buildApp();
      const res = await call("get", "/reports/:fileName", {
        params: { fileName: "missing.pdf" },
      });
      expect(res.statusCode).toBe(404);
    });

    it("resolves path traversal via basename and returns 404 (no escape)", async () => {
      const { call } = buildApp();
      const res = await call("get", "/reports/:fileName", {
        params: { fileName: "../../../../etc/passwd" },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
