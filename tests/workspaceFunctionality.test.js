// SPDX-License-Identifier: MIT
// Purpose: Test workspace functionality endpoints
// Docs: tests/workspaceFunctionality.test.js

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

describe("workspace functionality endpoints", () => {
  describe("POST /workspace/new", () => {
    it("should create workspace with valid data", async () => {
      const response = await request("POST", "/workspace/new", {
        name: "Test Workspace",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspace");
      expect(response.body.workspace).toHaveProperty("id");
      expect(response.body.workspace).toHaveProperty("name", "Test Workspace");
    });

    it("should create workspace with minimal data", async () => {
      const response = await request("POST", "/workspace/new", {
        name: "Simple Workspace",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspace");
      expect(response.body.workspace).toHaveProperty("id");
      expect(response.body.workspace).toHaveProperty("name", "Simple Workspace");
    });

    it("should return null workspace when name is missing", async () => {
      const response = await request("POST", "/workspace/new", {
        slug: "test-workspace",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspace", null);
      expect(response.body).toHaveProperty("message");
    });

    it("should ignore slug and create workspace by name", async () => {
      const response = await request("POST", "/workspace/new", {
        name: "Slug-less Workspace",
        slug: "ignored-slug",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspace");
      expect(response.body.workspace).toHaveProperty("name", "Slug-less Workspace");
    });
  });

  describe("GET /workspaces", () => {
    it("should return workspaces", async () => {
      const response = await request("GET", "/workspaces");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspaces");
    });

    it("should return workspaces with pagination", async () => {
      const response = await request("GET", "/workspaces?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspaces");
    });
  });

  describe("GET /workspace/:slug", () => {
    it("should get workspace by slug", async () => {
      const workspace = await createWorkspace("get-workspace");
      const response = await request("GET", `/workspace/${workspace.slug}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspace");
      expect(response.body.workspace).toHaveProperty("id", workspace.id);
      expect(response.body.workspace).toHaveProperty("name", "get-workspace");
    });

    it("should return null workspace for non-existent slug", async () => {
      const response = await request("GET", "/workspace/nonexistent-slug-12345");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspace", null);
    });
  });

  describe("POST /workspace/:slug/update", () => {
    it("should update workspace", async () => {
      const workspace = await createWorkspace("update-workspace");
      const response = await request("POST", `/workspace/${workspace.slug}/update`, {
        name: "Updated Workspace",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspace");
      expect(response.body.workspace).toHaveProperty("id", workspace.id);
      expect(response.body.workspace).toHaveProperty("name", "Updated Workspace");
    });

    it("should fall back to default name when update name is empty", async () => {
      const workspace = await createWorkspace("update-empty-name");
      const response = await request("POST", `/workspace/${workspace.slug}/update`, {
        name: "",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspace");
      expect(response.body.workspace).toHaveProperty("id", workspace.id);
      expect(response.body.workspace).toHaveProperty("name", "My Workspace");
    });
  });

  describe("DELETE /workspace/:slug", () => {
    it("should delete workspace", async () => {
      const workspace = await createWorkspace("delete-workspace");
      const response = await request("DELETE", `/workspace/${workspace.slug}`);
      expect(response.status).toBe(200);
    });

    it("should return 400 for non-existent workspace", async () => {
      const response = await request("DELETE", "/workspace/nonexistent-slug-12345");
      expect(response.status).toBe(400);
    });
  });

  describe("GET /workspace/:slug/chats", () => {
    it("should return workspace chats", async () => {
      const workspace = await createWorkspace("chats-workspace");
      const response = await request("GET", `/workspace/${workspace.slug}/chats`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("chats");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalChats");
    });

    it("should return workspace chats with pagination", async () => {
      const workspace = await createWorkspace("chats-page-workspace");
      const response = await request("GET", `/workspace/${workspace.slug}/chats?offset=0&limit=10`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("chats");
    });
  });
});
