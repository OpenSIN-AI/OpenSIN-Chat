// SPDX-License-Identifier: MIT
// Purpose: Test web push notification endpoints
// Docs: tests/webPush.test.js

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
  reqBody: (req) => ({}),
  makeJWT: (payload, expiry) => `token_${payload.id}`,
  userFromSession: () => Promise.resolve({ id: 1, username: "test" }),
  multiUserMode: () => false,
  queryParams: () => ({}),
}));

vi.mock("../server/utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (req, res, next) => next(),
}));

vi.mock("../server/utils/PushNotifications", () => ({
  pushNotificationService: {
    registerSubscription: vi.fn(() => Promise.resolve({ id: 1 })),
    unregisterSubscription: vi.fn(() => Promise.resolve(true)),
    sendNotification: vi.fn(() => Promise.resolve({ success: true })),
    listSubscriptions: vi.fn(() => Promise.resolve([])),
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
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  const data = await response.text();
  const contentType = response.headers.get("content-type") || "";
  let parsedBody = null;
  if (data && contentType.includes("application/json")) {
    try {
      parsedBody = JSON.parse(data);
    } catch {
      parsedBody = null;
    }
  }
  return { status: response.status, headers: response.headers, body: parsedBody, text: data };
};

describe("web push notification endpoints", () => {
  describe("POST /web-push/subscribe", () => {
    it("should subscribe with valid subscription data", async () => {
      const response = await request("POST", "/web-push/subscribe", {
        endpoint: "https://push.example.com/abc",
        keys: { p256dh: "key1", auth: "key2" },
      });
      expect(response.status).toBe(201);
    });
  });

  describe("GET /web-push/pubkey", () => {
    it("should return the public VAPID key", async () => {
      const response = await request("GET", "/web-push/pubkey");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("publicKey");
    });
  });

  // TODO: /web-push/unsubscribe, /web-push/send, and /web-push/subscriptions
  // are not implemented in server/endpoints/webPush.js. Skipping until added.
  describe.skip("DELETE /web-push/unsubscribe", () => {
    it("should unsubscribe with valid endpoint", async () => {
      const response = await request("DELETE", "/web-push/unsubscribe", {
        endpoint: "https://push.example.com/abc",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 400 with missing endpoint", async () => {
      const response = await request("DELETE", "/web-push/unsubscribe", {});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe.skip("POST /web-push/send", () => {
    it("should send notification with valid data", async () => {
      const response = await request("POST", "/web-push/send", {
        title: "Test Notification",
        body: "This is a test",
        url: "/workspace/test",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 400 with missing title", async () => {
      const response = await request("POST", "/web-push/send", {
        body: "This is a test",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe.skip("GET /web-push/subscriptions", () => {
    it("should list subscriptions", async () => {
      const response = await request("GET", "/web-push/subscriptions");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("subscriptions");
    });
  });
});
