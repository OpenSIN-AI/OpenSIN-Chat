// SPDX-License-Identifier: MIT
/* eslint-env jest, node */
const path = require("path");
const { getStoragePath } = require("../../utils/paths");

describe("getStoragePath", () => {
  const originalStorageDir = process.env.STORAGE_DIR;

  afterEach(() => {
    if (originalStorageDir !== undefined) {
      process.env.STORAGE_DIR = originalStorageDir;
    } else {
      delete process.env.STORAGE_DIR;
    }
  });

  it("returns default storage path when STORAGE_DIR not set", () => {
    delete process.env.STORAGE_DIR;
    const result = getStoragePath();
    expect(result).toContain("server/storage");
    expect(path.isAbsolute(result)).toBe(true);
  });

  it("uses STORAGE_DIR env when set", () => {
    process.env.STORAGE_DIR = "/custom/storage";
    const result = getStoragePath();
    expect(result).toBe("/custom/storage");
  });

  it("appends subdirs correctly", () => {
    process.env.STORAGE_DIR = "/custom/storage";
    const result = getStoragePath("documents", "2024");
    expect(result).toBe(path.resolve("/custom/storage", "documents", "2024"));
  });

  it("returns base path when no subdirs", () => {
    process.env.STORAGE_DIR = "/custom/storage";
    const result = getStoragePath();
    expect(result).toBe("/custom/storage");
  });

  it("restores env after test", () => {
    process.env.STORAGE_DIR = "/tmp/test-restore";
    const before = process.env.STORAGE_DIR;
    getStoragePath();
    expect(process.env.STORAGE_DIR).toBe(before);
  });
});
