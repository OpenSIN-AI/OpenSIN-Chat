// SPDX-License-Identifier: MIT
// Purpose: Test extension endpoints (now under /ext/...)
// Docs: tests/extensions.test.js

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
  CollectorApi: () => ({
    online: () => Promise.resolve(true),
    acceptedFileTypes: () => Promise.resolve([]),
    forwardExtensionRequest: ({ endpoint }) =>
      Promise.resolve({ forwarded: true, endpoint }),
  }),
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

describe("extensions endpoints", () => {
  describe("POST /ext/:repo_platform/branches", () => {
    it("should forward branches request for github (collector returns unavailable)", async () => {
      const response = await request("POST", "/ext/github/branches", {
        repo: "test/repo",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", false);
    });

    it("should return 500 for unsupported repo platform", async () => {
      const response = await request("POST", "/ext/unknown/branches", {
        repo: "test/repo",
      });
      expect(response.status).toBe(500);
    });
  });

  describe("POST /ext/:repo_platform/repo", () => {
    it("should forward repo request for github (collector returns unavailable)", async () => {
      const response = await request("POST", "/ext/github/repo", {
        repo: "test/repo",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("POST /ext/youtube/transcript", () => {
    it("should forward youtube transcript request (collector returns unavailable)", async () => {
      const response = await request("POST", "/ext/youtube/transcript", {
        url: "https://youtube.com/watch?v=123",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("POST /ext/confluence", () => {
    it.skip("should forward confluence request (requires collector setup)", async () => {
      // TODO: run with a real collector to test full forwarding.
    });
  });

  describe("Legacy extensions CRUD routes", () => {
    it("should return 404 for legacy /extensions list route", async () => {
      const response = await request("GET", "/extensions");
      expect(response.status).toBe(404);
    });

    it.skip("legacy extensions create/update/delete routes do not exist", async () => {
      // TODO: /extensions CRUD routes are not implemented.
    });
  });
});
