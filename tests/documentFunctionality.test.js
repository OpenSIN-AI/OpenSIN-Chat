// SPDX-License-Identifier: MIT
// Purpose: Test document functionality endpoints
// Docs: tests/documentFunctionality.test.js
// Note: The real document endpoints are /document/create-folder and
// /document/move-files. Legacy CRUD routes do not exist and are skipped.

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

vi.mock("../server/models/documents", () => ({
  Documents: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, name: "test" })),
    get: vi.fn(() => Promise.resolve({ id: 1, name: "test" })),
    update: vi.fn(() => Promise.resolve({ id: 1, name: "updated" })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
    purgeDocument: () => Promise.resolve(),
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

describe("document functionality endpoints", () => {
  describe("POST /document/create-folder", () => {
    it("should create a document folder with valid data", async () => {
      const response = await request("POST", "/document/create-folder", {
        name: `Test Document ${Date.now()}`,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should create a document folder with minimal data", async () => {
      const response = await request("POST", "/document/create-folder", {
        name: `Simple Document ${Date.now()}`,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should reject folder creation with missing name", async () => {
      const response = await request("POST", "/document/create-folder", {});
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("success", false);
    });

    it.skip("should reject document with missing type", async () => {
      const response = await request("POST", "/documents", {
        name: "Test Document",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /documents", () => {
    it.skip("should return documents", async () => {
      const response = await request("GET", "/documents");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("documents");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalDocuments");
    });

    it.skip("should return documents with pagination", async () => {
      const response = await request("GET", "/documents?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("documents");
    });
  });

  describe("GET /documents/:id", () => {
    it.skip("should get document by id", async () => {
      const response = await request("GET", "/documents/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "test");
    });

    it.skip("should return 404 for non-existent document", async () => {
      const response = await request("GET", "/documents/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /documents/:id", () => {
    it.skip("should update document", async () => {
      const response = await request("PUT", "/documents/1", {
        name: "Updated Document",
        description: "Updated description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "updated");
    });

    it.skip("should reject document update with invalid data", async () => {
      const response = await request("PUT", "/documents/1", {
        name: "",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /documents/:id", () => {
    it.skip("should delete document", async () => {
      const response = await request("DELETE", "/documents/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it.skip("should return 404 for non-existent document", async () => {
      const response = await request("DELETE", "/documents/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
