// SPDX-License-Identifier: MIT
// Purpose: Test model router endpoints (model-routers, model-router-rules)
// Docs: tests/modelRouter.test.js

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
let ruleId = null;

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

describe("model router endpoints", () => {
  describe("GET /model-routers", () => {
    it("should return model routers", async () => {
      const response = await request("GET", "/model-routers");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("routers");
    });
  });

  describe("POST /model-routers/new", () => {
    it("should create model router", async () => {
      const response = await request("POST", "/model-routers/new", {
        name: `test-router-${Date.now()}`,
        description: "Test router description",
        fallback_provider: "openai",
        fallback_model: "gpt-4",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("router");
      if (response.body.router) routerId = response.body.router.id;
    });
  });

  describe("GET /model-routers/:id", () => {
    it("should get model router by id", async () => {
      const id = routerId || 1;
      const response = await request("GET", `/model-routers/${id}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("router");
    });
  });

  describe("PUT /model-routers/:id", () => {
    it("should update model router", async () => {
      const id = routerId || 1;
      const response = await request("PUT", `/model-routers/${id}`, {
        name: `updated-router-${Date.now()}`,
        fallback_provider: "openai",
        fallback_model: "gpt-4",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("router");
    });
  });

  describe("POST /model-routers/:id/rules/new", () => {
    it("should create model router rule", async () => {
      const id = routerId || 1;
      const response = await request("POST", `/model-routers/${id}/rules/new`, {
        title: `test_rule_${Date.now()}`,
        type: "llm",
        description: "Route to gpt4",
        priority: 1,
        route_provider: "openai",
        route_model: "gpt-4",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("rule");
      if (response.body.rule) ruleId = response.body.rule.id;
    });
  });

  describe("PUT /model-routers/:id/rules/:ruleId", () => {
    it("should update model router rule", async () => {
      const id = routerId || 1;
      const rid = ruleId || 1;
      const response = await request("PUT", `/model-routers/${id}/rules/${rid}`, {
        title: `updated_rule_${Date.now()}`,
        description: "Updated description",
        priority: 2,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("rule");
    });
  });

  describe("DELETE /model-routers/:id/rules/:ruleId", () => {
    it("should delete model router rule", async () => {
      const id = routerId || 1;
      const rid = ruleId || 1;
      const response = await request("DELETE", `/model-routers/${id}/rules/${rid}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success");
    });
  });

  describe("DELETE /model-routers/:id", () => {
    it("should delete model router", async () => {
      const id = routerId || 1;
      const response = await request("DELETE", `/model-routers/${id}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success");
    });
  });

  describe("GET /model-routers/:id/rules", () => {
    it.skip("TODO: There is no standalone GET /model-routers/:id/rules endpoint; rules are returned as part of the router object via GET /model-routers/:id.", async () => {
      const response = await request("GET", "/model-routers/1/rules");
      expect(response.status).toBe(200);
    });
  });

  describe("GET /model-router-rule/:id", () => {
    it.skip("TODO: There is no GET /model-routers/:id/rules/:ruleId endpoint; rules are accessed via the router object.", async () => {
      const response = await request("GET", "/model-routers/1/rules/1");
      expect(response.status).toBe(200);
    });
  });
});
