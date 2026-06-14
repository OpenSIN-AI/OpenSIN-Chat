// SPDX-License-Identifier: MIT
// Purpose: Test notification endpoints
// Docs: tests/notifications.test.js

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

vi.mock("../server/models/notifications", () => ({
  Notifications: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, message: "test" })),
    get: vi.fn(() => Promise.resolve({ id: 1, message: "test" })),
    update: vi.fn(() => Promise.resolve({ id: 1, message: "updated" })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
    markRead: () => Promise.resolve(),
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

describe("notification endpoints", () => {
  describe("GET /notifications", () => {
    it("should return notifications", async () => {
      const response = await request("GET", "/notifications");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("notifications");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalNotifications");
    });

    it("should return notifications with pagination", async () => {
      const response = await request("GET", "/notifications?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("notifications");
    });
  });

  describe("POST /notifications", () => {
    it("should create notification", async () => {
      const response = await request("POST", "/notifications", {
        message: "Test notification",
        type: "info",
        userId: 1,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("message", "Test notification");
    });
  });

  describe("GET /notifications/:id", () => {
    it("should get notification by id", async () => {
      const response = await request("GET", "/notifications/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("message", "test");
    });
  });

  describe("PUT /notifications/:id", () => {
    it("should update notification", async () => {
      const response = await request("PUT", "/notifications/1", {
        message: "Updated notification",
        read: true,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("message", "updated");
    });
  });

  describe("DELETE /notifications/:id", () => {
    it("should delete notification", async () => {
      const response = await request("DELETE", "/notifications/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("POST /notifications/:id/mark-read", () => {
    it("should mark notification as read", async () => {
      const response = await request("POST", "/notifications/1/mark-read");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(Notifications.markRead).toHaveBeenCalledWith(1);
    });
  });
});
