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
  describe("POST /mobile/register", () => {
    it("should reject invalid registration token", async () => {
      const response = await request("POST", "/mobile/register", {
        deviceName: "iPhone 15",
        deviceOs: "ios",
      }, {
        Authorization: "Bearer invalid-token",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject registration without token", async () => {
      const response = await request("POST", "/mobile/register", {
        deviceName: "iPhone 15",
        deviceOs: "ios",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /mobile/auth", () => {
    it("should reject invalid device token", async () => {
      const response = await request("GET", "/mobile/auth", null, {
        "x-opensin-mobile-device-token": "invalid-token",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject without device token", async () => {
      const response = await request("GET", "/mobile/auth");
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /mobile/version", () => {
    it.skip("TODO: /mobile/version endpoint does not exist in server/endpoints/mobile/index.js", async () => {
      const response = await request("GET", "/mobile/version", null, {
        "X-Mobile-App-Version": "2.0.0",
      });
      expect(response.status).toBe(200);
    });
  });

  describe("POST /mobile/send/workspaces", () => {
    it("should reject without device token", async () => {
      const response = await request("POST", "/mobile/send/workspaces");
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject invalid device token", async () => {
      const response = await request("POST", "/mobile/send/workspaces", {}, {
        "x-opensin-mobile-device-token": "invalid-token",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /mobile/send/workspace-content", () => {
    it("should reject without device token", async () => {
      const response = await request("POST", "/mobile/send/workspace-content", {
        workspaceSlug: "test",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });
});
