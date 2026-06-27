// SPDX-License-Identifier: MIT

jest.mock("../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("../../models/documents", () => ({
  Document: { where: jest.fn() },
}));
jest.mock("../../utils/files", () => ({
  normalizePath: jest.fn((p) => p),
  documentsPath: "/storage/documents",
  isWithin: jest.fn(() => true),
}));
jest.mock("../../utils/http", () => ({
  reqBody: jest.fn(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  ROLES: { admin: "admin", manager: "manager", user: "user", all: "all" },
  flexUserRoleValid: () => (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));

const fs = require("fs");
const { Document } = require("../../models/documents");
const { normalizePath, isWithin } = require("../../utils/files");
const { reqBody } = require("../../utils/http");
const { createMockApp } = require("../helpers/mockExpressApp");
const { documentEndpoints } = require("../../endpoints/document");

const flushPromises = () => new Promise((r) => setImmediate(r));

function buildApp() {
  const harness = createMockApp();
  documentEndpoints(harness.app);
  return harness;
}

describe("documentEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    reqBody.mockImplementation((req) => req.body);
    normalizePath.mockImplementation((p) => p);
    isWithin.mockReturnValue(true);
  });
  afterEach(() => jest.restoreAllMocks());

  describe("POST /document/create-folder", () => {
    it("creates a folder successfully", async () => {
      jest.spyOn(fs.promises, "access").mockRejectedValue(new Error("ENOENT"));
      jest.spyOn(fs.promises, "mkdir").mockResolvedValue();
      const res = await app.call("post", "/document/create-folder", { body: { name: "my-folder" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("rejects when folder exists", async () => {
      jest.spyOn(fs.promises, "access").mockResolvedValue();
      const res = await app.call("post", "/document/create-folder", { body: { name: "existing" } });
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toContain("already exists");
    });

    it("rejects invalid folder name", async () => {
      isWithin.mockReturnValue(false);
      const res = await app.call("post", "/document/create-folder", { body: { name: "../escape" } });
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toContain("Invalid folder name");
    });
  });

  describe("POST /document/move-files", () => {
    it("moves non-embedded files successfully", async () => {
      Document.where.mockResolvedValue([]);
      jest.spyOn(fs, "rename").mockImplementation((_from, _to, cb) => cb(null));
      const res = await app.call("post", "/document/move-files", {
        body: { files: [{ from: "a.txt", to: "b.txt" }] },
      });
      await flushPromises();
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("reports unmovable embedded files", async () => {
      Document.where.mockResolvedValue([{ docpath: "a.txt" }]);
      jest.spyOn(fs, "rename").mockImplementation((_from, _to, cb) => cb(null));
      const res = await app.call("post", "/document/move-files", {
        body: { files: [{ from: "a.txt", to: "b.txt" }] },
      });
      await flushPromises();
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain("not moved");
    });

    it("returns 500 when isWithin fails", async () => {
      Document.where.mockResolvedValue([]);
      isWithin.mockReturnValue(false);
      jest.spyOn(fs, "rename").mockImplementation((_from, _to, cb) => cb(null));
      const res = await app.call("post", "/document/move-files", {
        body: { files: [{ from: "a.txt", to: "b.txt" }] },
      });
      await flushPromises();
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toContain("Failed to move");
    });

    it("returns 500 when rename fails", async () => {
      Document.where.mockResolvedValue([]);
      jest.spyOn(fs, "rename").mockImplementation((_from, _to, cb) => cb(new Error("disk error")));
      const res = await app.call("post", "/document/move-files", {
        body: { files: [{ from: "a.txt", to: "b.txt" }] },
      });
      await flushPromises();
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toContain("Failed to move");
    });
  });
});
