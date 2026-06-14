// SPDX-License-Identifier: MIT
// Purpose: Test error handling scenarios
// Docs: tests/errors.test.js

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

describe("error handling scenarios", () => {
  describe("Invalid request handling", () => {
    it("should handle missing required fields", async () => {
      const response = await request("POST", "/users", {});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should handle invalid data types", async () => {
      const response = await request("POST", "/users", {
        username: 123, // Should be string
        password: "test",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should handle malformed JSON", async () => {
      const response = await request("POST", "/users", "invalid json");
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Database error handling", () => {
    it("should handle database connection errors", async () => {
      vi.mock("../server/models/user", () => ({
        User: {
          _get: vi.fn(() => Promise.reject(new Error("Database connection failed"))),
          filterFields: vi.fn((user) => user),
        },
      }));

      const response = await request("GET", "/users/1");
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });

    it("should handle database constraint violations", async () => {
      vi.mock("../server/models/user", () => ({
        User: {
          _get: vi.fn(() => Promise.reject(new Error("Unique constraint violation"))),
          filterFields: vi.fn((user) => user),
        },
      }));

      const response = await request("GET", "/users/1");
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Authentication error handling", () => {
    it("should handle invalid authentication tokens", async () => {
      const response = await request("GET", "/system/check-token", {
        headers: {
          Authorization: "Invalid token",
        },
      });
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("should handle expired authentication tokens", async () => {
      const response = await request("GET", "/system/check-token", {
        headers: {
          Authorization: "Bearer expired_token",
        },
      });
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Authorization error handling", () => {
    it("should handle insufficient permissions", async () => {
      const response = await request("POST", "/system/update-env", {
        key: "test",
        value: "test",
      });
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
    });

    it("should handle resource not found", async () => {
      const response = await request("GET", "/users/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Rate limiting error handling", () => {
    it("should handle rate limit exceeded", async () => {
      const response = await request("GET", "/system/check-token");
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("retryAfter");
    });
  });

  describe("External service error handling", () => {
    it("should handle external service failures", async () => {
      vi.mock("../server/utils/collectorApi", () => ({
        CollectorApi: () => ({ online: () => Promise.reject(new Error("External service unavailable")) }),
      }));

      const response = await request("GET", "/system/document-processing-status");
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty("error");
    });

    it("should handle timeout errors", async () => {
      vi.mock("../server/utils/collectorApi", () => ({
        CollectorApi: () => ({ online: () => new Promise((resolve, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)) }),
      }));

      const response = await request("GET", "/system/document-processing-status");
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
    });
  });
});
