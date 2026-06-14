// SPDX-License-Identifier: MIT
// Purpose: Test agent skill whitelist endpoints
// Docs: tests/agentSkillWhitelist.test.js

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

vi.mock("../server/models/agentSkill", () => ({
  AgentSkill: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, name: "web-search" })),
    get: vi.fn(() => Promise.resolve({ id: 1, name: "web-search", whitelisted: true })),
    update: vi.fn(() => Promise.resolve({ id: 1, name: "web-search", whitelisted: false })),
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

describe.skip("agent skill whitelist endpoints", () => {
  // TODO: The real agent-skill routes are /agent-skills/filesystem-agent/is-available,
  // /agent-skills/create-files-agent/is-available, /agent-skills/whitelist/add, and
  // /agent-skills/generated-files/:filename. The CRUD routes expected here do not exist.
  describe("GET /agent-skills", () => {
    it("should return skills list", async () => {
      const response = await request("GET", "/agent-skills");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("skills");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalSkills");
    });

    it("should return skills with pagination", async () => {
      const response = await request("GET", "/agent-skills?offset=0&limit=20");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("skills");
    });
  });

  describe("POST /agent-skills", () => {
    it("should add a skill with valid data", async () => {
      const response = await request("POST", "/agent-skills", {
        name: "web-search",
        description: "Search the web",
        whitelisted: true,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "web-search");
    });

    it("should reject skill with missing name", async () => {
      const response = await request("POST", "/agent-skills", {
        description: "A skill without a name",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /agent-skills/:id", () => {
    it("should get skill by id", async () => {
      const response = await request("GET", "/agent-skills/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "web-search");
    });

    it("should return 404 for non-existent skill", async () => {
      const response = await request("GET", "/agent-skills/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /agent-skills/:id/whitelist", () => {
    it("should toggle whitelist status", async () => {
      const response = await request("PUT", "/agent-skills/1/whitelist", {
        whitelisted: false,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("whitelisted", false);
    });

    it("should reject with invalid data", async () => {
      const response = await request("PUT", "/agent-skills/1/whitelist", {
        whitelisted: "not-boolean",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /agent-skills/:id", () => {
    it("should remove a skill", async () => {
      const response = await request("DELETE", "/agent-skills/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent skill", async () => {
      const response = await request("DELETE", "/agent-skills/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /agent-skills/whitelist", () => {
    it("should return whitelisted skills only", async () => {
      const response = await request("GET", "/agent-skills/whitelist");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("whitelisted");
      expect(Array.isArray(response.body.whitelisted)).toBe(true);
    });
  });
});
