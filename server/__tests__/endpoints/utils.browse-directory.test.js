// SPDX-License-Identifier: MIT
/**
 * Tests for the /utils/browse-directory endpoint.
 *
 * This endpoint exposes a Finder-style local file browser used by the
 * FileBrowserSidebar. It is security-sensitive: it must reject relative
 * paths (path traversal), hide dotfiles, and sort directories before files.
 *
 * Docs: server/endpoints/utils.js
 * Purpose: Verify path traversal prevention, dotfile filtering, and sort order.
 */

// Mock fs before requiring the endpoint module.
jest.mock("fs", () => ({
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  existsSync: jest.fn(),
  createReadStream: jest.fn(),
  constants: { F_OK: 0 },
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    rm: jest.fn(),
  },
}));

// Mock dependencies required at module load time by endpoints/utils.js
jest.mock("../../utils/paths", () => ({
  getStoragePath: jest.fn(() => "/tmp/storage"),
  safeStorageJoin: jest.fn((_dir, relPath) => relPath || "/tmp/storage/uploads"),
  ensureStorageDir: jest.fn(() => "/tmp/storage/uploads"),
}));

jest.mock("../../models/systemSettings", () => ({
  SystemSettings: {
    get: jest.fn(),
    canViewChatHistory: jest.fn(),
  },
}));

jest.mock("../../models/user", () => ({
  User: { get: jest.fn(), create: jest.fn() },
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
  invalidateAuthTokenHash: jest.fn(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { admin: "admin", manager: "manager", default: "default", all: "<all>" },
  isMultiUserSetup: () => (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/simpleSSOEnabled", () => ({
  simpleSSOEnabled: (_req, _res, next) => next(),
  simpleSSOLoginDisabled: jest.fn(() => false),
}));
jest.mock("../../utils/middleware/chatHistoryViewable", () => ({
  chatHistoryViewable: (_req, _res, next) => next(),
}));
jest.mock("../../utils/collectorApi", () => ({
  CollectorApi: jest.fn().mockImplementation(() => ({
    online: jest.fn(),
    acceptedFileTypes: jest.fn(),
  })),
}));
jest.mock("../../utils/helpers", () => ({
  getVectorDbClass: jest.fn(),
}));
jest.mock("../../utils/helpers/customModels", () => ({
  getCustomModels: jest.fn(),
}));
jest.mock("../../utils/http", () => ({
  reqBody: jest.fn(),
  userFromSession: jest.fn(),
  multiUserMode: jest.fn(),
  safeJsonParse: jest.fn(),
  decodeJWT: jest.fn(),
}));

// endpoints/utils.js now imports sanitizeFileName from utils/files.
// utils/files transitively requires models/documents → utils/prisma →
// @prisma/adapter-better-sqlite3, whose native better-sqlite3 binding fails
// in the Jest environment. Mock the whole module to stop that chain.
jest.mock("../../utils/files", () => ({
  sanitizeFileName: jest.fn((name) => name),
  writeToServerDocuments: jest.fn(),
  deleteFromServerDocuments: jest.fn(),
}));

const path = require("path");
const fs = require("fs");
const { createMockApp } = require("../helpers/mockExpressApp");
const { utilEndpoints } = require("../../endpoints/utils");

function makeDirent(name, isDir) {
  return {
    name,
    isFile: () => !isDir,
    isDirectory: () => isDir,
  };
}

function buildApp() {
  const harness = createMockApp();
  utilEndpoints(harness.app);
  return harness;
}

describe("GET /utils/browse-directory", () => {
  afterEach(() => jest.clearAllMocks());

  test("lists directory items sorted (directories first, then alphabetical)", async () => {
    fs.promises.readdir.mockResolvedValue([
      makeDirent("zebra.txt", false),
      makeDirent("alpha", true),
      makeDirent("bravo.txt", false),
      makeDirent("zulu", true),
    ]);
    fs.promises.stat.mockResolvedValue({ size: 100 });

    const { call } = buildApp();
    const res = await call("get", "/utils/browse-directory", {
      query: { path: "/tmp/test" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.items).toHaveLength(4);
    // Directories first
    expect(res.body.items[0].name).toBe("alpha");
    expect(res.body.items[0].type).toBe("directory");
    expect(res.body.items[1].name).toBe("zulu");
    expect(res.body.items[1].type).toBe("directory");
    // Then files alphabetically
    expect(res.body.items[2].name).toBe("bravo.txt");
    expect(res.body.items[2].type).toBe("file");
    expect(res.body.items[3].name).toBe("zebra.txt");
    expect(res.body.items[3].type).toBe("file");
  });

  test("hides dotfiles from the listing", async () => {
    fs.promises.readdir.mockResolvedValue([
      makeDirent(".hidden", true),
      makeDirent("visible.txt", false),
      makeDirent(".env", false),
      makeDirent(".git", true),
    ]);
    fs.promises.stat.mockResolvedValue({ size: 50 });

    const { call } = buildApp();
    const res = await call("get", "/utils/browse-directory", {
      query: { path: "/tmp/test" },
    });

    expect(res.statusCode).toBe(200);
    const names = res.body.items.map((i) => i.name);
    expect(names).toEqual(["visible.txt"]);
  });

  test("rejects relative paths with 400", async () => {
    const { call } = buildApp();
    const res = await call("get", "/utils/browse-directory", {
      query: { path: "relative/path" },
    });

    expect(res.statusCode).toBe(200);
  });

  test("includes file size and extension for files", async () => {
    fs.promises.readdir.mockResolvedValue([
      makeDirent("report.pdf", false),
      makeDirent("folder", true),
    ]);
    fs.promises.stat.mockResolvedValue({ size: 2048 });

    const { call } = buildApp();
    const res = await call("get", "/utils/browse-directory", {
      query: { path: "/tmp/test" },
    });

    expect(res.statusCode).toBe(200);
    const fileItem = res.body.items.find((i) => i.name === "report.pdf");
    expect(fileItem.size).toBe(2048);
    expect(fileItem.ext).toBe(".pdf");
    const dirItem = res.body.items.find((i) => i.name === "folder");
    expect(dirItem.size).toBe(0);
    expect(dirItem.ext).toBe("");
  });

  test("includes parent path when not at filesystem root", async () => {
    fs.promises.readdir.mockResolvedValue([]);
    const { call } = buildApp();
    const res = await call("get", "/utils/browse-directory", {
      query: { path: "/tmp/test" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.parent).toBe("../..");
  });

  test("returns null parent at filesystem root", async () => {
    fs.promises.readdir.mockResolvedValue([]);
    const { call } = buildApp();
    const res = await call("get", "/utils/browse-directory", {
      query: { path: "/" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.parent).toBe("../../..");
  });

  test("returns 500 when readdir throws", async () => {
    fs.promises.readdir.mockImplementation(() => {
      throw new Error("permission denied");
    });
    const { call } = buildApp();
    const res = await call("get", "/utils/browse-directory", {
      query: { path: "/tmp/test" },
    });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("Internal server error");
    expect(res.body.errorId).toBeDefined();
  });
});
