// SPDX-License-Identifier: MIT
// Purpose: Test chat endpoints (chat)
// Docs: tests/chat.test.js
// TODO: There are no chat CRUD endpoints in server/endpoints/chat.js. The real
// chat endpoints are streaming routes under /workspace/:slug/stream-chat. These
// tests are skipped until matching chat management routes are implemented.

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
  let parsedBody;
  try {
    parsedBody = data ? JSON.parse(data) : null;
  } catch {
    parsedBody = data ? { rawBody: data } : null;
  }
  return {
    status: response.status,
    headers: response.headers,
    body: parsedBody,
  };
};

describe("chat endpoints", () => {
  describe("POST /chat", () => {
    it.skip("should create chat", async () => {
      const response = await request("POST", "/chat", {
        title: "Test chat",
        workspaceId: 1,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("title", "Test chat");
    });

    it.skip("should create chat with all parameters", async () => {
      const response = await request("POST", "/chat", {
        title: "Test chat",
        workspaceId: 1,
        description: "Test chat description",
        model: "gpt-4",
        temperature: 0.7,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("title", "Test chat");
    });
  });

  describe("GET /chat", () => {
    it.skip("should return chats", async () => {
      const response = await request("GET", "/chat");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("chats");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalChats");
    });

    it.skip("should return chats with pagination", async () => {
      const response = await request("GET", "/chat?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("chats");
    });
  });

  describe("GET /chat/:id", () => {
    it.skip("should get chat by id", async () => {
      const response = await request("GET", "/chat/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("title", "test");
    });
  });

  describe("PUT /chat/:id", () => {
    it.skip("should update chat", async () => {
      const response = await request("PUT", "/chat/1", {
        title: "Updated chat",
        description: "Updated chat description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("title", "updated");
    });
  });

  describe("DELETE /chat/:id", () => {
    it.skip("should delete chat", async () => {
      const response = await request("DELETE", "/chat/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });
});
