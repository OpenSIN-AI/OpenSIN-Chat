// SPDX-License-Identifier: MIT
// Purpose: Test API router integration endpoints
// Docs: tests/apiEndpoints.test.js

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

vi.mock("../server/utils/collectorApi", () => ({
  CollectorApi: () => ({ online: () => Promise.resolve(true), acceptedFileTypes: () => Promise.resolve([]) }),
}));

vi.mock("../server/utils/chats", () => ({
  VALID_COMMANDS: { help: true, clear: true },
}));

vi.mock("../server/endpoints/api", () => ({
  developerEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/auth", () => ({
  apiAuthEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/admin", () => ({
  apiAdminEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/system", () => ({
  apiSystemEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/workspace", () => ({
  apiWorkspaceEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/document", () => ({
  apiDocumentEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/embed", () => ({
  apiEmbedEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/openai", () => ({
  apiOpenAICompatibleEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/userManagement", () => ({
  apiUserManagementEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/workspaceThread", () => ({
  apiWorkspaceThreadEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/research", () => ({
  apiResearchEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/reports", () => ({
  apiReportsEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/orchestrator", () => ({
  apiOrchestratorEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/pdfAnalysis", () => ({
  apiPdfAnalysisEndpoints: vi.fn(),
}));

vi.mock("../server/endpoints/api/politician", () => ({
  apiPoliticianEndpoints: vi.fn(),
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

describe.skip("API endpoint integration", () => {
  // TODO: Most /api/v1/* routes used here do not exist (health, version,
  // auth/login) or are protected by validApiKey which now bypasses in test mode.
  // The remaining /v1/workspaces route exists but the mock-based design is not
  // compatible with CommonJS require() in the server. Revive as real
  // integration tests if the API surface is expanded.
  describe("GET /api/v1/health", () => {
    it("should return API health status", async () => {
      const response = await request("GET", "/api/v1/health");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status");
    });
  });

  describe("GET /api/v1/version", () => {
    it("should return API version", async () => {
      const response = await request("GET", "/api/v1/version");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("version");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should attempt login with valid credentials", async () => {
      const response = await request("POST", "/api/v1/auth/login", {
        username: "admin",
        password: "password",
      });
      expect(response.status).toBe(200);
    });

    it("should reject with missing credentials", async () => {
      const response = await request("POST", "/api/v1/auth/login", {});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/v1/workspaces", () => {
    it("should return workspaces via API", async () => {
      const response = await request("GET", "/api/v1/workspaces");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspaces");
    });
  });
});
