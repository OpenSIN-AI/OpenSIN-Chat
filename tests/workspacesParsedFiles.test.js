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

beforeAll(async () => {
  const existing = await prisma.users.findFirst({ where: { username: "parsed-files-test-user" } });
  if (!existing) {
    const user = await prisma.users.create({
      data: {
        username: "parsed-files-test-user",
        password: "test-password",
        role: "admin",
      },
    });
    testUserId = user.id;
  } else {
    testUserId = existing.id;
  }
});

beforeEach(async () => {
  vi.clearAllMocks();
  app = createApp();
});

const TEST_PORT = process.env.SERVER_PORT || "3001";

const request = async (method, path, body = null, headers = {}) => {
  const url = `http://localhost:${TEST_PORT}${path}`;
  const options = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  const data = await response.text();
  let responseBody = null;
  if (data) {
    try {
      responseBody = JSON.parse(data);
    } catch {
      responseBody = data;
    }
  }
  return { status: response.status, headers: response.headers, body: responseBody };
};

const createWorkspace = async (name) => {
  const response = await request("POST", "/workspace/new", { name });
  expect(response.status).toBe(200);
  return response.body.workspace;
};

const createParsedFile = async (workspaceId, filename = "test-parsed-file.json") => {
  const existing = await prisma.workspace_parsed_files.findFirst({ where: { filename } });
  if (existing) await prisma.workspace_parsed_files.delete({ where: { id: existing.id } });
  const file = await prisma.workspace_parsed_files.create({
    data: {
      filename,
      workspaceId,
      userId: testUserId,
      metadata: JSON.stringify({ title: "Test" }),
      tokenCountEstimate: 10,
    },
  });
  return file;
};

describe("workspace parsed files endpoints", () => {
  describe("GET /workspace/:slug/parsed-files", () => {
    it("should return parsed files for a workspace", async () => {
      const workspace = await createWorkspace("parsed-files-list-workspace");
      const file = await createParsedFile(workspace.id, "parsed-files-list-test.json");
      const response = await request("GET", `/workspace/${workspace.slug}/parsed-files`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("files");
      expect(Array.isArray(response.body.files)).toBe(true);
      expect(response.body).toHaveProperty("contextWindow");
      expect(response.body).toHaveProperty("currentContextTokenCount");
      expect(response.body.files.some((f) => f.id === file.id)).toBe(true);
    });

    it("should return 404 for non-existent workspace", async () => {
      const response = await request("GET", "/workspace/nonexistent/parsed-files");
      expect(response.status).toBe(404);
    });
  });

  describe("POST /workspace/:slug/parse", () => {
    // TODO: The /parse endpoint requires a real file upload via multer and a
    // running document collector that returns parsed documents. This test is
    // skipped until the test harness can provide a mocked collector and a
    // multipart upload helper.
    it.skip("should parse an uploaded file into workspace parsed files", () => {});

    it("should reject with no file uploaded", async () => {
      const workspace = await createWorkspace("parsed-files-parse-no-file-workspace");
      const response = await request("POST", `/workspace/${workspace.slug}/parse`);
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error", "No file uploaded.");
    });
  });

  describe("DELETE /workspace/:slug/delete-parsed-files", () => {
    it("should delete parsed files by id list", async () => {
      const workspace = await createWorkspace("parsed-files-delete-workspace");
      const file = await createParsedFile(workspace.id, "parsed-files-delete-test.json");
      console.log("DEBUG", { testUserId, fileUserId: file.userId, fileId: file.id, workspaceId: workspace.id });
      const response = await request("DELETE", `/workspace/${workspace.slug}/delete-parsed-files`, {
        fileIds: [file.id],
      });
      console.log("DELETE response", { status: response.status, body: response.body });
      expect(response.status).toBe(200);
    });

    it("should return 400 without file ids", async () => {
      const workspace = await createWorkspace("parsed-files-delete-bad-workspace");
      const response = await request("DELETE", `/workspace/${workspace.slug}/delete-parsed-files`, {
        fileIds: [],
      });
      expect(response.status).toBe(400);
    });
  });

  // TODO: The server does not expose GET /workspace/:slug/parsed-files/:fileId
  // or DELETE /workspace/:slug/parsed-files/:fileId. Use the list/delete
  // endpoints above instead.
  describe.skip("GET /workspace/:slug/parsed-files/:fileId (not implemented)", () => {
    test.skip("should return a specific parsed file", () => {});
    test.skip("should return 404 for non-existent file", () => {});
  });

  describe.skip("DELETE /workspace/:slug/parsed-files/:fileId (not implemented)", () => {
    test.skip("should remove a parsed file", () => {});
    test.skip("should return 404 for non-existent file", () => {});
  });
});
