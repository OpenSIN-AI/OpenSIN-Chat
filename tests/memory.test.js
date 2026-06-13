// SPDX-License-Identifier: MIT
// Purpose: Test memory endpoints (memory, memory-management)
// Docs: tests/memory.test.js

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

vi.mock("../server/models/memory", () => ({
  Memory: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, content: "test memory" })),
    get: vi.fn(() => Promise.resolve({ id: 1, content: "test memory" })),
    update: vi.fn(() => Promise.resolve({ id: 1, content: "updated memory" })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
    migrateToMultiUser: () => Promise.resolve(),
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

describe("memory endpoints", () => {
  describe("POST /memory", () => {
    it("should create memory", async () => {
      const response = await request("POST", "/memory", {
        content: "Test memory content",
        metadata: { source: "test" },
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("content", "Test memory content");
    });

    it("should create memory with required fields only", async () => {
      const response = await request("POST", "/memory", {
        content: "Simple memory",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("content", "Simple memory");
    });
  });

  describe("GET /memory/:id", () => {
    it("should get memory by id", async () => {
      const response = await request("GET", "/memory/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("content", "test memory");
    });
  });

  describe("PUT /memory/:id", () => {
    it("should update memory", async () => {
      const response = await request("PUT", "/memory/1", {
        content: "Updated memory content",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("content", "updated memory");
    });
  });

  describe("DELETE /memory/:id", () => {
    it("should delete memory", async () => {
      const response = await request("DELETE", "/memory/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("GET /memory", () => {
    it("should list memories", async () => {
      const response = await request("GET", "/memory");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("memories");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalMemories");
    });

    it("should list memories with pagination", async () => {
      const response = await request("GET", "/memory?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("memories");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalMemories");
    });
  });

  describe("POST /memory/search", () => {
    it("should search memories", async () => {
      const response = await request("POST", "/memory/search", {
        query: "test",
        limit: 10,
        offset: 0,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("memories");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalMemories");
    });

    it("should search memories with filters", async () => {
      const response = await request("POST", "/memory/search", {
        query: "test",
        limit: 5,
        offset: 0,
        metadata: { source: "test" },
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("memories");
    });
  });

  describe("POST /memory/import", () => {
    it("should import memories", async () => {
      const response = await request("POST", "/memory/import", {
        memories: [
          { content: "Imported memory 1" },
          { content: "Imported memory 2" },
        ],
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("importedCount", 2);
    });
  });

  describe("POST /memory/export", () => {
    it("should export memories", async () => {
      const response = await request("POST", "/memory/export", {
        format: "json",
        memoryIds: [1, 2, 3],
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
    });
  });
});
