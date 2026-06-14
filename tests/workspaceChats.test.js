// SPDX-License-Identifier: MIT
// Purpose: Test workspace chats endpoints (workspace-chats)
// Docs: tests/workspaceChats.test.js

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

const TEST_PORT = process.env.SERVER_PORT || "3001";

const request = async (method, path, body = null, headers = {}) => {
  const url = `http://localhost:${TEST_PORT}${path}`;
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
  let responseBody = null;
  if (data) {
    try {
      responseBody = JSON.parse(data);
    } catch {
      responseBody = data;
    }
  }
  return {
    status: response.status,
    headers: response.headers,
    body: responseBody,
  };
};

const createWorkspace = async (name) => {
  const response = await request("POST", "/workspace/new", { name });
  expect(response.status).toBe(200);
  return response.body.workspace;
};

describe("workspace chats endpoints", () => {
  describe("GET /workspace/:slug/chats", () => {
    it("should return workspace chat history", async () => {
      const workspace = await createWorkspace("chat-history-workspace");
      const response = await request("GET", `/workspace/${workspace.slug}/chats`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("history");
      expect(Array.isArray(response.body.history)).toBe(true);
    });

    it("should return workspace chat history with pagination", async () => {
      const workspace = await createWorkspace("chat-history-page-workspace");
      const response = await request("GET", `/workspace/${workspace.slug}/chats?offset=0&limit=10`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("history");
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  // TODO: The server does not expose standalone CRUD routes for individual workspace chats.
  // Chats are created via the streaming chat endpoint (/workspace/:slug/stream-chat) or
  // via thread chat endpoints. Skip these tests until dedicated routes are added.
  describe.skip("POST /workspace-chats (not implemented)", () => {
    test.skip("should create workspace chat", () => {});
  });

  describe.skip("GET /workspace-chats/:id (not implemented)", () => {
    test.skip("should get workspace chat by id", () => {});
  });

  describe.skip("PUT /workspace-chats/:id (not implemented)", () => {
    test.skip("should update workspace chat", () => {});
  });

  describe.skip("DELETE /workspace-chats/:id (not implemented)", () => {
    test.skip("should delete workspace chat", () => {});
  });
});
