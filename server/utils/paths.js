// SPDX-License-Identifier: MIT
const fs = require("fs");
const path = require("path");

// NOTE: __dirname here is <repo>/server/utils — fallbacks below are resolved
// relative to that. Pinned by server/__tests__/utils/paths.test.js.

/**
 * Resolve a path inside the server storage directory.
 * Uses STORAGE_DIR when set (Docker), otherwise falls back to the
 * local <repo>/server/storage directory (bare-metal/dev).
 * @param {...string} subdirs - optional subdirectories/file segments
 * @returns {string} absolute path
 */
function getStoragePath(...subdirs) {
  const base =
    process.env.STORAGE_DIR || path.resolve(__dirname, "../storage");
  return subdirs.length > 0 ? path.resolve(base, ...subdirs) : base;
}

/**
 * Resolve a path inside the collector directory (e.g. the hotdir).
 * In Docker, STORAGE_DIR is /app/server/storage, so the collector lives
 * two levels up at /app/collector. Bare-metal falls back to the
 * repo-relative <repo>/collector directory.
 * @param {...string} subdirs - optional subdirectories/file segments
 * @returns {string} absolute path
 */
function getCollectorPath(...subdirs) {
  const base = process.env.STORAGE_DIR
    ? path.resolve(process.env.STORAGE_DIR, "../../collector")
    : path.resolve(__dirname, "../../collector");
  return subdirs.length > 0 ? path.resolve(base, ...subdirs) : base;
}

/**
 * Traversal-safe join inside the storage directory.
 * Throws when the resolved target escapes the storage root
 * (e.g. via "../" segments or absolute path injection).
 * @param {...string} subdirs
 * @returns {string} absolute path, guaranteed inside storage
 */
function safeStorageJoin(...subdirs) {
  const root = getStoragePath();
  const target = path.resolve(root, ...subdirs.map(String));
  if (target !== root && !target.startsWith(root + path.sep))
    throw new Error(
      `Path traversal blocked: "${subdirs.join("/")}" escapes the storage directory.`,
    );
  return target;
}

/**
 * Traversal-safe join inside the collector directory.
 * @param {...string} subdirs
 * @returns {string} absolute path, guaranteed inside the collector dir
 */
function safeCollectorJoin(...subdirs) {
  const root = getCollectorPath();
  const target = path.resolve(root, ...subdirs.map(String));
  if (target !== root && !target.startsWith(root + path.sep))
    throw new Error(
      `Path traversal blocked: "${subdirs.join("/")}" escapes the collector directory.`,
    );
  return target;
}

/**
 * Resolve a storage subdirectory and make sure it exists on disk.
 * Safe to call repeatedly (mkdir recursive is idempotent).
 * @param {...string} subdirs
 * @returns {string} absolute, existing directory path
 */
function ensureStorageDir(...subdirs) {
  const dir = safeStorageJoin(...subdirs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Diagnostic snapshot of the path configuration — used by the
 * provider/system status endpoint so misconfigured deployments
 * (missing hotdir, unwritable storage) surface in the UI instead
 * of failing silently at upload time.
 * @returns {{storageDirSet: boolean, storagePath: string, storageExists: boolean,
 *            storageWritable: boolean, collectorPath: string, hotdirExists: boolean}}
 */
function pathsHealth() {
  const storagePath = getStoragePath();
  const collectorPath = getCollectorPath();
  const hotdir = getCollectorPath("hotdir");

  let storageWritable = false;
  try {
    fs.accessSync(storagePath, fs.constants.W_OK);
    storageWritable = true;
  } catch {
    storageWritable = false;
  }

  return {
    storageDirSet: !!process.env.STORAGE_DIR,
    storagePath,
    storageExists: fs.existsSync(storagePath),
    storageWritable,
    collectorPath,
    hotdirExists: fs.existsSync(hotdir),
  };
}

module.exports = {
  getStoragePath,
  getCollectorPath,
  safeStorageJoin,
  safeCollectorJoin,
  ensureStorageDir,
  pathsHealth,
};
