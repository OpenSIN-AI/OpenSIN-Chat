// SPDX-License-Identifier: MIT
// Purpose: Test system settings endpoints (system-settings)
// Docs: tests/systemSettings.test.js

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
    get: vi.fn(() => Promise.resolve({ id: 1, label: "test" })),
    updateSettings: vi.fn(() => Promise.resolve({ success: true, error: null })),
    _updateSettings: vi.fn(() => Promise.resolve()),
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

describe("system settings endpoints", () => {
  describe("GET /system-settings", () => {
    it("should return system settings", async () => {
      const response = await request("GET", "/system-settings");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("settings");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalSettings");
    });

    it("should return system settings with pagination", async () => {
      const response = await request("GET", "/system-settings?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("settings");
    });
  });

  describe("POST /system-settings", () => {
    it("should create system setting", async () => {
      const response = await request("POST", "/system-settings", {
        label: "test-setting",
        value: "test-value",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("label", "test-setting");
    });
  });

  describe("GET /system-settings/:id", () => {
    it("should get system setting by id", async () => {
      const response = await request("GET", "/system-settings/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("label", "test");
    });
  });

  describe("PUT /system-settings/:id", () => {
    it("should update system setting", async () => {
      const response = await request("PUT", "/system-settings/1", {
        label: "updated-setting",
        value: "updated-value",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("label", "updated");
    });
  });

  describe("DELETE /system-settings/:id", () => {
    it("should delete system setting", async () => {
      const response = await request("DELETE", "/system-settings/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });
});
