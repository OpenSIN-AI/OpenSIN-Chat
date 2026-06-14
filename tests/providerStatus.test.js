// SPDX-License-Identifier: MIT
// Purpose: Test provider status and diagnostics endpoints
// Docs: tests/providerStatus.test.js

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

vi.mock("../server/utils/providerKeyStatus", () => ({
  getProviderKeyStatuses: vi.fn(() => Promise.resolve([
    { provider: "openai", configured: true, keyPresent: true },
    { provider: "azure", configured: false, keyPresent: false },
  ])),
}));

vi.mock("../server/utils/providerConnectivity", () => ({
  probeProvider: vi.fn(() => Promise.resolve({ reachable: true, latency: 150 })),
  probeAllProviders: vi.fn(() => Promise.resolve([
    { provider: "openai", reachable: true, latency: 120 },
    { provider: "anthropic", reachable: false, latency: null },
  ])),
}));

vi.mock("../server/utils/paths", () => ({
  pathsHealth: vi.fn(() => Promise.resolve({ healthy: true, diskSpace: "10GB" })),
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

describe("provider status endpoints", () => {
  describe("GET /provider/status", () => {
    it("should return provider key statuses", async () => {
      const response = await request("GET", "/provider/status");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("providers");
      expect(Array.isArray(response.body.providers)).toBe(true);
    });

    it("should indicate which providers are configured", async () => {
      const response = await request("GET", "/provider/status");
      expect(response.status).toBe(200);
      const openai = response.body.providers.find(p => p.provider === "openai");
      expect(openai).toBeDefined();
      expect(openai.configured).toBe(true);
    });
  });

  describe("GET /provider/health", () => {
    it("should return health check results", async () => {
      const response = await request("GET", "/provider/health");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("health");
    });

    it("should include health status for each provider", async () => {
      const response = await request("GET", "/provider/health");
      expect(response.body).toHaveProperty("healthy");
    });
  });

  describe("GET /provider/probe/:name", () => {
    it("should probe a specific provider", async () => {
      const response = await request("GET", "/provider/probe/openai");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("reachable", true);
      expect(response.body).toHaveProperty("latency", 150);
    });

    it("should return 404 for unknown provider", async () => {
      const response = await request("GET", "/provider/probe/unknown");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /provider/probe-all", () => {
    it("should probe all providers", async () => {
      const response = await request("GET", "/provider/probe-all");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("results");
      expect(Array.isArray(response.body.results)).toBe(true);
    });
  });

  describe("GET /provider/paths-health", () => {
    it("should return path health information", async () => {
      const response = await request("GET", "/provider/paths-health");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("healthy", true);
      expect(response.body).toHaveProperty("diskSpace");
    });
  });
});
