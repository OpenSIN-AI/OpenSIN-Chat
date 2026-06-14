// SPDX-License-Identifier: MIT
// Purpose: Test agent functionality endpoints
// Docs: tests/agentFunctionality.test.js

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

vi.mock("../server/models/agent", () => ({
  Agent: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, name: "test" })),
    get: vi.fn(() => Promise.resolve({ id: 1, name: "test" })),
    update: vi.fn(() => Promise.resolve({ id: 1, name: "updated" })),
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

describe.skip("agent functionality endpoints", () => {
  // TODO: The server has no /agents CRUD routes. The real agent-related routes
  // are /agent-flows/* and /admin/agent-skills/*.
  describe("POST /agents", () => {
    it("should create agent with valid data", async () => {
      const response = await request("POST", "/agents", {
        name: "Test Agent",
        description: "Test agent description",
        model: "gpt-4",
        temperature: 0.7,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Test Agent");
    });

    it("should create agent with minimal data", async () => {
      const response = await request("POST", "/agents", {
        name: "Simple Agent",
        model: "gpt-4",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Simple Agent");
    });

    it("should reject agent with missing name", async () => {
      const response = await request("POST", "/agents", {
        model: "gpt-4",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject agent with missing model", async () => {
      const response = await request("POST", "/agents", {
        name: "Test Agent",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /agents", () => {
    it("should return agents", async () => {
      const response = await request("GET", "/agents");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("agents");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalAgents");
    });

    it("should return agents with pagination", async () => {
      const response = await request("GET", "/agents?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("agents");
    });
  });

  describe("GET /agents/:id", () => {
    it("should get agent by id", async () => {
      const response = await request("GET", "/agents/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "test");
    });

    it("should return 404 for non-existent agent", async () => {
      const response = await request("GET", "/agents/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /agents/:id", () => {
    it("should update agent", async () => {
      const response = await request("PUT", "/agents/1", {
        name: "Updated Agent",
        description: "Updated description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "updated");
    });

    it("should reject agent update with invalid data", async () => {
      const response = await request("PUT", "/agents/1", {
        name: "",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /agents/:id", () => {
    it("should delete agent", async () => {
      const response = await request("DELETE", "/agents/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent agent", async () => {
      const response = await request("DELETE", "/agents/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /agents/:id/chat", () => {
    it("should send message to agent", async () => {
      const response = await request("POST", "/agents/1/chat", {
        message: "Hello, world!",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("message", "Hello, world!");
    });

    it("should reject message with empty content", async () => {
      const response = await request("POST", "/agents/1/chat", {
        message: "",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject message with missing content", async () => {
      const response = await request("POST", "/agents/1/chat", {});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });
});
