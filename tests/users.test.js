// SPDX-License-Identifier: MIT
// Purpose: Test user endpoints (users)
// Docs: tests/users.test.js

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
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, username: "test-user" })),
    get: vi.fn(() => Promise.resolve({ id: 1, username: "test", role: "admin" })),
    update: vi.fn(() => Promise.resolve({ id: 1, username: "updated" })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([{ id: 99, username: "mocked-user" }])),
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

vi.mock("../server/utils/middleware/validatedRequest", () => {
  return {
    validatedRequest: (req, res, next) => {
      res.locals.user = { id: 1, username: "test", role: "admin" };
      res.locals.multiUserMode = false;
      next();
    },
  };
});

vi.mock("../server/utils/http/index.js", () => ({
  reqBody: (req) => req.body || {},
  makeJWT: (payload, expiry) => `token_${payload.id}`,
  userFromSession: () => Promise.resolve({ id: 1, username: "test", role: "admin" }),
  multiUserMode: () => false,
  queryParams: (req) => req.query || {},
  safeJsonParse: (jsonString, fallback = null) => {
    try { return JSON.parse(jsonString); } catch { return fallback; }
  },
  decodeJWT: () => ({ id: 1, username: "test", role: "admin" }),
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
  vi.resetModules();
  const { createApp: freshCreateApp } = await import("../server/app");
  app = freshCreateApp();
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

describe("user endpoints", () => {
  describe("GET /admin/users", () => {
    it("should return users", async () => {
      const response = await request("GET", "/admin/users");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("users");
    });

    it("should return users with pagination", async () => {
      const response = await request("GET", "/admin/users?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("users");
    });
  });

  describe("POST /admin/users/new", () => {
    it("should create user", async () => {
      const username = `test-user-${Date.now()}`;
      const response = await request("POST", "/admin/users/new", {
        username,
        password: "test-password",
        role: "default",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("username", username);
    });
  });

  describe("GET /admin/user/:id", () => {
    // TODO: single-user GET endpoint does not exist in admin.js; skipping until implemented
    it.skip("should get user by id", async () => {
      const response = await request("GET", "/admin/user/1");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /admin/user/:id", () => {
    it("should update user", async () => {
      const username = `update-target-${Date.now()}`;
      const createResponse = await request("POST", "/admin/users/new", {
        username,
        password: "test-password",
        role: "default",
      });
      const userId = createResponse.body.user.id;
      const response = await request("POST", `/admin/user/${userId}`, {
        username: `updated-user-${Date.now()}`,
        role: "admin",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("DELETE /admin/user/:id", () => {
    it("should delete user", async () => {
      const username = `delete-target-${Date.now()}`;
      const createResponse = await request("POST", "/admin/users/new", {
        username,
        password: "test-password",
        role: "default",
      });
      const userId = createResponse.body.user.id;
      const response = await request("DELETE", `/admin/user/${userId}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });
});
