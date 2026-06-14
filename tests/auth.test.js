// SPDX-License-Identifier: MIT
// Purpose: Test authentication endpoints (login, logout, register)
// Docs: tests/auth.test.js

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
    create: vi.fn(() => Promise.resolve({ id: 1, username: "test", password: "test" })),
    delete: vi.fn(() => Promise.resolve()),
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

describe.skip("authentication endpoints", () => {
  // TODO: The server has no /login, /logout, or /register routes.
  // Authentication is handled via /request-token (login), /onboarding, and
  // JWT/cookie session. Revive these tests once dedicated auth routes are
  // added or by testing /request-token with real DB integration.
  describe("POST /login", () => {
    it("should login with valid credentials", async () => {
      const response = await request("POST", "/login", {
        username: "test",
        password: "test",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("valid", true);
      expect(response.body).toHaveProperty("token");
    });

    it("should reject invalid credentials", async () => {
      const response = await request("POST", "/login", {
        username: "invalid",
        password: "invalid",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("valid", false);
      expect(response.body).toHaveProperty("token", null);
    });

    it("should reject missing credentials", async () => {
      const response = await request("POST", "/login", {});
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("valid", false);
    });
  });

  describe("POST /logout", () => {
    it("should logout user", async () => {
      const response = await request("POST", "/logout", {});
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("POST /register", () => {
    it("should register new user", async () => {
      const response = await request("POST", "/register", {
        username: "newuser",
        password: "newpassword",
        email: "newuser@example.com",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("username", "newuser");
    });

    it("should reject duplicate username", async () => {
      const response = await request("POST", "/register", {
        username: "test",
        password: "test",
        email: "test@example.com",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });
});
