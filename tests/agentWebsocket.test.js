// SPDX-License-Identifier: MIT
// Purpose: Test agent websocket endpoints
// Docs: tests/agentWebsocket.test.js

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
  User: { _get: vi.fn(() => Promise.resolve(null)), filterFields: vi.fn((user) => user) },
}));

vi.mock("../server/models/eventLogs", () => ({
  EventLogs: { logEvent: vi.fn(() => Promise.resolve()) },
}));

vi.mock("../server/models/telemetry", () => ({
  Telemetry: { sendTelemetry: vi.fn(() => Promise.resolve()) },
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

vi.mock("../server/utils/websocket", () => ({
  getAgentWebsocketStatus: vi.fn(() => Promise.resolve({ connected: true, clients: 1 })),
  broadcastToAgent: vi.fn(() => Promise.resolve({ sent: true })),
  disconnectAgentClient: vi.fn(() => Promise.resolve(true)),
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
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  const data = await response.text();
  return { status: response.status, headers: response.headers, body: data ? JSON.parse(data) : null };
};

describe("agent websocket endpoints", () => {
  describe("GET /agent-ws/status", () => {
    it("should return websocket connection status", async () => {
      const response = await request("GET", "/agent-ws/status");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("connected");
      expect(response.body).toHaveProperty("clients");
    });
  });

  describe("GET /agent-ws/status/:agentId", () => {
    it("should return status for a specific agent", async () => {
      const response = await request("GET", "/agent-ws/status/agent_1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("connected");
      expect(response.body).toHaveProperty("clients");
    });

    it("should return 404 for non-existent agent", async () => {
      const response = await request("GET", "/agent-ws/status/nonexistent");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /agent-ws/broadcast/:agentId", () => {
    it("should broadcast message to agent", async () => {
      const response = await request("POST", "/agent-ws/broadcast/agent_1", {
        event: "message",
        data: { text: "Hello" },
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("sent", true);
    });

    it("should reject broadcast with missing event", async () => {
      const response = await request("POST", "/agent-ws/broadcast/agent_1", {
        data: { text: "Hello" },
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /agent-ws/disconnect/:agentId", () => {
    it("should disconnect agent client", async () => {
      const response = await request("POST", "/agent-ws/disconnect/agent_1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent agent", async () => {
      const response = await request("POST", "/agent-ws/disconnect/nonexistent");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
