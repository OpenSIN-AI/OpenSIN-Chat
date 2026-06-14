// SPDX-License-Identifier: MIT
// Purpose: Test experimental functionality endpoints
// Docs: tests/experimentalFunctionality.test.js

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

vi.mock("../server/models/experimental", () => ({
  Experimental: {
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

describe("experimental functionality endpoints", () => {
  describe("POST /experimental", () => {
    it("should create experimental feature with valid data", async () => {
      const response = await request("POST", "/experimental", {
        name: "Test Experimental",
        description: "Test experimental description",
        type: "beta",
        enabled: true,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Test Experimental");
    });

    it("should create experimental feature with minimal data", async () => {
      const response = await request("POST", "/experimental", {
        name: "Simple Experimental",
        type: "beta",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Simple Experimental");
    });

    it("should reject experimental feature with missing name", async () => {
      const response = await request("POST", "/experimental", {
        type: "beta",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject experimental feature with missing type", async () => {
      const response = await request("POST", "/experimental", {
        name: "Test Experimental",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /experimental", () => {
    it("should return experimental features", async () => {
      const response = await request("GET", "/experimental");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("features");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalFeatures");
    });

    it("should return experimental features with pagination", async () => {
      const response = await request("GET", "/experimental?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("features");
    });
  });

  describe("GET /experimental/:id", () => {
    it("should get experimental feature by id", async () => {
      const response = await request("GET", "/experimental/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "test");
    });

    it("should return 404 for non-existent experimental feature", async () => {
      const response = await request("GET", "/experimental/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /experimental/:id", () => {
    it("should update experimental feature", async () => {
      const response = await request("PUT", "/experimental/1", {
        name: "Updated Experimental",
        description: "Updated description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "updated");
    });

    it("should reject experimental feature update with invalid data", async () => {
      const response = await request("PUT", "/experimental/1", {
        name: "",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /experimental/:id", () => {
    it("should delete experimental feature", async () => {
      const response = await request("DELETE", "/experimental/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent experimental feature", async () => {
      const response = await request("DELETE", "/experimental/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
