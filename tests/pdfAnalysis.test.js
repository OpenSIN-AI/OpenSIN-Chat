// SPDX-License-Identifier: MIT
// Purpose: Test PDF analysis endpoints
// Docs: tests/pdfAnalysis.test.js

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../server/app";

vi.mock("../server/utils/helpers", () => ({
  getVectorDbClass: () => ({ namespaceCount: vi.fn(() => Promise.resolve(0)), totalVectors: vi.fn(() => Promise.resolve(0)) }),
}));

vi.mock("../server/utils/helpers/customModels", () => ({
  getCustomModels: () => ({ models: [], error: null }),
}));

vi.mock("../server/models/systemSettings", () => ({
  SystemSettings: {
    currentSettings: vi.fn(() => Promise.resolve({})),
    isMultiUserMode: vi.fn(() => Promise.resolve(false)),
  },
}));

vi.mock("../server/models/user", () => ({
  User: {
    _get: vi.fn(() => Promise.resolve(null)),
    filterFields: vi.fn((user) => user),
  },
}));

vi.mock("../server/models/eventLogs", () => ({
  EventLogs: {
    logEvent: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../server/models/telemetry", () => ({
  Telemetry: {
    sendTelemetry: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../server/utils/helpers/updateENV", () => ({
  updateENV: () => ({ newValues: {}, error: null }),
}));

vi.mock("../server/utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (req, res, next) => next(),
  ROLES: { admin: "admin", manager: "manager", all: "all" },
  isMultiUserSetup: () => true,
}));

vi.mock("../server/utils/middleware/validatedRequest", () => ({
  validatedRequest: (req, res, next) => next(),
}));

vi.mock("../server/utils/http", () => ({
  reqBody: (req) => ({}),
  makeJWT: (payload, expiry) => `token_${payload.id}`,
  userFromSession: () => Promise.resolve({ id: 1, username: "test" }),
  multiUserMode: () => false,
  queryParams: () => ({}),
}));

vi.mock("../server/utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (req, res, next) => next(),
}));

vi.mock("../server/utils/collectorApi", () => ({
  CollectorApi: () => ({ online: () => Promise.resolve(true), acceptedFileTypes: () => Promise.resolve([]) }),
}));

vi.mock("../server/utils/chats", () => ({
  VALID_COMMANDS: { help: true, clear: true },
}));

vi.mock("../server/utils/pdfAnalysis", () => ({
  PdfAnalysisPipeline: function () { return { analyze: vi.fn(() => Promise.resolve({ text: "test", pages: 1 })) }; },
  CrossCheckPipeline: function () { return { crossCheck: vi.fn(() => Promise.resolve({ matches: [], score: 0.5 })) }; },
  CorpusPipeline: function () { return { buildCorpus: vi.fn(() => Promise.resolve({ documents: [], total: 0 })) }; },
}));

let app;

beforeEach(async () => {
  vi.clearAllMocks();
  app = createApp();
});

const request = async (method, path, body = null, headers = {}) => {
  const url = `http://localhost:3001${path}`;
  const options = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  const data = await response.text();
  return { status: response.status, headers: response.headers, body: data ? JSON.parse(data) : null };
};

describe("PDF analysis endpoints", () => {
  describe("POST /pdf-analysis/analyze", () => {
    it("should analyze a PDF file", async () => {
      const response = await request("POST", "/pdf-analysis/analyze", {
        filePath: "/tmp/test.pdf",
        options: { extractText: true, extractTables: false },
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("text");
      expect(response.body).toHaveProperty("pages");
    });

    it("should return 400 with missing file path", async () => {
      const response = await request("POST", "/pdf-analysis/analyze", {});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should handle analysis options", async () => {
      const response = await request("POST", "/pdf-analysis/analyze", {
        filePath: "/tmp/test.pdf",
        options: { extractText: true, extractTables: true, extractImages: false },
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("text");
    });
  });

  describe("POST /pdf-analysis/cross-check", () => {
    it("should cross-check PDF content", async () => {
      const response = await request("POST", "/pdf-analysis/cross-check", {
        sourceText: "test content",
        targetText: "reference content",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("matches");
      expect(response.body).toHaveProperty("score");
    });

    it("should return 400 with missing source", async () => {
      const response = await request("POST", "/pdf-analysis/cross-check", {
        targetText: "reference content",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /pdf-analysis/corpus", () => {
    it("should build corpus from PDFs", async () => {
      const response = await request("POST", "/pdf-analysis/corpus", {
        filePaths: ["/tmp/doc1.pdf", "/tmp/doc2.pdf"],
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("documents");
      expect(response.body).toHaveProperty("total");
    });

    it("should return 400 with empty file list", async () => {
      const response = await request("POST", "/pdf-analysis/corpus", {
        filePaths: [],
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /pdf-analysis/status/:jobId", () => {
    it("should return analysis job status", async () => {
      const response = await request("GET", "/pdf-analysis/status/job_123");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status");
    });

    it("should return 404 for unknown job", async () => {
      const response = await request("GET", "/pdf-analysis/status/unknown");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
