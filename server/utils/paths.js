// SPDX-License-Identifier: MIT
// Purpose: Centralized path helpers for the server with STORAGE_DIR fallback.
// Docs: server/utils/paths.js.doc.md
const consoleLogger = require("./logger/console.js");

const fs = require("fs");
const path = require("path");

// NOTE: __dirname here is <repo>/server/utils — fallbacks below are resolved
// relative to that. Pinned by server/__tests__/utils/paths.test.js.

/**
 * Resolve a path inside the server storage directory.
 * Uses STORAGE_DIR when set (Docker), otherwise falls back to the
 * local <repo>/server/storage directory (bare-metal/dev).
 *
 * If STORAGE_DIR is set but the directory cannot be created (e.g. the
 * `.env.example` Docker absolute path leaked into a bare-metal install),
 * logs a one-time warning and falls back to the local relative path
 * so dev installs do not crash on startup (`mkdir ENOENT /app/...`).
 * Production deployments should always set a writable absolute path.
 * @param {...string} subdirs - optional subdirectories/file segments
 * @returns {string} absolute path
 */
function getStoragePath(...subdirs) {
  const fallbackBase = path.resolve(__dirname, "../storage");
  if (!process.env.STORAGE_DIR) {
    return subdirs.length > 0
      ? path.resolve(fallbackBase, ...subdirs)
      : fallbackBase;
  }
  const candidate = process.env.STORAGE_DIR;
  if (!path.isAbsolute(candidate)) {
    if (!pathsWarnedAboutFallback) {
      consoleLogger.warn(
        `[paths] STORAGE_DIR="${candidate}" is not absolute — falling back to local <repo>/server/storage. Set STORAGE_DIR to an absolute path in .env.development to silence this warning.`,
      );
      pathsWarnedAboutFallback = true;
    }
    process.env.STORAGE_DIR = "";
    return subdirs.length > 0
      ? path.resolve(fallbackBase, ...subdirs)
      : fallbackBase;
  }
  try {
    if (!fs.existsSync(candidate)) fs.mkdirSync(candidate, { recursive: true });
    return subdirs.length > 0 ? path.resolve(candidate, ...subdirs) : candidate;
  } catch (err) {
    if (!pathsWarnedAboutFallback) {
      consoleLogger.warn(
        `[paths] STORAGE_DIR="${candidate}" is not writable (${err.code || err.message}) — falling back to local <repo>/server/storage. Set STORAGE_DIR in .env.development to an absolute writable path to silence this warning.`,
      );
      pathsWarnedAboutFallback = true;
    }
    process.env.STORAGE_DIR = "";
    return subdirs.length > 0
      ? path.resolve(fallbackBase, ...subdirs)
      : fallbackBase;
  }
}

let pathsWarnedAboutFallback = false;

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
 * Traversal-safe join *inside the global store* (STORAGE_DIR/global).
 *
 * safeStorageJoin only guarantees the target stays within STORAGE_DIR — a
 * relative path like "../uploads" would still resolve to a sibling store. This
 * wrapper additionally pins the result under STORAGE_DIR/global, so global
 * callers cannot be tricked into reading or mutating the uploads tree (or any
 * other sibling) via "../" segments. Throws on any escape.
 * @param {...string} rel path segments relative to the global root
 * @returns {string} absolute path guaranteed inside the global store
 */
function safeGlobalJoin(...rel) {
  const globalRoot = getStoragePath("global");
  const target = safeStorageJoin("global", ...rel);
  if (target !== globalRoot && !target.startsWith(globalRoot + path.sep))
    throw new Error(
      `Path traversal blocked: "${rel.join("/")}" escapes the global store.`,
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

  let storageWritable;
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
  safeGlobalJoin,
  ensureStorageDir,
  pathsHealth,
};
