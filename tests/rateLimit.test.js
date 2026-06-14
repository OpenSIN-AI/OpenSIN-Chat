// SPDX-License-Identifier: MIT
// Purpose: Test rate limiting endpoints
// Docs: tests/rateLimit.test.js

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
  simpleRateLimit: (options) => (req, res, next) => {
    // Simulate rate limiting
    if (options.bucket === "test" && options.max <= 0) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: options.windowMs,
      });
    }
    next();
  },
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

describe("rate limiting endpoints", () => {
  describe("GET /system/check-token", () => {
    it("should allow request within rate limit", async () => {
      const response = await request("GET", "/system/check-token");
      expect(response.status).toBe(200);
    });

    it("should reject request exceeding rate limit", async () => {
      // Mock rate limit to be exceeded
      vi.mock("../server/utils/middleware/simpleRateLimit", () => ({
        simpleRateLimit: (options) => (req, res, next) => {
          if (options.bucket === "test" && options.max <= 0) {
            return res.status(429).json({
              error: "Too many requests",
              retryAfter: options.windowMs,
            });
          }
          next();
        },
      }));

      const response = await request("GET", "/system/check-token");
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty("error", "Too many requests");
      expect(response.body).toHaveProperty("retryAfter");
    });
  });

  describe("POST /request-token", () => {
    it("should allow request within rate limit", async () => {
      const response = await request("POST", "/request-token", {
        username: "test",
        password: "test",
      });
      expect(response.status).toBe(200);
    });

    it("should reject request exceeding rate limit", async () => {
      // Mock rate limit to be exceeded
      vi.mock("../server/utils/middleware/simpleRateLimit", () => ({
        simpleRateLimit: (options) => (req, res, next) => {
          if (options.bucket === "test" && options.max <= 0) {
            return res.status(429).json({
              error: "Too many requests",
              retryAfter: options.windowMs,
            });
          }
          next();
        },
      }));

      const response = await request("POST", "/request-token", {
        username: "test",
        password: "test",
      });
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty("error", "Too many requests");
    });
  });
});
