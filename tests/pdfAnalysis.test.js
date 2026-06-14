// SPDX-License-Identifier: MIT
// Purpose: Test PDF analysis endpoints
// Docs: tests/pdfAnalysis.test.js

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
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
  strictMultiUserRoleValid: () => (req, res, next) => next(),
  ROLES: { admin: "admin", manager: "manager", all: "all" },
  isMultiUserSetup: () => true,
}));

vi.mock("../server/utils/middleware/validatedRequest", () => ({
  validatedRequest: (req, res, next) => next(),
}));

vi.mock("../server/utils/http", () => ({
  reqBody: (req) => req.body || {},
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

let app;

beforeAll(async () => {
  app = createApp();
});

afterAll(async () => {
  if (app && app.close) await app.close();
});

const jsonRequest = async (method, path, body = null) => {
  const url = `http://localhost:3001${path}`;
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  const data = await response.text();
  return { status: response.status, body: data ? JSON.parse(data) : null };
};

const uploadRequest = async (path, file) => {
  const url = `http://localhost:3001${path}`;
  const form = new FormData();
  form.append("file", file, "test.pdf");
  const response = await fetch(url, { method: "POST", body: form });
  const data = await response.text();
  return { status: response.status, body: data ? JSON.parse(data) : null };
};

describe("PDF analysis endpoints", () => {
  describe("POST /pdf-analysis/upload", () => {
    it("should accept a PDF upload", async () => {
      const file = new Blob(["%PDF-1.4 fake"], { type: "application/pdf" });
      const response = await uploadRequest("/pdf-analysis/upload", file);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("pdfPath");
    });
  });

  describe("POST /pdf-analysis/start", () => {
    it("should return 400 when the pipeline fails", async () => {
      const response = await jsonRequest("POST", "/pdf-analysis/start", {
        pdfPath: "/tmp/nonexistent.pdf",
        task: "analyze",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /pdf-analysis/crosscheck", () => {
    it("should return 400 when the pipeline fails", async () => {
      const response = await jsonRequest("POST", "/pdf-analysis/crosscheck", {
        claims: ["test claim"],
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /pdf-analysis/corpus", () => {
    it("should return 400 when the pipeline fails", async () => {
      const response = await jsonRequest("POST", "/pdf-analysis/corpus", {
        pdfPaths: ["/tmp/nonexistent.pdf"],
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /pdf-analysis/:jobId", () => {
    it("should return 404 for an unknown job", async () => {
      const response = await jsonRequest("GET", "/pdf-analysis/unknown");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
