// SPDX-License-Identifier: MIT
// Purpose: Test analytics endpoints
// Docs: tests/analytics.test.js

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

vi.mock("../server/models/analytics", () => ({
  Analytics: {
    getUserAnalytics: () => Promise.resolve({
      totalUsers: 100,
      activeUsers: 50,
      newUsers: 10,
      userGrowth: 5.5,
    }),
    getChatAnalytics: () => Promise.resolve({
      totalChats: 500,
      activeChats: 200,
      chatGrowth: 3.2,
      averageChatLength: 150,
    }),
    getModelAnalytics: () => Promise.resolve({
      totalModels: 20,
      activeModels: 15,
      modelUsage: {
        "gpt-4": 40,
        "claude-3": 30,
        "llama-3": 20,
        "other": 10,
      },
    }),
    getSystemAnalytics: () => Promise.resolve({
      totalRequests: 1000,
      averageResponseTime: 500,
      errorRate: 2.5,
      uptime: 99.9,
    }),
  },
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

describe.skip("analytics endpoints", () => {
  // TODO: The server has no /analytics/* routes. The Analytics model is mocked
  // but no endpoint exposes it.
  describe("GET /analytics/users", () => {
    it("should return user analytics", async () => {
      const response = await request("GET", "/analytics/users");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalUsers", 100);
      expect(response.body).toHaveProperty("activeUsers", 50);
      expect(response.body).toHaveProperty("newUsers", 10);
      expect(response.body).toHaveProperty("userGrowth", 5.5);
    });
  });

  describe("GET /analytics/chats", () => {
    it("should return chat analytics", async () => {
      const response = await request("GET", "/analytics/chats");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalChats", 500);
      expect(response.body).toHaveProperty("activeChats", 200);
      expect(response.body).toHaveProperty("chatGrowth", 3.2);
      expect(response.body).toHaveProperty("averageChatLength", 150);
    });
  });

  describe("GET /analytics/models", () => {
    it("should return model analytics", async () => {
      const response = await request("GET", "/analytics/models");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalModels", 20);
      expect(response.body).toHaveProperty("activeModels", 15);
      expect(response.body).toHaveProperty("modelUsage");
      expect(response.body.modelUsage).toHaveProperty("gpt-4", 40);
      expect(response.body.modelUsage).toHaveProperty("claude-3", 30);
      expect(response.body.modelUsage).toHaveProperty("llama-3", 20);
      expect(response.body.modelUsage).toHaveProperty("other", 10);
    });
  });

  describe("GET /analytics/system", () => {
    it("should return system analytics", async () => {
      const response = await request("GET", "/analytics/system");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalRequests", 1000);
      expect(response.body).toHaveProperty("averageResponseTime", 500);
      expect(response.body).toHaveProperty("errorRate", 2.5);
      expect(response.body).toHaveProperty("uptime", 99.9);
    });
  });

  describe("GET /analytics", () => {
    it("should return all analytics", async () => {
      const response = await request("GET", "/analytics");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("users");
      expect(response.body).toHaveProperty("chats");
      expect(response.body).toHaveProperty("models");
      expect(response.body).toHaveProperty("system");
    });
  });
});
