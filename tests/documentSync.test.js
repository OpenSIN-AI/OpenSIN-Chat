// SPDX-License-Identifier: MIT
// Purpose: Test document sync endpoints (document-sync)
// Docs: tests/documentSync.test.js

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
  strictMultiUserRoleValid: () => (req, res, next) => next(),
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

vi.mock("../server/utils/middleware/chatHistoryViewable", () => ({
  chatHistoryViewable: () => (req, res, next) => next(),
}));

vi.mock("../server/utils/collectorApi", () => ({
  CollectorApi: () => ({ online: () => Promise.resolve(true), acceptedFileTypes: () => Promise.resolve([]) }),
}));

vi.mock("../server/utils/chats", () => ({
  VALID_COMMANDS: { help: true, clear: true },
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
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: data ? JSON.parse(data) : null,
  };
};

describe("document sync endpoints", () => {
  describe("POST /document-sync", () => {
    it("should start document sync", async () => {
      const response = await request("POST", "/document-sync", {
        documentId: 1,
        source: "local",
        destination: "cloud",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("documentId", 1);
    });

    it("should start document sync with all parameters", async () => {
      const response = await request("POST", "/document-sync", {
        documentId: 1,
        source: "local",
        destination: "cloud",
        interval: 5000,
        retryCount: 3,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("documentId", 1);
    });
  });

  describe("GET /document-sync", () => {
    it("should return document sync jobs", async () => {
      const response = await request("GET", "/document-sync");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("jobs");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalJobs");
    });

    it("should return document sync jobs with pagination", async () => {
      const response = await request("GET", "/document-sync?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("jobs");
    });
  });

  describe("GET /document-sync/:id", () => {
    it("should get document sync job by id", async () => {
      const response = await request("GET", "/document-sync/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("documentId", 1);
    });
  });

  describe("PUT /document-sync/:id", () => {
    it("should update document sync job", async () => {
      const response = await request("PUT", "/document-sync/1", {
        status: "completed",
        progress: 100,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("documentId", 1);
    });
  });

  describe("DELETE /document-sync/:id", () => {
    it("should delete document sync job", async () => {
      const response = await request("DELETE", "/document-sync/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });
});
