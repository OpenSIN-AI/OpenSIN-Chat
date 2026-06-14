// SPDX-License-Identifier: MIT
// Purpose: Test model router functionality endpoints
// Docs: tests/modelRouterFunctionality.test.js

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

vi.mock("../server/utils/middleware/chatHistoryViewable", () => ({
  chatHistoryViewable: () => (req, res, next) => next(),
}));

vi.mock("../server/utils/collectorApi", () => ({
  CollectorApi: () => ({ online: () => Promise.resolve(true), acceptedFileTypes: () => Promise.resolve([]) }),
}));

vi.mock("../server/utils/chats", () => ({
  VALID_COMMANDS: { help: true, clear: true },
}));

vi.mock("../server/models/modelRouter", () => ({
  ModelRouter: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, name: "test" })),
    get: vi.fn(() => Promise.resolve({ id: 1, name: "test" })),
    update: vi.fn(() => Promise.resolve({ id: 1, name: "updated" })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock("../server/models/modelRouterRule", () => ({
  ModelRouterRule: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, rule: "test" })),
    get: vi.fn(() => Promise.resolve({ id: 1, rule: "test" })),
    update: vi.fn(() => Promise.resolve({ id: 1, rule: "updated" })),
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
  return {
    status: response.status,
    headers: response.headers,
    body: data ? JSON.parse(data) : null,
  };
};

describe("model router functionality endpoints", () => {
  describe("POST /model-router", () => {
    it("should create model router with valid data", async () => {
      const response = await request("POST", "/model-router", {
        name: "Test Router",
        description: "Test router description",
        model: "gpt-4",
        temperature: 0.7,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Test Router");
    });

    it("should create model router with minimal data", async () => {
      const response = await request("POST", "/model-router", {
        name: "Simple Router",
        model: "gpt-4",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Simple Router");
    });

    it("should reject model router with missing name", async () => {
      const response = await request("POST", "/model-router", {
        model: "gpt-4",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject model router with missing model", async () => {
      const response = await request("POST", "/model-router", {
        name: "Test Router",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /model-router", () => {
    it("should return model routers", async () => {
      const response = await request("GET", "/model-router");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("routers");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalRouters");
    });

    it("should return model routers with pagination", async () => {
      const response = await request("GET", "/model-router?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("routers");
    });
  });

  describe("GET /model-router/:id", () => {
    it("should get model router by id", async () => {
      const response = await request("GET", "/model-router/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "test");
    });

    it("should return 404 for non-existent model router", async () => {
      const response = await request("GET", "/model-router/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /model-router/:id", () => {
    it("should update model router", async () => {
      const response = await request("PUT", "/model-router/1", {
        name: "Updated Router",
        description: "Updated description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "updated");
    });

    it("should reject model router update with invalid data", async () => {
      const response = await request("PUT", "/model-router/1", {
        name: "",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /model-router/:id", () => {
    it("should delete model router", async () => {
      const response = await request("DELETE", "/model-router/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent model router", async () => {
      const response = await request("DELETE", "/model-router/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /model-router-rule", () => {
    it("should create model router rule", async () => {
      const response = await request("POST", "/model-router-rule", {
        routerId: 1,
        rule: "test-rule",
        priority: 1,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("rule", "test-rule");
    });

    it("should create model router rule with minimal data", async () => {
      const response = await request("POST", "/model-router-rule", {
        routerId: 1,
        rule: "simple-rule",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("rule", "simple-rule");
    });

    it("should reject model router rule with missing routerId", async () => {
      const response = await request("POST", "/model-router-rule", {
        rule: "test-rule",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject model router rule with missing rule", async () => {
      const response = await request("POST", "/model-router-rule", {
        routerId: 1,
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });
});
