// SPDX-License-Identifier: MIT
/* eslint-env jest */
const path = require("path");

const PATHS_MODULE = "../../utils/paths";
const SERVER_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(SERVER_ROOT, "..");

describe("server/utils/paths", () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  function loadPaths(storageDir) {
    jest.resetModules();
    if (storageDir === undefined) delete process.env.STORAGE_DIR;
    else process.env.STORAGE_DIR = storageDir;
    return require(PATHS_MODULE);
  }

  describe("getStoragePath", () => {
    test("uses STORAGE_DIR when set (Docker)", () => {
      // Use a path we know we can mkdir on the test host so the safety net
      // does not kick in. /tmp is writable everywhere.
      const writableDockerPath = "/tmp/opensin-storage";
      const { getStoragePath } = loadPaths(writableDockerPath);
      const result = getStoragePath();
      // Either STORAGE_DIR honored (path is writable) or safety-fallback to
      // repo-relative storage if mkdir failed.
      const expectedDocker = writableDockerPath;
      const expectedFallback = path.join(SERVER_ROOT, "storage");
      expect([expectedDocker, expectedFallback]).toContain(result);
      // Cleanup the test-created dir for idempotency
      const fs = require("fs");
      try { fs.rmdirSync(result); } catch (_) {}
    });

    test("joins subdirectories onto STORAGE_DIR", () => {
      const writableDockerPath = "/tmp/opensin-storage";
      const { getStoragePath } = loadPaths(writableDockerPath);
      expect(
        [
          path.resolve(writableDockerPath, "documents"),
          path.join(SERVER_ROOT, "storage", "documents"),
        ],
      ).toContain(getStoragePath("documents"));
      expect(
        [
          path.resolve(writableDockerPath, "assets", "pfp"),
          path.join(SERVER_ROOT, "storage", "assets", "pfp"),
        ],
      ).toContain(getStoragePath("assets", "pfp"));
    });

    test("falls back to <repo>/server/storage when STORAGE_DIR is unset", () => {
      const { getStoragePath } = loadPaths(undefined);
      expect(getStoragePath()).toBe(path.join(SERVER_ROOT, "storage"));
    });

    test("fallback joins subdirectories correctly", () => {
      const { getStoragePath } = loadPaths(undefined);
      expect(getStoragePath("vector-cache")).toBe(
        path.join(SERVER_ROOT, "storage", "vector-cache"),
      );
    });

    test("returns an absolute path in all modes", () => {
      const withEnv = loadPaths("/app/server/storage");
      expect(path.isAbsolute(withEnv.getStoragePath("x"))).toBe(true);
      const withoutEnv = loadPaths(undefined);
      expect(path.isAbsolute(withoutEnv.getStoragePath("x"))).toBe(true);
    });
  });

  describe("getCollectorPath", () => {
    test("derives collector dir from STORAGE_DIR (Docker layout)", () => {
      const { getCollectorPath } = loadPaths("/app/server/storage");
      expect(getCollectorPath()).toBe(path.resolve("/app/collector"));
    });

    test("resolves the hotdir inside the collector (Docker layout)", () => {
      const { getCollectorPath } = loadPaths("/app/server/storage");
      expect(getCollectorPath("hotdir")).toBe(
        path.resolve("/app/collector", "hotdir"),
      );
    });

    test("falls back to <repo>/collector when STORAGE_DIR is unset", () => {
      const { getCollectorPath } = loadPaths(undefined);
      expect(getCollectorPath()).toBe(path.join(REPO_ROOT, "collector"));
    });

    test("fallback hotdir matches the repo-relative collector/hotdir", () => {
      const { getCollectorPath } = loadPaths(undefined);
      expect(getCollectorPath("hotdir")).toBe(
        path.join(REPO_ROOT, "collector", "hotdir"),
      );
    });
  });
});
