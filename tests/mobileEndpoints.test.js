// SPDX-License-Identifier: MIT
// Purpose: Test mobile app endpoints
// Docs: tests/mobileEndpoints.test.js

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

vi.mock("../server/endpoints/mobile/utils", () => ({
  authenticateMobileDevice: vi.fn(() => Promise.resolve({ deviceId: "device_1", token: "mobile_token" })),
  checkMobileVersion: vi.fn(() => Promise.resolve({ current: "2.0.0", minimum: "1.5.0" })),
}));

vi.mock("../server/endpoints/mobile/middleware", () => ({
  mobileAuthRequired: () => (req, res, next) => next(),
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

describe("mobile endpoints", () => {
  describe("POST /mobile/auth", () => {
    it("should authenticate mobile device with valid key", async () => {
      const response = await request("POST", "/mobile/auth", {
        apiKey: "valid-api-key",
        deviceName: "iPhone 15",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("deviceId");
      expect(response.body).toHaveProperty("token");
    });

    it("should reject with missing api key", async () => {
      const response = await request("POST", "/mobile/auth", {
        deviceName: "iPhone 15",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /mobile/version", () => {
    it("should return mobile version info", async () => {
      const response = await request("GET", "/mobile/version", null, {
        "X-Mobile-App-Version": "2.0.0",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("current");
      expect(response.body).toHaveProperty("minimum");
    });

    it("should return version without headers", async () => {
      const response = await request("GET", "/mobile/version");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("current");
    });
  });

  describe("GET /mobile/workspaces", () => {
    it("should return workspaces for mobile", async () => {
      const response = await request("GET", "/mobile/workspaces", null, {
        Authorization: "Bearer mobile_token",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspaces");
    });

    it("should return 401 without auth header", async () => {
      const response = await request("GET", "/mobile/workspaces");
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /mobile/workspace/:slug/chats", () => {
    it("should return chats for a workspace", async () => {
      const response = await request("GET", "/mobile/workspace/test/chats", null, {
        Authorization: "Bearer mobile_token",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("chats");
    });
  });
});
