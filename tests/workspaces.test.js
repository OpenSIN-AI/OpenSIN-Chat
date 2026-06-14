// SPDX-License-Identifier: MIT
// Purpose: Test workspace endpoints (workspaces)
// Docs: tests/workspaces.test.js

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
  return {
    status: response.status,
    headers: response.headers,
    body: data ? JSON.parse(data) : null,
  };
};

describe("workspace endpoints", () => {
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

  describe("POST /workspace/new", () => {
    it("should create workspace", async () => {
      const response = await request("POST", "/workspace/new", {
        name: "test-workspace",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspace");
      expect(response.body.workspace).toHaveProperty("id");
      expect(response.body.workspace).toHaveProperty("name", "test-workspace");
    });
  });

  describe("GET /workspace/:slug", () => {
    it("should get workspace by slug", async () => {
      const response = await request("GET", "/workspace/test");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspace");
      expect(response.body.workspace).toHaveProperty("id", 1);
      expect(response.body.workspace).toHaveProperty("name", "test");
    });
  });

  describe("POST /workspace/:slug/update", () => {
    it("should update workspace", async () => {
      const response = await request("POST", "/workspace/test/update", {
        name: "updated-workspace",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("workspace");
      expect(response.body.workspace).toHaveProperty("id", 1);
      expect(response.body.workspace).toHaveProperty("name", "updated");
    });
  });

  describe("DELETE /workspace/:slug", () => {
    it("should delete workspace", async () => {
      const response = await request("DELETE", "/workspace/test");
      expect(response.status).toBe(200);
    });
  });
});
