// SPDX-License-Identifier: MIT
// Purpose: Test agent flows endpoints
// Docs: tests/agentFlows.test.js

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
  User: { _get: vi.fn(() => Promise.resolve(null)), filterFields: vi.fn((user) => user) },
}));

vi.mock("../server/models/eventLogs", () => ({
  EventLogs: { logEvent: vi.fn(() => Promise.resolve()) },
}));

vi.mock("../server/models/telemetry", () => ({
  Telemetry: { sendTelemetry: vi.fn(() => Promise.resolve()) },
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

vi.mock("../server/models/agentFlow", () => ({
  AgentFlow: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, name: "test flow" })),
    get: vi.fn(() => Promise.resolve({ id: 1, name: "test flow", steps: [] })),
    update: vi.fn(() => Promise.resolve({ id: 1, name: "updated flow" })),
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
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  const data = await response.text();
  return { status: response.status, headers: response.headers, body: data ? JSON.parse(data) : null };
};

describe("agent flows endpoints", () => {
  describe("GET /agent-flows", () => {
    it("should return agent flows list", async () => {
      const response = await request("GET", "/agent-flows");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("flows");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalFlows");
    });

    it("should return flows with pagination", async () => {
      const response = await request("GET", "/agent-flows?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("flows");
    });
  });

  describe("POST /agent-flows", () => {
    it("should create an agent flow with valid data", async () => {
      const response = await request("POST", "/agent-flows", {
        name: "Test Flow",
        description: "A test agent flow",
        steps: [{ type: "llm", config: { prompt: "Hello" } }],
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "test flow");
    });

    it("should create flow with minimal data", async () => {
      const response = await request("POST", "/agent-flows", {
        name: "Simple Flow",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
    });

    it("should reject flow with missing name", async () => {
      const response = await request("POST", "/agent-flows", {
        steps: [{ type: "llm" }],
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /agent-flows/:id", () => {
    it("should get agent flow by id", async () => {
      const response = await request("GET", "/agent-flows/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "test flow");
    });

    it("should return 404 for non-existent flow", async () => {
      const response = await request("GET", "/agent-flows/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /agent-flows/:id", () => {
    it("should update an agent flow", async () => {
      const response = await request("PUT", "/agent-flows/1", {
        name: "Updated Flow",
        description: "Updated description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "updated flow");
    });

    it("should reject update with invalid data", async () => {
      const response = await request("PUT", "/agent-flows/1", { name: "" });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /agent-flows/:id", () => {
    it("should delete an agent flow", async () => {
      const response = await request("DELETE", "/agent-flows/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent flow", async () => {
      const response = await request("DELETE", "/agent-flows/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /agent-flows/:id/execute", () => {
    it("should execute an agent flow", async () => {
      const response = await request("POST", "/agent-flows/1/execute", {
        input: { message: "Hello" },
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("result");
    });

    it("should return 404 for non-existent flow", async () => {
      const response = await request("POST", "/agent-flows/999/execute", {
        input: { message: "Hello" },
      });
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
