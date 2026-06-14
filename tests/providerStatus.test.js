// SPDX-License-Identifier: MIT
// Purpose: Test provider status and diagnostics endpoints
// Docs: tests/providerStatus.test.js

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
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
  reqBody: (req) => req.body || {},
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

let app;

beforeAll(async () => {
  app = createApp();
});

afterAll(async () => {
  if (app && app.close) await app.close();
});

const request = async (method, path, body = null) => {
  const url = `http://localhost:3001${path}`;
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  const data = await response.text();
  return { status: response.status, body: data ? JSON.parse(data) : null };
};

describe("provider status endpoints", () => {
  describe("GET /system/provider-key-status", () => {
    it("should return provider key statuses and path health", async () => {
      const response = await request("GET", "/system/provider-key-status");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("providers");
      expect(Array.isArray(response.body.providers)).toBe(true);
      expect(response.body).toHaveProperty("paths");
      expect(response.body).toHaveProperty("checkedAt");
    });
  });

  describe("GET /system/provider-connectivity", () => {
    it("should probe all registered providers", async () => {
      const response = await request("GET", "/system/provider-connectivity");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("results");
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body).toHaveProperty("checkedAt");
    }, 20000);

    it("should probe a single provider via query parameter", async () => {
      const response = await request("GET", "/system/provider-connectivity?provider=unknown");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("results");
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0]).toHaveProperty("error", "Unknown provider id");
    }, 10000);
  });
});
