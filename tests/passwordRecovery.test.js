// SPDX-License-Identifier: MIT
// Purpose: Test password recovery endpoints
// Docs: tests/passwordRecovery.test.js

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
    create: vi.fn(() => Promise.resolve({ id: 1, username: "test", password: "test" })),
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

vi.mock("../server/utils/PasswordRecovery", () => ({
  recoverAccount: () => ({ success: true, resetToken: "token", error: null }),
  resetPassword: () => ({ success: true, message: "Password reset", error: null }),
  generateRecoveryCodes: () => Promise.resolve(["code1", "code2"]),
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

describe("password recovery endpoints", () => {
  describe("POST /system/recover-account", () => {
    it("should recover account with valid recovery codes", async () => {
      const response = await request("POST", "/system/recover-account", {
        username: "test",
        recoveryCodes: ["code1"],
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("resetToken", "token");
    });

    it("should reject invalid recovery codes", async () => {
      const response = await request("POST", "/system/recover-account", {
        username: "test",
        recoveryCodes: ["invalid"],
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message");
    });

    it("should reject invalid username", async () => {
      const response = await request("POST", "/system/recover-account", {
        username: "invalid",
        recoveryCodes: ["code1"],
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("POST /system/reset-password", () => {
    it("should reset password with valid token", async () => {
      const response = await request("POST", "/system/reset-password", {
        token: "token",
        newPassword: "newPassword",
        confirmPassword: "newPassword",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("message", "Password reset");
    });

    it("should reject mismatched passwords", async () => {
      const response = await request("POST", "/system/reset-password", {
        token: "token",
        newPassword: "newPassword",
        confirmPassword: "differentPassword",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });

    it("should reject invalid token", async () => {
      const response = await request("POST", "/system/reset-password", {
        token: "invalid",
        newPassword: "newPassword",
        confirmPassword: "newPassword",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("GET /system/generate-recovery-codes", () => {
    it("should generate recovery codes", async () => {
      const response = await request("GET", "/system/generate-recovery-codes", {
        username: "test",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("recoveryCodes");
      expect(Array.isArray(response.body.recoveryCodes)).toBe(true);
    });

    it("should reject invalid username", async () => {
      const response = await request("GET", "/system/generate-recovery-codes", {
        username: "invalid",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });
});
