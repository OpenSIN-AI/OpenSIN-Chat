// SPDX-License-Identifier: MIT
// Purpose: Test agent endpoints (agent-skills, agent-flows, imported-agent-plugins)
// Docs: tests/agent.test.js

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

vi.mock("../server/models/agentSkillWhitelist", () => ({
  AgentSkillWhitelist: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, skill: "test" })),
    get: vi.fn(() => Promise.resolve({ id: 1, skill: "test" })),
    update: vi.fn(() => Promise.resolve({ id: 1, skill: "updated" })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
    clearSingleUserWhitelist: () => Promise.resolve(),
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

describe("agent endpoints", () => {
  describe("GET /agent/skills", () => {
    it("should return agent skills", async () => {
      const response = await request("GET", "/agent/skills");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("skills");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalSkills");
    });

    it("should return agent skills with pagination", async () => {
      const response = await request("GET", "/agent/skills?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("skills");
    });
  });

  describe("POST /agent/skills", () => {
    it("should create agent skill", async () => {
      const response = await request("POST", "/agent/skills", {
        skill: "test-skill",
        description: "Test skill description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("skill", "test-skill");
    });
  });

  describe("GET /agent/skills/:id", () => {
    it("should get agent skill by id", async () => {
      const response = await request("GET", "/agent/skills/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("skill", "test");
    });
  });

  describe("PUT /agent/skills/:id", () => {
    it("should update agent skill", async () => {
      const response = await request("PUT", "/agent/skills/1", {
        skill: "updated-skill",
        description: "Updated skill description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("skill", "updated");
    });
  });

  describe("DELETE /agent/skills/:id", () => {
    it("should delete agent skill", async () => {
      const response = await request("DELETE", "/agent/skills/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("GET /agent/flows", () => {
    it("should return agent flows", async () => {
      const response = await request("GET", "/agent/flows");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("flows");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalFlows");
    });
  });

  describe("POST /agent/imported-agent-plugins", () => {
    it("should import agent plugin", async () => {
      const response = await request("POST", "/agent/imported-agent-plugins", {
        name: "test-plugin",
        description: "Test plugin",
        endpoint: "http://example.com/api",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "test-plugin");
    });
  });

  describe("GET /agent/imported-agent-plugins", () => {
    it("should return imported agent plugins", async () => {
      const response = await request("GET", "/agent/imported-agent-plugins");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("plugins");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalPlugins");
    });
  });
});
