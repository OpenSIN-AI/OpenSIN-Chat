// SPDX-License-Identifier: MIT
// Purpose: Test mcpServers endpoints (mcp-servers)
// Docs: tests/mcpServers.test.js

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../server/utils/MCP", () => class MCPCompatibilityLayer {
  static _instance = null;
  constructor() {
    if (MCPCompatibilityLayer._instance) return MCPCompatibilityLayer._instance;
    MCPCompatibilityLayer._instance = this;
  }
  async reloadMCPServers() { return { success: true, error: null }; }
  async servers() { return [{ name: "test-server" }]; }
  async toggleServerStatus(name) { return { success: true, error: null }; }
  async deleteServer(name) { return { success: true, error: null }; }
  async toggleToolSuppression(serverName, toolName, enabled) { return { success: true, error: null, suppressedTools: [] }; }
});

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
  reqBody: (req) => req.body || {},
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
  describe("GET /mcp-servers/list", () => {
    it("should return mcp servers", async () => {
      const response = await request("GET", "/mcp-servers/list");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("servers");
    });
  });

  describe("POST /mcp-servers/toggle", () => {
    it("should return result for mcp server toggle", async () => {
      const response = await request("POST", "/mcp-servers/toggle", {
        name: "test-server",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success");
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /mcp-servers/:id", () => {
    it.skip("TODO: GET /mcp-servers/:id endpoint does not exist in server/endpoints/mcpServers.js", async () => {
      const response = await request("GET", "/mcp-servers/1");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /mcp-servers/toggle (mapped from PUT /mcp-servers/:id)", () => {
    it("should return result for mcp server toggle", async () => {
      const response = await request("POST", "/mcp-servers/toggle", {
        name: "updated-server",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success");
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /mcp-servers/delete (mapped from DELETE /mcp-servers/:id)", () => {
    it("should return result for mcp server delete", async () => {
      const response = await request("POST", "/mcp-servers/delete", {
        name: "test-server",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success");
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /mcp-servers/force-reload", () => {
    it("should force reload mcp servers", async () => {
      const response = await request("GET", "/mcp-servers/force-reload");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("servers");
    });
  });

  describe("POST /mcp-servers/toggle-tool", () => {
    it("should return result for mcp tool suppression", async () => {
      const response = await request("POST", "/mcp-servers/toggle-tool", {
        serverName: "test-server",
        toolName: "test-tool",
        enabled: true,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success");
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("suppressedTools");
    });
  });
});
