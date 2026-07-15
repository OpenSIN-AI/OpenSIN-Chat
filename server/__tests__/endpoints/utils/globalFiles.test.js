// SPDX-License-Identifier: MIT
/**
 * Tests for the global file store endpoints (server/endpoints/utils/globalFiles.js).
 *
 * These endpoints back the "Global" scope of the Dateien tab: a real,
 * deployment-wide storage root (STORAGE_DIR/global) shared across all
 * workspaces. They are security-sensitive — every mutating operation must be
 * blocked from escaping the global root via path traversal.
 *
 * Path-traversal enforcement lives in utils/paths.safeStorageJoin, which is the
 * REAL (unmocked) implementation here so we exercise the actual guard. fs is
 * mocked so no disk I/O happens.
 */

// Real path helpers so safeStorageJoin actually throws on traversal.
jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  createReadStream: jest.fn(),
  constants: { F_OK: 0, W_OK: 2 },
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    rm: jest.fn(),
  },
}));

jest.mock("../../../utils/http", () => ({
  reqBody: (req) => req.body || {},
}));

const fs = require("fs");
const { createMockApp } = require("../../helpers/mockExpressApp");
const {
  globalFilesEndpoints,
} = require("../../../endpoints/utils/globalFiles");

// Force STORAGE_DIR to a stable absolute root for deterministic assertions.
const STORAGE_ROOT = "/tmp/opensin-storage";

const passthrough = (_req, _res, next) => next();
const deps = {
  validatedRequest: passthrough,
  flexUserRoleValid: () => passthrough,
  ROLES: { admin: "admin" },
};

function makeDirent(name, isDir) {
  return { name, isFile: () => !isDir, isDirectory: () => isDir };
}

function buildApp() {
  const harness = createMockApp();
  globalFilesEndpoints(harness.app, deps);
  return harness;
}

describe("global file store endpoints", () => {
  let prevStorageDir;
  beforeAll(() => {
    prevStorageDir = process.env.STORAGE_DIR;
    process.env.STORAGE_DIR = STORAGE_ROOT;
  });
  afterAll(() => {
    process.env.STORAGE_DIR = prevStorageDir;
  });
  afterEach(() => jest.clearAllMocks());

  describe("GET /utils/global/browse-directory", () => {
    test("lists items sorted (directories first, then alphabetical)", async () => {
      fs.promises.readdir.mockResolvedValue([
        makeDirent("memory.md", false),
        makeDirent("shared", true),
        makeDirent("agents.md", false),
      ]);
      fs.promises.stat.mockResolvedValue({
        size: 10,
        mtime: new Date(0),
      });

      const { call } = buildApp();
      const res = await call("get", "/utils/global/browse-directory", {
        query: { path: "" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.items.map((i) => i.name)).toEqual([
        "shared",
        "agents.md",
        "memory.md",
      ]);
      expect(res.body.parent).toBeNull();
    });

    test("hides dotfiles", async () => {
      fs.promises.readdir.mockResolvedValue([
        makeDirent(".secret", false),
        makeDirent("visible.md", false),
      ]);
      fs.promises.stat.mockResolvedValue({ size: 1, mtime: new Date(0) });

      const { call } = buildApp();
      const res = await call("get", "/utils/global/browse-directory", {
        query: { path: "" },
      });

      expect(res.body.items.map((i) => i.name)).toEqual(["visible.md"]);
    });

    test("rejects path traversal with 500 (safeStorageJoin throws)", async () => {
      const { call } = buildApp();
      const res = await call("get", "/utils/global/browse-directory", {
        query: { path: "../uploads" },
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal server error");
      expect(fs.promises.readdir).not.toHaveBeenCalled();
    });
  });

  describe("POST /utils/global/create-file", () => {
    test("rejects names containing traversal characters", async () => {
      const { call } = buildApp();
      const res = await call("post", "/utils/global/create-file", {
        body: { name: "../evil.md" },
      });
      expect(res.statusCode).toBe(400);
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });

    test("writes a valid file", async () => {
      fs.promises.access.mockRejectedValue(new Error("nope")); // does not exist
      fs.promises.writeFile.mockResolvedValue();
      const { call } = buildApp();
      const res = await call("post", "/utils/global/create-file", {
        body: { name: "agents.md", content: "hi" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });
  });

  describe("DELETE /utils/global/delete-item", () => {
    test("requires a path", async () => {
      const { call } = buildApp();
      const res = await call("delete", "/utils/global/delete-item", {
        body: {},
      });
      expect(res.statusCode).toBe(400);
    });

    test("blocks deleting the global root", async () => {
      const { call } = buildApp();
      // "." resolves to the global root itself.
      const res = await call("delete", "/utils/global/delete-item", {
        body: { path: "." },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/root/i);
      expect(fs.promises.rm).not.toHaveBeenCalled();
    });

    test("rejects path traversal via 500", async () => {
      const { call } = buildApp();
      const res = await call("delete", "/utils/global/delete-item", {
        body: { path: "../../etc/passwd" },
      });
      expect(res.statusCode).toBe(500);
      expect(fs.promises.rm).not.toHaveBeenCalled();
    });

    test("deletes an existing file", async () => {
      fs.promises.access.mockResolvedValue(); // exists
      fs.promises.rm.mockResolvedValue();
      const { call } = buildApp();
      const res = await call("delete", "/utils/global/delete-item", {
        body: { path: "old.md" },
      });
      expect(res.statusCode).toBe(200);
      expect(fs.promises.rm).toHaveBeenCalled();
    });
  });
});
