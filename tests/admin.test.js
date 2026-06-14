// SPDX-License-Identifier: MIT
// Purpose: Test admin endpoints (admin)
// Docs: tests/admin.test.js

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
console.log("TOP LEVEL ADMIN TEST");

import { User } from "../server/models/user";
import { reqBody } from "../server/utils/http";

vi.mock("../server/utils/helpers", () => ({
  getVectorDbClass: () => ({ namespaceCount: vi.fn(() => Promise.resolve(0)), totalVectors: vi.fn(() => Promise.resolve(0)) }),
}));

vi.mock("../server/utils/helpers/customModels", () => ({
  getCustomModels: () => ({ models: [], error: null }),
}));

vi.mock("../server/models/systemSettings", () => ({
  SystemSettings: {
    currentSettings: () => Promise.resolve({}),
    isMultiUserMode: () => Promise.resolve(false),
  },
}));

vi.mock("../server/models/user", () => {
  console.log("USER MOCK FACTORY RUNNING");
  return {
    User: {
      _get: vi.fn(() => Promise.resolve(null)),
      filterFields: vi.fn((user) => user),
      whereWithData: vi.fn(() => Promise.resolve([])),
      count: vi.fn(() => Promise.resolve(0)),
      create: vi.fn(() => Promise.resolve({ id: 1, username: "test" })),
      get: vi.fn(() => Promise.resolve({ id: 1, username: "test", role: "admin" })),
      update: vi.fn(() => Promise.resolve({ success: true })),
      delete: vi.fn(() => Promise.resolve(true)),
      where: vi.fn(() => Promise.resolve([])),
    },
  };
});

vi.mock("../server/models/eventLogs", () => ({
  EventLogs: {
    logEvent: vi.fn(() => Promise.resolve()),
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    delete: vi.fn(() => Promise.resolve()),
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

vi.mock("../server/utils/http", () => {
  console.log("HTTP MOCK FACTORY RUNNING");
  return {
    reqBody: (req) => ({}),
    makeJWT: (payload, expiry) => `token_${payload.id}`,
    userFromSession: () => Promise.resolve({ id: 1, username: "test", role: "admin" }),
    multiUserMode: () => false,
    queryParams: () => ({}),
  };
});

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
let createApp;

beforeAll(async () => {
  vi.resetModules();
  const mod = await import("../server/app");
  createApp = mod.createApp;
  app = createApp();
}, 120000);

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
  let body = data ? data : null;
  if (data && response.headers.get("content-type")?.includes("application/json")) {
    try {
      body = JSON.parse(data);
    } catch {
      /* leave as raw text */
    }
  }
  return {
    status: response.status,
    headers: response.headers,
    body,
  };
};

describe("admin endpoints", () => {
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
      const username = `admin-test-${Date.now()}`;
      const response = await request("POST", "/admin/users/new", {
        username,
        password: "test-password",
        role: "default",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id");
      expect(response.body.user).toHaveProperty("username", username);
      // Clean up the created user so later runs stay deterministic.
      await User.delete({ username });
    });
  });

  describe("GET /admin/users", () => {
    it("should get users list", async () => {
      const response = await request("GET", "/admin/users");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("users");
    });
  });

  describe("POST /admin/user/:id", () => {
    it("should update user", async () => {
      const username = `admin-update-${Date.now()}`;
      const { user } = await User.create({
        username,
        password: "test-password",
        role: "default",
      });
      const response = await request("POST", `/admin/user/${user.id}`, {
        username: `${username}-updated`,
        role: "admin",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      await User.delete({ id: user.id });
    });
  });

  describe("DELETE /admin/user/:id", () => {
    it("should delete user", async () => {
      const username = `admin-delete-${Date.now()}`;
      const { user } = await User.create({
        username,
        password: "test-password",
        role: "default",
      });
      const response = await request("DELETE", `/admin/user/${user.id}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("GET /admin/event-logs", () => {
    // TODO: No /admin/event-logs endpoint exists in server/endpoints/admin.js.
    it.skip("should return event logs", async () => {
      const response = await request("GET", "/admin/event-logs");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("logs");
    });

    it.skip("should return event logs with pagination", async () => {
      const response = await request("GET", "/admin/event-logs?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("logs");
    });
  });

  describe("DELETE /admin/event-logs", () => {
    // TODO: No /admin/event-logs endpoint exists in server/endpoints/admin.js.
    it.skip("should delete event logs", async () => {
      const response = await request("DELETE", "/admin/event-logs");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });
});
