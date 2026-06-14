// SPDX-License-Identifier: MIT
// Purpose: Test backup/restore endpoints
// Docs: tests/backup.test.js
// TODO: There are no backup/restore endpoints in server/endpoints/. These tests
// are skipped until backup routes are implemented.

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

vi.mock("../server/models/backup", () => ({
  Backup: {
    create: vi.fn(() => Promise.resolve({ id: 1, type: "full", status: "completed" })),
    get: vi.fn(() => Promise.resolve({ id: 1, type: "full", status: "completed" })),
    getAll: vi.fn(() => Promise.resolve([])),
    delete: vi.fn(() => Promise.resolve(true)),
    restore: vi.fn(() => Promise.resolve({ success: true })),
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
  let parsedBody;
  try {
    parsedBody = data ? JSON.parse(data) : null;
  } catch {
    parsedBody = data ? { rawBody: data } : null;
  }
  return {
    status: response.status,
    headers: response.headers,
    body: parsedBody,
  };
};

describe("backup endpoints", () => {
  describe("POST /backup", () => {
    it.skip("should create backup", async () => {
      const response = await request("POST", "/backup", {
        type: "full",
        description: "Full backup",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("type", "full");
      expect(response.body).toHaveProperty("status", "completed");
    });

    it.skip("should create incremental backup", async () => {
      const response = await request("POST", "/backup", {
        type: "incremental",
        description: "Incremental backup",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("type", "incremental");
    });

    it.skip("should reject invalid backup type", async () => {
      const response = await request("POST", "/backup", {
        type: "invalid",
        description: "Invalid backup type",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /backup", () => {
    it.skip("should return backups", async () => {
      const response = await request("GET", "/backup");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("backups");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalBackups");
    });

    it.skip("should return backups with pagination", async () => {
      const response = await request("GET", "/backup?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("backups");
    });
  });

  describe("GET /backup/:id", () => {
    it.skip("should get backup by id", async () => {
      const response = await request("GET", "/backup/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("type", "full");
    });
  });

  describe("DELETE /backup/:id", () => {
    it.skip("should delete backup", async () => {
      const response = await request("DELETE", "/backup/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("POST /backup/:id/restore", () => {
    it.skip("should restore backup", async () => {
      const response = await request("POST", "/backup/1/restore", {
        pointInTime: "2024-01-01T00:00:00Z",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(Backup.restore).toHaveBeenCalledWith(1, "2024-01-01T00:00:00Z");
    });
  });
});
