// SPDX-License-Identifier: MIT
// Purpose: Test document sync functionality endpoints
// Docs: tests/documentSyncFunctionality.test.js
// TODO: There are no document-sync endpoints in server/endpoints/. These tests
// are skipped until document sync routes are implemented.

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

vi.mock("../server/models/documentSync", () => ({
  DocumentSync: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, documentId: 1 })),
    get: vi.fn(() => Promise.resolve({ id: 1, documentId: 1 })),
    update: vi.fn(() => Promise.resolve({ id: 1, documentId: 1 })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
  },
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
  let parsedBody;
  try {
    parsedBody = data ? JSON.parse(data) : null;
  } catch {
    parsedBody = data ? { rawBody: data } : null;
  }
  return {
    status: response.status,
    headers: response.headers,
    body: parsedBody,
  };
};

describe("document sync functionality endpoints", () => {
  describe("POST /documents/sync", () => {
    it.skip("should sync document with valid data", async () => {
      const response = await request("POST", "/documents/sync", {
        documentId: 1,
        source: "local",
        destination: "cloud",
        syncType: "full",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("documentId", 1);
    });

    it.skip("should sync document with minimal data", async () => {
      const response = await request("POST", "/documents/sync", {
        documentId: 1,
        source: "local",
        destination: "cloud",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("documentId", 1);
    });

    it.skip("should reject sync with missing documentId", async () => {
      const response = await request("POST", "/documents/sync", {
        source: "local",
        destination: "cloud",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it.skip("should reject sync with missing source", async () => {
      const response = await request("POST", "/documents/sync", {
        documentId: 1,
        destination: "cloud",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it.skip("should reject sync with missing destination", async () => {
      const response = await request("POST", "/documents/sync", {
        documentId: 1,
        source: "local",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /documents/sync-queue", () => {
    it.skip("should return sync queue", async () => {
      const response = await request("GET", "/documents/sync-queue");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("queue");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalQueueItems");
    });

    it.skip("should return sync queue with pagination", async () => {
      const response = await request("GET", "/documents/sync-queue?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("queue");
    });
  });

  describe("GET /documents/sync-runs", () => {
    it.skip("should return sync runs", async () => {
      const response = await request("GET", "/documents/sync-runs");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("runs");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalRuns");
    });

    it.skip("should return sync runs with pagination", async () => {
      const response = await request("GET", "/documents/sync-runs?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("runs");
    });
  });
});
