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

vi.mock("../server/models/workspace", () => ({
  Workspace: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, name: "test" })),
    get: vi.fn(() => Promise.resolve({ id: 1, name: "test" })),
    update: vi.fn(() => Promise.resolve({ id: 1, name: "updated" })),
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

describe("workspace functionality endpoints", () => {
  describe("POST /workspaces", () => {
    it("should create workspace with valid data", async () => {
      const response = await request("POST", "/workspaces", {
        name: "Test Workspace",
        description: "Test workspace description",
        slug: "test-workspace",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Test Workspace");
    });

    it("should create workspace with minimal data", async () => {
      const response = await request("POST", "/workspaces", {
        name: "Simple Workspace",
        slug: "simple-workspace",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Simple Workspace");
    });

    it("should reject workspace with missing name", async () => {
      const response = await request("POST", "/workspaces", {
        slug: "test-workspace",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject workspace with missing slug", async () => {
      const response = await request("POST", "/workspaces", {
        name: "Test Workspace",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /workspaces", () => {
    it("should return workspaces", async () => {
      const response = await request("GET", "/workspaces");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspaces");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalWorkspaces");
    });

    it("should return workspaces with pagination", async () => {
      const response = await request("GET", "/workspaces?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspaces");
    });
  });

  describe("GET /workspaces/:id", () => {
    it("should get workspace by id", async () => {
      const response = await request("GET", "/workspaces/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "test");
    });

    it("should return 404 for non-existent workspace", async () => {
      const response = await request("GET", "/workspaces/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /workspaces/:id", () => {
    it("should update workspace", async () => {
      const response = await request("PUT", "/workspaces/1", {
        name: "Updated Workspace",
        description: "Updated description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "updated");
    });

    it("should reject workspace update with invalid data", async () => {
      const response = await request("PUT", "/workspaces/1", {
        name: "",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /workspaces/:id", () => {
    it("should delete workspace", async () => {
      const response = await request("DELETE", "/workspaces/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent workspace", async () => {
      const response = await request("DELETE", "/workspaces/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /workspaces/:slug/chats", () => {
    it("should return workspace chats", async () => {
      const response = await request("GET", "/workspaces/test-workspace/chats");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("chats");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalChats");
    });

    it("should return workspace chats with pagination", async () => {
      const response = await request("GET", "/workspaces/test-workspace/chats?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("chats");
    });
  });
});
