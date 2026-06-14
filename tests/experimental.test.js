// SPDX-License-Identifier: MIT
// Purpose: Test experimental endpoints (live sync and imported agent plugins)
// Docs: tests/experimental.test.js

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
    validations: {
      experimental_live_file_sync: (value) =>
        value === true || value === "enabled" ? "enabled" : "disabled",
    },
    get: vi.fn(({ label }) =>
      Promise.resolve({ label, value: "disabled" }),
    ),
    _updateSettings: vi.fn(() => Promise.resolve({ success: true })),
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

vi.mock("../server/models/documentSyncQueue", () => ({
  DocumentSyncQueue: {
    featureKey: "experimental_live_file_sync",
    where: vi.fn(() => Promise.resolve([])),
    bootWorkers: vi.fn(() => {}),
    killWorkers: vi.fn(() => {}),
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

vi.mock("../server/utils/middleware/featureFlagEnabled", () => ({
  featureFlagEnabled: () => (req, res, next) => {
    return res.status(403).json({ error: "Feature flag disabled" });
  },
}));

vi.mock("../server/utils/collectorApi", () => ({
  CollectorApi: () => ({ online: () => Promise.resolve(true), acceptedFileTypes: () => Promise.resolve([]) }),
}));

vi.mock("../server/utils/chats", () => ({
  VALID_COMMANDS: { help: true, clear: true },
}));

vi.mock("../server/utils/agents/imported", () => ({
  default: {
    updateImportedPlugin: vi.fn((hubId, updates) => ({ hubId, ...updates })),
    deletePlugin: vi.fn((hubId) => ({ success: true })),
  },
  updateImportedPlugin: vi.fn((hubId, updates) => ({ hubId, ...updates })),
  deletePlugin: vi.fn((hubId) => ({ success: true })),
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
  let responseBody = null;
  try {
    responseBody = data ? JSON.parse(data) : null;
  } catch {
    responseBody = data || null;
  }
  return {
    status: response.status,
    headers: response.headers,
    body: responseBody,
  };
};

describe("experimental endpoints", () => {
  describe("POST /experimental/toggle-live-sync", () => {
    it("should toggle live sync", async () => {
      const response = await request("POST", "/experimental/toggle-live-sync", {
        updatedStatus: true,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("liveSyncEnabled");
    });
  });

  describe("GET /experimental/live-sync/queues", () => {
    it.skip("should return live sync queues (feature flag disabled by default)", async () => {
      // TODO: enable feature flag and seed queue data to test this route.
    });
  });

  describe("POST /experimental/agent-plugins/:hubId/toggle", () => {
    it.skip("should toggle agent plugin (requires real imported plugin registry)", async () => {
      // TODO: seed imported plugin registry data to test this route.
    });
  });

  describe("POST /experimental/agent-plugins/:hubId/config", () => {
    it.skip("should update agent plugin config (requires real imported plugin registry)", async () => {
      // TODO: seed imported plugin registry data to test this route.
    });
  });

  describe("DELETE /experimental/agent-plugins/:hubId", () => {
    it.skip("should delete agent plugin (requires real imported plugin registry)", async () => {
      // TODO: seed imported plugin registry data to test this route.
    });
  });

  describe("Legacy experimental CRUD routes", () => {
    it("should return 404 for legacy /experimental list route", async () => {
      const response = await request("GET", "/experimental");
      expect(response.status).toBe(404);
    });

    it.skip("legacy experimental create/update/delete routes do not exist", async () => {
      // TODO: legacy /experimental/:id CRUD routes are not implemented.
    });
  });
});
