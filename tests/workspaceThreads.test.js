// SPDX-License-Identifier: MIT
// Purpose: Test workspace threads endpoints (workspace-threads)
// Docs: tests/workspaceThreads.test.js

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

const createThread = async (workspaceSlug) => {
  const response = await request("POST", `/workspace/${workspaceSlug}/thread/new`);
  expect(response.status).toBe(200);
  return response.body.thread;
};

describe("workspace threads endpoints", () => {
  describe("GET /workspace/:slug/threads", () => {
    it("should return workspace threads", async () => {
      const workspace = await createWorkspace("thread-list-workspace");
      const response = await request("GET", `/workspace/${workspace.slug}/threads`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("threads");
      expect(response.body).toHaveProperty("folders");
      expect(response.body).toHaveProperty("defaultThreadChatCount");
    });

    it("should return workspace threads with pagination", async () => {
      const workspace = await createWorkspace("thread-list-page-workspace");
      const response = await request("GET", `/workspace/${workspace.slug}/threads?offset=0&limit=10`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("threads");
    });
  });

  describe("POST /workspace/:slug/thread/new", () => {
    it("should create workspace thread", async () => {
      const workspace = await createWorkspace("thread-new-workspace");
      const response = await request("POST", `/workspace/${workspace.slug}/thread/new`, {
        title: "Test thread",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("thread");
      expect(response.body).toHaveProperty("message");
    });
  });

  describe("GET /workspace/:slug/thread/:threadSlug/chats", () => {
    it("should get workspace thread chat history", async () => {
      const workspace = await createWorkspace("thread-chats-workspace");
      const thread = await createThread(workspace.slug);
      const response = await request("GET", `/workspace/${workspace.slug}/thread/${thread.slug}/chats`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("history");
      expect(Array.isArray(response.body.history)).toBe(true);
    });
  });

  describe("POST /workspace/:slug/thread/:threadSlug/update", () => {
    it("should update workspace thread", async () => {
      const workspace = await createWorkspace("thread-update-workspace");
      const thread = await createThread(workspace.slug);
      const response = await request("POST", `/workspace/${workspace.slug}/thread/${thread.slug}/update`, {
        title: "Updated thread",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("DELETE /workspace/:slug/thread/:threadSlug", () => {
    it("should delete workspace thread", async () => {
      const workspace = await createWorkspace("thread-delete-workspace");
      const thread = await createThread(workspace.slug);
      const response = await request("DELETE", `/workspace/${workspace.slug}/thread/${thread.slug}`);
      expect(response.status).toBe(200);
      expect(response.body).toBe("OK");
    });
  });
});
