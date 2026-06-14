// SPDX-License-Identifier: MIT
// Purpose: Test document endpoints (documents, document-sync-queue, document-sync-run)
// Docs: tests/document.test.js
// Note: The real document endpoints are /document/create-folder, /document/move-files
// and system routes /system/remove-document /system/remove-documents. Legacy CRUD and
// sync routes do not exist and are skipped.

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

vi.mock("../server/models/documentSyncQueue", () => ({
  DocumentSyncQueue: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, documentId: 1 })),
    get: vi.fn(() => Promise.resolve({ id: 1, documentId: 1 })),
    update: vi.fn(() => Promise.resolve({ id: 1, documentId: 1 })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock("../server/models/documentSyncRun", () => ({
  DocumentSyncRun: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, documentId: 1 })),
    get: vi.fn(() => Promise.resolve({ id: 1, documentId: 1 })),
    update: vi.fn(() => Promise.resolve({ id: 1, documentId: 1 })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
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

vi.mock("../server/utils/files/purgeDocument", () => ({
  purgeDocument: () => Promise.resolve(),
  purgeFolder: () => Promise.resolve(),
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

describe("document endpoints", () => {
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

  describe("POST /document/create-folder", () => {
    it("should create a document folder", async () => {
      const response = await request("POST", "/document/create-folder", {
        name: `test-folder-${Date.now()}`,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("GET /documents/:id", () => {
    it.skip("should get document by id", async () => {
      const response = await request("GET", "/documents/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "test");
    });
  });

  describe("PUT /documents/:id", () => {
    it.skip("should update document", async () => {
      const response = await request("PUT", "/documents/1", {
        name: "updated-document",
        type: "pdf",
        size: 2000,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "updated");
    });
  });

  describe("DELETE /documents/:id", () => {
    it.skip("should delete document", async () => {
      const response = await request("DELETE", "/documents/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("DELETE /system/remove-document", () => {
    it("should remove document", async () => {
      const response = await request("DELETE", "/system/remove-document", {
        name: "test-document",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("rawBody", "OK");
    });
  });

  describe("DELETE /system/remove-documents", () => {
    it("should remove multiple documents", async () => {
      const response = await request("DELETE", "/system/remove-documents", {
        names: ["test-document-1", "test-document-2"],
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("rawBody", "OK");
    });
  });

  describe("POST /documents/sync", () => {
    it.skip("should sync document", async () => {
      const response = await request("POST", "/documents/sync", {
        documentId: 1,
        source: "local",
        destination: "cloud",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("documentId", 1);
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
  });

  describe("GET /documents/sync-runs", () => {
    it.skip("should return sync runs", async () => {
      const response = await request("GET", "/documents/sync-runs");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("runs");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalRuns");
    });
  });
});
