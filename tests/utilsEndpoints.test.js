// SPDX-License-Identifier: MIT
// Purpose: Test utility endpoints (custom commands, docker model runner, etc.)
// Docs: tests/utilsEndpoints.test.js

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

vi.mock("../server/utils/commands", () => ({
  runCommand: vi.fn(() => Promise.resolve({ stdout: "done", stderr: "", exitCode: 0 })),
  listCommands: vi.fn(() => Promise.resolve([])),
}));

vi.mock("../server/endpoints/utils/dockerModelRunnerUtils", () => ({
  getRunningModels: vi.fn(() => Promise.resolve([])),
  startModel: vi.fn(() => Promise.resolve({ id: "model_1", status: "starting" })),
  stopModel: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("../server/endpoints/utils/enhancePrompt", () => ({
  enhancePromptWithContext: vi.fn((prompt) => Promise.resolve({ enhanced: prompt + " [enhanced]", tokens: 10 })),
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

describe("utility endpoints", () => {
  describe("POST /utils/enhance-prompt", () => {
    it("should enhance a prompt", async () => {
      const response = await request("POST", "/utils/enhance-prompt", {
        prompt: "Write a summary",
        context: "business document",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("enhanced");
      expect(response.body).toHaveProperty("tokens");
    });

    it("should reject with missing prompt", async () => {
      const response = await request("POST", "/utils/enhance-prompt", {
        context: "business document",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /utils/commands", () => {
    it("should return available commands", async () => {
      const response = await request("GET", "/utils/commands");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("commands");
    });
  });

  describe("POST /utils/commands/run", () => {
    it("should run a command", async () => {
      const response = await request("POST", "/utils/commands/run", {
        command: "help",
        args: [],
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("stdout");
    });

    it("should reject with missing command", async () => {
      const response = await request("POST", "/utils/commands/run", { args: [] });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /utils/docker-models", () => {
    it("should return running docker models", async () => {
      const response = await request("GET", "/utils/docker-models");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("models");
    });
  });

  describe("POST /utils/docker-models/start", () => {
    it("should start a docker model", async () => {
      const response = await request("POST", "/utils/docker-models/start", {
        modelName: "llama3",
        port: 8080,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("status", "starting");
    });

    it("should reject with missing model name", async () => {
      const response = await request("POST", "/utils/docker-models/start", { port: 8080 });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /utils/docker-models/stop/:id", () => {
    it("should stop a docker model", async () => {
      const response = await request("POST", "/utils/docker-models/stop/model_1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent model", async () => {
      const response = await request("POST", "/utils/docker-models/stop/nonexistent");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
