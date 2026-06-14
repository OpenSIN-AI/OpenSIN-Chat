// SPDX-License-Identifier: MIT
// Purpose: Test workspace parsed files endpoints
// Docs: tests/workspacesParsedFiles.test.js

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { createApp } from "../server/app";
import prisma from "../server/utils/prisma";

// Mutable user id that the mocked session will report. The real test user is
// created in beforeAll so that workspace foreign-key constraints can be
// satisfied; this value is then updated to the real primary key.
let testUserId = 1;

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
  userFromSession: () => Promise.resolve({ id: testUserId, username: "test" }),
  multiUserMode: () => false,
  queryParams: () => ({}),
}));

vi.mock("../server/utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (req, res, next) => next(),
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

describe("workspace parsed files endpoints", () => {
  describe("GET /workspace/:slug/parsed-files", () => {
    it("should return parsed files for a workspace", async () => {
      const response = await request("GET", "/workspace/test/parsed-files");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("files");
      expect(Array.isArray(response.body.files)).toBe(true);
    });

    it("should return 404 for non-existent workspace", async () => {
      const response = await request("GET", "/workspace/nonexistent/parsed-files");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /workspace/:slug/parsed-files", () => {
    it("should add a parsed file to workspace", async () => {
      const response = await request("POST", "/workspace/test/parsed-files", {
        name: "parsed.txt",
        content: "parsed content",
        type: "text/plain",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("name", "parsed.txt");
    });

    it("should reject with missing name", async () => {
      const response = await request("POST", "/workspace/test/parsed-files", {
        content: "parsed content",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /workspace/:slug/parsed-files/:fileId", () => {
    it("should return a specific parsed file", async () => {
      const response = await request("GET", "/workspace/test/parsed-files/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
    });

    it("should return 404 for non-existent file", async () => {
      const response = await request("GET", "/workspace/test/parsed-files/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /workspace/:slug/parsed-files/:fileId", () => {
    it("should remove a parsed file", async () => {
      const response = await request("DELETE", "/workspace/test/parsed-files/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent file", async () => {
      const response = await request("DELETE", "/workspace/test/parsed-files/999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
