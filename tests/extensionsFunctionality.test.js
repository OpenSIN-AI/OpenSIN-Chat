// SPDX-License-Identifier: MIT
// Purpose: Test extensions functionality endpoints
// Docs: tests/extensionsFunctionality.test.js

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

vi.mock("../server/models/extensions", () => ({
  Extensions: {
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

describe("extensions functionality endpoints", () => {
  describe("POST /extensions", () => {
    it("should create extension with valid data", async () => {
      const response = await request("POST", "/extensions", {
        name: "Test Extension",
        description: "Test extension description",
        type: "plugin",
        enabled: true,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Test Extension");
    });

    it("should create extension with minimal data", async () => {
      const response = await request("POST", "/extensions", {
        name: "Simple Extension",
        type: "plugin",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Simple Extension");
    });

    it("should reject extension with missing name", async () => {
      const response = await request("POST", "/extensions", {
        type: "plugin",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject extension with missing type", async () => {
      const response = await request("POST", "/extensions", {
        name: "Test Extension",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /extensions", () => {
    it("should return extensions", async () => {
      const response = await request("GET", "/extensions");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("extensions");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalExtensions");
    });

    it("should return extensions with pagination", async () => {
      const response = await request("GET", "/extensions?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("extensions");
    });
  });

  describe("GET /extensions/:id", () => {
    it("should get extension by id", async () => {
      const response = await request("GET", "/extensions/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "test");
    });

    it("should return 404 for non-existent extension", async () => {
      const response = await request("GET", "/extensions/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /extensions/:id", () => {
    it("should update extension", async () => {
      const response = await request("PUT", "/extensions/1", {
        name: "Updated Extension",
        description: "Updated description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "updated");
    });

    it("should reject extension update with invalid data", async () => {
      const response = await request("PUT", "/extensions/1", {
        name: "",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /extensions/:id", () => {
    it("should delete extension", async () => {
      const response = await request("DELETE", "/extensions/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent extension", async () => {
      const response = await request("DELETE", "/extensions/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
