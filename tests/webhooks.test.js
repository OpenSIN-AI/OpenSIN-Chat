// SPDX-License-Identifier: MIT
// Purpose: Test webhook endpoints
// Docs: tests/webhooks.test.js

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

vi.mock("../server/models/webhooks", () => ({
  Webhooks: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, url: "http://example.com/webhook" })),
    get: vi.fn(() => Promise.resolve({ id: 1, url: "http://example.com/webhook" })),
    update: vi.fn(() => Promise.resolve({ id: 1, url: "http://updated.example.com/webhook" })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
    trigger: () => Promise.resolve(),
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

describe("webhook endpoints", () => {
  describe("POST /webhooks", () => {
    it("should create webhook", async () => {
      const response = await request("POST", "/webhooks", {
        url: "http://example.com/webhook",
        events: ["chat.created", "chat.updated"],
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("url", "http://example.com/webhook");
    });

    it("should reject invalid webhook URL", async () => {
      const response = await request("POST", "/webhooks", {
        url: "invalid-url",
        events: ["chat.created"],
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject missing events", async () => {
      const response = await request("POST", "/webhooks", {
        url: "http://example.com/webhook",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /webhooks", () => {
    it("should return webhooks", async () => {
      const response = await request("GET", "/webhooks");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("webhooks");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalWebhooks");
    });

    it("should return webhooks with pagination", async () => {
      const response = await request("GET", "/webhooks?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("webhooks");
    });
  });

  describe("GET /webhooks/:id", () => {
    it("should get webhook by id", async () => {
      const response = await request("GET", "/webhooks/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("url", "http://example.com/webhook");
    });
  });

  describe("PUT /webhooks/:id", () => {
    it("should update webhook", async () => {
      const response = await request("PUT", "/webhooks/1", {
        url: "http://updated.example.com/webhook",
        events: ["chat.created", "chat.updated", "chat.deleted"],
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("url", "http://updated.example.com/webhook");
    });
  });

  describe("DELETE /webhooks/:id", () => {
    it("should delete webhook", async () => {
      const response = await request("DELETE", "/webhooks/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("POST /webhooks/:id/trigger", () => {
    it("should trigger webhook", async () => {
      const response = await request("POST", "/webhooks/1/trigger", {
        event: "chat.created",
        data: { id: 1, message: "Test chat" },
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(Webhooks.trigger).toHaveBeenCalledWith(1, "chat.created", { id: 1, message: "Test chat" });
    });
  });
});
