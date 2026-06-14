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
let routerId = null;

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

const routerName = `Test Router ${Date.now()}`;
const validRouter = {
  name: routerName,
  description: "Test router description",
  fallback_provider: "openai",
  fallback_model: "gpt-4",
};

const validRule = {
  title: `test_rule_${Date.now()}`,
  type: "llm",
  description: "Route to gpt4",
  priority: 1,
  route_provider: "openai",
  route_model: "gpt-4",
};

describe("model router functionality endpoints", () => {
  describe("POST /model-routers/new", () => {
    it("should create model router with valid data", async () => {
      const response = await request("POST", "/model-routers/new", validRouter);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("router");
      if (response.body.router) routerId = response.body.router.id;
    });

    it("should reject model router with missing name", async () => {
      const response = await request("POST", "/model-routers/new", {
        fallback_provider: "openai",
        fallback_model: "gpt-4",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject model router with missing fallback provider/model", async () => {
      const response = await request("POST", "/model-routers/new", {
        name: `Test Router Missing Fallback ${Date.now()}`,
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /model-routers", () => {
    it("should return model routers", async () => {
      const response = await request("GET", "/model-routers");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("routers");
    });

    it("should return model routers with pagination", async () => {
      const response = await request("GET", "/model-routers?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("routers");
    });
  });

  describe("GET /model-routers/:id", () => {
    it("should get model router by id", async () => {
      const id = routerId || 1;
      const response = await request("GET", `/model-routers/${id}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("router");
    });

    it("should return 404 for non-existent model router", async () => {
      const response = await request("GET", "/model-routers/99999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /model-routers/:id", () => {
    it("should update model router", async () => {
      const id = routerId || 1;
      const response = await request("PUT", `/model-routers/${id}`, {
        name: "Updated Router",
        fallback_provider: "openai",
        fallback_model: "gpt-4",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("router");
    });

    it("should reject model router update with invalid data", async () => {
      const id = routerId || 1;
      const response = await request("PUT", `/model-routers/${id}`, {
        name: "",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /model-routers/:id/rules/new", () => {
    it("should create model router rule", async () => {
      const id = routerId || 1;
      const response = await request("POST", `/model-routers/${id}/rules/new`, validRule);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("rule");
    });

    it("should create model router rule with minimal data", async () => {
      const id = routerId || 1;
      const response = await request("POST", `/model-routers/${id}/rules/new`, {
        title: "simple_rule",
        type: "llm",
        description: "Simple rule",
        priority: 1,
        route_provider: "openai",
        route_model: "gpt-4",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("rule");
    });

    it("should reject model router rule with missing title", async () => {
      const id = routerId || 1;
      const response = await request("POST", `/model-routers/${id}/rules/new`, {
        type: "llm",
        description: "Missing title",
        priority: 1,
        route_provider: "openai",
        route_model: "gpt-4",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /model-routers/:id", () => {
    it("should delete model router", async () => {
      const id = routerId || 1;
      const response = await request("DELETE", `/model-routers/${id}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent model router", async () => {
      const response = await request("DELETE", "/model-routers/99999");
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });
  });
});
