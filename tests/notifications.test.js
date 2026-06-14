// SPDX-License-Identifier: MIT
// Purpose: Test web push endpoints (notifications are handled via web-push)
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

describe("notification endpoints", () => {
  describe("GET /web-push/pubkey", () => {
    it("should return vapid public key", async () => {
      const response = await request("GET", "/web-push/pubkey");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("publicKey");
    });
  });

  describe("POST /web-push/subscribe", () => {
    it("should return success for subscription request", async () => {
      const response = await request("POST", "/web-push/subscribe", {
        endpoint: "https://example.com/push",
        keys: { p256dh: "key", auth: "auth" },
      });
      expect(response.status).toBe(201);
    });
  });

  describe("GET /notifications", () => {
    it.skip("TODO: /notifications CRUD endpoints do not exist; notifications are handled via /web-push/*", async () => {
      const response = await request("GET", "/notifications");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /notifications", () => {
    it.skip("TODO: /notifications CRUD endpoints do not exist; notifications are handled via /web-push/*", async () => {
      const response = await request("POST", "/notifications", {
        message: "Test notification",
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /notifications/:id", () => {
    it.skip("TODO: /notifications CRUD endpoints do not exist; notifications are handled via /web-push/*", async () => {
      const response = await request("GET", "/notifications/1");
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /notifications/:id", () => {
    it.skip("TODO: /notifications CRUD endpoints do not exist; notifications are handled via /web-push/*", async () => {
      const response = await request("PUT", "/notifications/1", {
        message: "Updated notification",
      });
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /notifications/:id", () => {
    it.skip("TODO: /notifications CRUD endpoints do not exist; notifications are handled via /web-push/*", async () => {
      const response = await request("DELETE", "/notifications/1");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /notifications/:id/mark-read", () => {
    it.skip("TODO: /notifications CRUD endpoints do not exist; notifications are handled via /web-push/*", async () => {
      const response = await request("POST", "/notifications/1/mark-read");
      expect(response.status).toBe(200);
    });
  });
});
