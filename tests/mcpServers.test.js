// SPDX-License-Identifier: MIT
// Purpose: Test mcpServers endpoints (mcp-servers)
// Docs: tests/mcpServers.test.js

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

vi.mock("../server/models/mcpServers", () => ({
  MCPServers: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, name: "test" })),
    get: vi.fn(() => Promise.resolve({ id: 1, name: "test" })),
    update: vi.fn(() => Promise.resolve({ id: 1, name: "updated" })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
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

describe("mcpServers endpoints", () => {
  describe("GET /mcp-servers", () => {
    it("should return mcp servers", async () => {
      const response = await request("GET", "/mcp-servers");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("servers");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalServers");
    });

    it("should return mcp servers with pagination", async () => {
      const response = await request("GET", "/mcp-servers?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("servers");
    });
  });

  describe("POST /mcp-servers", () => {
    it("should create mcp server", async () => {
      const response = await request("POST", "/mcp-servers", {
        name: "test-server",
        description: "Test server description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "test-server");
    });
  });

  describe("GET /mcp-servers/:id", () => {
    it("should get mcp server by id", async () => {
      const response = await request("GET", "/mcp-servers/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "test");
    });
  });

  describe("PUT /mcp-servers/:id", () => {
    it("should update mcp server", async () => {
      const response = await request("PUT", "/mcp-servers/1", {
        name: "updated-server",
        description: "Updated server description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "updated");
    });
  });

  describe("DELETE /mcp-servers/:id", () => {
    it("should delete mcp server", async () => {
      const response = await request("DELETE", "/mcp-servers/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });
});
