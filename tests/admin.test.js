// SPDX-License-Identifier: MIT
// Purpose: Test admin endpoints (admin)
// Docs: tests/admin.test.js

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
    create: vi.fn(() => Promise.resolve({ id: 1, username: "test" })),
    get: vi.fn(() => Promise.resolve({ id: 1, username: "test" })),
    update: vi.fn(() => Promise.resolve({ id: 1, username: "updated" })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
  },
}));

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

describe("admin endpoints", () => {
  describe("GET /admin/users", () => {
    it("should return users", async () => {
      const response = await request("GET", "/admin/users");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("users");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalUsers");
    });

    it("should return users with pagination", async () => {
      const response = await request("GET", "/admin/users?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("users");
    });
  });

  describe("POST /admin/users", () => {
    it("should create user", async () => {
      const response = await request("POST", "/admin/users", {
        username: "test-user",
        password: "test-password",
        role: "user",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("username", "test-user");
    });
  });

  describe("GET /admin/users/:id", () => {
    it("should get user by id", async () => {
      const response = await request("GET", "/admin/users/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("username", "test");
    });
  });

  describe("PUT /admin/users/:id", () => {
    it("should update user", async () => {
      const response = await request("PUT", "/admin/users/1", {
        username: "updated-user",
        role: "admin",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("username", "updated");
    });
  });

  describe("DELETE /admin/users/:id", () => {
    it("should delete user", async () => {
      const response = await request("DELETE", "/admin/users/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("GET /admin/event-logs", () => {
    it("should return event logs", async () => {
      const response = await request("GET", "/admin/event-logs");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("logs");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalLogs");
    });

    it("should return event logs with pagination", async () => {
      const response = await request("GET", "/admin/event-logs?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("logs");
    });
  });

  describe("DELETE /admin/event-logs", () => {
    it("should delete event logs", async () => {
      const response = await request("DELETE", "/admin/event-logs");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });
});
