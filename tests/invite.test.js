// SPDX-License-Identifier: MIT
// Purpose: Test invite endpoints (invite)
// Docs: tests/invite.test.js

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

describe("invite endpoints", () => {
  describe("GET /invite/:code", () => {
    it("should return invite status by code", async () => {
      const response = await request("GET", "/invite/invite-code");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("invite");
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /invite/:code", () => {
    it("should accept invite with username and password", async () => {
      const response = await request("POST", "/invite/invite-code", {
        username: "newuser",
        password: "password123",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success");
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /invite (legacy invite creation)", () => {
    it.skip("TODO: Invite creation endpoint does not exist in server/endpoints/invite.js", async () => {
      const response = await request("POST", "/invite", {
        email: "test@example.com",
        role: "user",
      });
      expect(response.status).toBe(200);
    });
  });

  describe("GET /invite list", () => {
    it.skip("TODO: Invite listing endpoint does not exist in server/endpoints/invite.js", async () => {
      const response = await request("GET", "/invite");
      expect(response.status).toBe(200);
    });
  });

  describe("GET /invite/:id", () => {
    it.skip("TODO: Invite by id endpoint does not exist in server/endpoints/invite.js", async () => {
      const response = await request("GET", "/invite/1");
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /invite/:id", () => {
    it.skip("TODO: Invite update endpoint does not exist in server/endpoints/invite.js", async () => {
      const response = await request("PUT", "/invite/1", {
        email: "updated@example.com",
        role: "admin",
      });
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /invite/:id", () => {
    it.skip("TODO: Invite delete endpoint does not exist in server/endpoints/invite.js", async () => {
      const response = await request("DELETE", "/invite/1");
      expect(response.status).toBe(200);
    });
  });
});
