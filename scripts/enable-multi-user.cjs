#!/usr/bin/env node
// SPDX-License-Identifier: MIT
//
// enable-multi-user.cjs — one-time / maintenance helper to switch an OpenSIN-Chat
// instance from single-user to multi-user mode directly in the SQLite DB.
//
// Purpose: Set system_settings.multi_user_mode = true and ensure a target user
// exists with a bcrypt-hashed password and admin role. Designed to run on the
// host that owns the database file (production server, container host, etc.).
//
// Docs: scripts/enable-multi-user.cjs.doc.md
//
// Usage:
//   # Hash a plaintext password on the fly (bcryptjs, cost factor 10)
//   OPEN_SIN_CHAT_PASSWORD="MyP@ssw0rd" sudo -E node scripts/enable-multi-user.cjs
//
//   # Or supply a pre-computed bcrypt hash so the plaintext never reaches the server
//   OPEN_SIN_CHAT_HASHED_PASSWORD='$2a$10$...' sudo -E node scripts/enable-multi-user.cjs
//
// Env:
//   OPENSIN_CHAT_DB_PATH          (default: server/storage/opensin.db)
//   OPEN_SIN_CHAT_USERNAME         (default: admin)
//   OPEN_SIN_CHAT_PASSWORD         plaintext password to hash (default: Simone123)
//   OPEN_SIN_CHAT_HASHED_PASSWORD  pre-computed bcrypt hash to store
//   OPEN_SIN_CHAT_ROLE             (default: admin)
//   OPEN_SIN_CHAT_SQLITE3          (default: sqlite3)

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const scriptDir = __dirname;
const repoRoot = path.resolve(scriptDir, "..");

const DB_PATH = process.env.OPENSIN_CHAT_DB_PATH
  ? path.resolve(process.env.OPENSIN_CHAT_DB_PATH)
  : path.resolve(repoRoot, "server", "storage", "opensin.db");
const USERNAME = process.env.OPEN_SIN_CHAT_USERNAME || "admin";
const ROLE = process.env.OPEN_SIN_CHAT_ROLE || "admin";
const SQLITE3_BIN = process.env.OPEN_SIN_CHAT_SQLITE3 || "sqlite3";

function log(...args) {
  // eslint-disable-next-line no-console
  console.log("[enable-multi-user]", ...args);
}

function logError(...args) {
  // eslint-disable-next-line no-console
  console.error("[enable-multi-user]", ...args);
}

function loadBcrypt() {
  // Try the server node_modules first (most common when running from repo root).
  const candidates = [
    path.resolve(repoRoot, "server", "node_modules", "bcryptjs"),
    "bcryptjs",
  ];
  for (const candidate of candidates) {
    try {
      return candidate === "bcryptjs" ? require(candidate) : require(candidate);
    } catch {
      /* try next */
    }
  }
  throw new Error(
    "bcryptjs not found. Run 'yarn install' in the server directory or install bcryptjs."
  );
}

function validatePassword(password) {
  // Keep in sync with server/models/user.js::checkPasswordComplexity defaults.
  const min = Number(process.env.PASSWORDMINCHAR || 8);
  const max = Number(process.env.PASSWORDMAXCHAR || 250);
  if (password.length < min || password.length > max) {
    throw new Error(
      `Password must be between ${min} and ${max} characters (got ${password.length}).`
    );
  }
  return true;
}

function getHashedPassword() {
  if (process.env.OPEN_SIN_CHAT_HASHED_PASSWORD) {
    const hash = process.env.OPEN_SIN_CHAT_HASHED_PASSWORD;
    if (!hash.startsWith("$2")) {
      throw new Error(
        "OPEN_SIN_CHAT_HASHED_PASSWORD does not look like a bcrypt hash."
      );
    }
    return hash;
  }

  const password = process.env.OPEN_SIN_CHAT_PASSWORD || "Simone123";
  validatePassword(password);
  const bcrypt = loadBcrypt();
  return bcrypt.hashSync(password, 10);
}

function runSql(dbPath, sql) {
  log(`Running sqlite3 against ${dbPath}`);
  return execFileSync(SQLITE3_BIN, [dbPath], {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 30000,
  });
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    logError(`Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  // Check write access. If the DB is owned by another user, run with sudo.
  try {
    fs.accessSync(DB_PATH, fs.constants.R_OK | fs.constants.W_OK);
  } catch (err) {
    logError(`No write access to ${DB_PATH}. Run with sudo: ${err.message}`);
    process.exit(1);
  }

  const hashedPassword = getHashedPassword();
  log(`Target username: ${USERNAME}`);
  log(
    "Password source:",
    process.env.OPEN_SIN_CHAT_HASHED_PASSWORD
      ? "OPEN_SIN_CHAT_HASHED_PASSWORD (pre-computed)"
      : "OPEN_SIN_CHAT_PASSWORD (hashed locally with bcrypt cost 10)"
  );
  log(`Hashed password prefix: ${hashedPassword.slice(0, 7)}...`);

  // SQL notes:
  // 1. Enable multi-user mode first.
  // 2. Try to rename the existing single-user admin (id=1) to the target user.
  // 3. Upsert by username as a safety net (id=1 missing or row already exists).
  // 4. Reset any lockout state on the target user.
  const sql = `BEGIN TRANSACTION;

INSERT INTO system_settings (label, value)
VALUES ('multi_user_mode', 'true')
ON CONFLICT (label) DO UPDATE SET value = 'true';

UPDATE users
SET username = '${USERNAME}',
    password = '${hashedPassword}',
    role = '${ROLE}',
    suspended = 0,
    failed_login_count = 0,
    failed_login_last_at = NULL
WHERE id = 1;

INSERT INTO users (username, password, role)
VALUES ('${USERNAME}', '${hashedPassword}', '${ROLE}')
ON CONFLICT (username) DO UPDATE SET
    password = excluded.password,
    role = excluded.role,
    suspended = 0,
    failed_login_count = 0,
    failed_login_last_at = NULL;

COMMIT;
`;

  const result = runSql(DB_PATH, sql);
  if (result.trim()) {
    log("sqlite3 output:", result.trim());
  }

  // Verify the change.
  const verify = runSql(
    DB_PATH,
    `SELECT label, value FROM system_settings WHERE label = 'multi_user_mode';` +
      `SELECT id, username, role, substr(password,1,7) as password_prefix FROM users WHERE username = '${USERNAME}';`
  );
  log("Verification:\n" + verify);

  log("Done. Restart the OpenSIN-Chat container for the backend to pick up the change.");
}

main();
