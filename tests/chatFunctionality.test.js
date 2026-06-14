// SPDX-License-Identifier: MIT
// Purpose: Test chat functionality endpoints
// Docs: tests/chatFunctionality.test.js

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

vi.mock("../server/models/chat", () => ({
  Chat: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, title: "test" })),
    get: vi.fn(() => Promise.resolve({ id: 1, title: "test" })),
    update: vi.fn(() => Promise.resolve({ id: 1, title: "updated" })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
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

describe("chat functionality endpoints", () => {
  describe("POST /chat", () => {
    it("should create chat with valid data", async () => {
      const response = await request("POST", "/chat", {
        title: "Test Chat",
        workspaceId: 1,
        model: "gpt-4",
        temperature: 0.7,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("title", "Test Chat");
    });

    it("should create chat with minimal data", async () => {
      const response = await request("POST", "/chat", {
        title: "Simple Chat",
        workspaceId: 1,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("title", "Simple Chat");
    });

    it("should reject chat with missing title", async () => {
      const response = await request("POST", "/chat", {
        workspaceId: 1,
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject chat with missing workspaceId", async () => {
      const response = await request("POST", "/chat", {
        title: "Test Chat",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /chat", () => {
    it("should return chats", async () => {
      const response = await request("GET", "/chat");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("chats");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalChats");
    });

    it("should return chats with pagination", async () => {
      const response = await request("GET", "/chat?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("chats");
    });
  });

  describe("GET /chat/:id", () => {
    it("should get chat by id", async () => {
      const response = await request("GET", "/chat/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("title", "test");
    });

    it("should return 404 for non-existent chat", async () => {
      const response = await request("GET", "/chat/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /chat/:id", () => {
    it("should update chat", async () => {
      const response = await request("PUT", "/chat/1", {
        title: "Updated Chat",
        description: "Updated description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("title", "updated");
    });

    it("should reject chat update with invalid data", async () => {
      const response = await request("PUT", "/chat/1", {
        title: "",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /chat/:id", () => {
    it("should delete chat", async () => {
      const response = await request("DELETE", "/chat/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent chat", async () => {
      const response = await request("DELETE", "/chat/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /chat/:id/messages", () => {
    it("should send message to chat", async () => {
      const response = await request("POST", "/chat/1/messages", {
        message: "Hello, world!",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("message", "Hello, world!");
    });

    it("should reject message with empty content", async () => {
      const response = await request("POST", "/chat/1/messages", {
        message: "",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject message with missing content", async () => {
      const response = await request("POST", "/chat/1/messages", {});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });
});
