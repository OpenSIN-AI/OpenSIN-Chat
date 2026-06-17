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
}));

// Mock dependencies required at module load time by endpoints/utils.js
jest.mock("../../utils/paths", () => ({
  getStoragePath: jest.fn(() => "/tmp/storage"),
}));

jest.mock("../../models/systemSettings", () => ({
  SystemSettings: {
    get: jest.fn(),
    canViewChatHistory: jest.fn(),
  },
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
    fs.readdirSync.mockReturnValue([
      makeDirent("zebra.txt", false),
      makeDirent("alpha", true),
      makeDirent("bravo.txt", false),
      makeDirent("zulu", true),
    ]);
    fs.statSync.mockReturnValue({ size: 100 });

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
    fs.readdirSync.mockReturnValue([
      makeDirent(".hidden", true),
      makeDirent("visible.txt", false),
      makeDirent(".env", false),
      makeDirent(".git", true),
    ]);
    fs.statSync.mockReturnValue({ size: 50 });

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

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/absolute/i);
  });

  test("includes file size and extension for files", async () => {
    fs.readdirSync.mockReturnValue([
      makeDirent("report.pdf", false),
      makeDirent("folder", true),
    ]);
    fs.statSync.mockReturnValue({ size: 2048 });

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
    fs.readdirSync.mockReturnValue([]);
    const { call } = buildApp();
    const res = await call("get", "/utils/browse-directory", {
      query: { path: "/tmp/test" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.parent).toBe("/tmp");
  });

  test("returns null parent at filesystem root", async () => {
    fs.readdirSync.mockReturnValue([]);
    const { call } = buildApp();
    const res = await call("get", "/utils/browse-directory", {
      query: { path: "/" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.parent).toBeNull();
  });

  test("returns 500 when readdirSync throws", async () => {
    fs.readdirSync.mockImplementation(() => {
      throw new Error("permission denied");
    });
    const { call } = buildApp();
    const res = await call("get", "/utils/browse-directory", {
      query: { path: "/tmp/test" },
    });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe("permission denied");
  });
});
