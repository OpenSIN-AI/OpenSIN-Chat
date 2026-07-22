#!/usr/bin/env node
// SPDX-License-Identifier: MIT
"use strict";

/**
 * Explicit maintenance utility for enabling multi-user mode.
 *
 * Security properties:
 * - No default password
 * - Exactly one explicit password source is required
 * - Parameterized SQL only
 * - Username and role validation match the application model
 * - Plaintext passwords are checked and hashed locally with bcrypt cost 12
 * - Passwords and hashes are never printed
 */

const fs = require("node:fs");
const path = require("node:path");

const scriptDir = __dirname;
const repoRoot = path.resolve(scriptDir, "..");

const USERNAME_PATTERN = /^[a-z][a-z0-9._@-]*$/;
const VALID_ROLES = new Set(["default", "admin", "manager"]);
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function log(...args) {
  console.log("[enable-multi-user]", ...args);
}

function loadServerDependency(name) {
  const candidates = [
    path.resolve(repoRoot, "server", "node_modules", name),
    name,
  ];

  let lastError;
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Dependency "${name}" was not found. Run "yarn install --frozen-lockfile" ` +
      `inside the server directory first. Original error: ${lastError?.message}`,
  );
}

function validateUsername(rawUsername) {
  const username = String(rawUsername || "").trim();

  if (username.length < 2 || username.length > 32) {
    throw new Error("Username must contain between 2 and 32 characters.");
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error(
      "Username must start with a lowercase letter and may only contain " +
        "lowercase letters, digits, periods, underscores, @ signs, and hyphens.",
    );
  }

  return username;
}

function validateRole(rawRole) {
  const role = String(rawRole || "admin").trim();

  if (!VALID_ROLES.has(role)) {
    throw new Error(
      `Invalid role "${role}". Allowed roles: ${[...VALID_ROLES].join(", ")}.`,
    );
  }

  return role;
}

function validateBcryptHash(hash) {
  if (!BCRYPT_HASH_PATTERN.test(String(hash || ""))) {
    throw new Error(
      "OPEN_SIN_CHAT_HASHED_PASSWORD must contain a complete bcrypt hash.",
    );
  }

  return hash;
}

function passwordComplexityOptions(env = process.env) {
  const configuredMin = Number(env.PASSWORDMINCHAR || 8);

  return {
    min: Math.max(12, Number.isFinite(configuredMin) ? configuredMin : 12),
    max: Number(env.PASSWORDMAXCHAR || 250),
    lowerCase: Number(env.PASSWORDLOWERCASE || 0),
    upperCase: Number(env.PASSWORDUPPERCASE || 0),
    numeric: Number(env.PASSWORDNUMERIC || 0),
    symbol: Number(env.PASSWORDSYMBOL || 0),
    requirementCount: Number(env.PASSWORDREQUIREMENTS || 0),
  };
}

function resolvePasswordHash(env = process.env, dependencies = {}) {
  const plaintext =
    typeof env.OPEN_SIN_CHAT_PASSWORD === "string"
      ? env.OPEN_SIN_CHAT_PASSWORD
      : "";

  const suppliedHash =
    typeof env.OPEN_SIN_CHAT_HASHED_PASSWORD === "string"
      ? env.OPEN_SIN_CHAT_HASHED_PASSWORD.trim()
      : "";

  if (!plaintext && !suppliedHash) {
    throw new Error(
      "Missing credentials. Set exactly one of OPEN_SIN_CHAT_PASSWORD or " +
        "OPEN_SIN_CHAT_HASHED_PASSWORD.",
    );
  }

  if (plaintext && suppliedHash) {
    throw new Error(
      "Set only one credential source: OPEN_SIN_CHAT_PASSWORD or " +
        "OPEN_SIN_CHAT_HASHED_PASSWORD, not both.",
    );
  }

  if (suppliedHash) {
    return validateBcryptHash(suppliedHash);
  }

  const passwordComplexity =
    dependencies.passwordComplexity ||
    loadServerDependency("joi-password-complexity");

  const complexityResult = passwordComplexity(
    passwordComplexityOptions(env),
    "password",
  ).validate(plaintext);

  if (complexityResult.error) {
    const message = complexityResult.error.details
      .map((detail) => detail.message)
      .join(", ");

    throw new Error(`Password does not meet the configured policy: ${message}`);
  }

  const bcrypt = dependencies.bcrypt || loadServerDependency("bcryptjs");
  return bcrypt.hashSync(plaintext, 12);
}

function resolveDatabasePath(env = process.env) {
  const requestedPath =
    env.OPENSIN_CHAT_DB_PATH ||
    path.resolve(repoRoot, "server", "storage", "opensin.db");

  const absolutePath = path.resolve(requestedPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Database not found at ${absolutePath}.`);
  }

  fs.accessSync(absolutePath, fs.constants.R_OK | fs.constants.W_OK);
  return fs.realpathSync(absolutePath);
}

function runMigration({
  env = process.env,
  dependencies = {},
} = {}) {
  const databasePath = resolveDatabasePath(env);
  const username = validateUsername(env.OPEN_SIN_CHAT_USERNAME || "admin");
  const role = validateRole(env.OPEN_SIN_CHAT_ROLE || "admin");
  const passwordHash = resolvePasswordHash(env, dependencies);

  const Database =
    dependencies.Database || loadServerDependency("better-sqlite3");

  const database = new Database(databasePath, {
    fileMustExist: true,
  });

  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 30000");

  try {
    const findByUsername = database.prepare(
      "SELECT id FROM users WHERE username = ? LIMIT 1",
    );

    const findInitialUser = database.prepare(
      "SELECT id FROM users WHERE id = 1 LIMIT 1",
    );

    const updateUser = database.prepare(`
      UPDATE users
      SET username = ?,
          password = ?,
          role = ?,
          suspended = 0,
          failed_login_count = 0,
          failed_login_last_at = NULL
      WHERE id = ?
    `);

    const insertUser = database.prepare(`
      INSERT INTO users (username, password, role)
      VALUES (?, ?, ?)
    `);

    const enableMultiUserMode = database.prepare(`
      INSERT INTO system_settings (label, value)
      VALUES ('multi_user_mode', 'true')
      ON CONFLICT (label) DO UPDATE SET value = excluded.value
    `);

    const migrate = database.transaction(() => {
      const existingTarget = findByUsername.get(username);
      const initialUser = findInitialUser.get();

      let userId;

      if (existingTarget) {
        userId = Number(existingTarget.id);
        updateUser.run(username, passwordHash, role, userId);
      } else if (initialUser) {
        userId = Number(initialUser.id);
        updateUser.run(username, passwordHash, role, userId);
      } else {
        const insertResult = insertUser.run(username, passwordHash, role);
        userId = Number(insertResult.lastInsertRowid);
      }

      enableMultiUserMode.run();
      return userId;
    });

    const userId = migrate();

    const mode = database
      .prepare(
        "SELECT value FROM system_settings WHERE label = 'multi_user_mode'",
      )
      .get();

    const user = database
      .prepare(
        "SELECT id, username, role, suspended FROM users WHERE id = ? LIMIT 1",
      )
      .get(userId);

    if (mode?.value !== "true") {
      throw new Error("Verification failed: multi-user mode was not enabled.");
    }

    if (!user || user.username !== username || user.role !== role) {
      throw new Error("Verification failed: administrator was not updated.");
    }

    return {
      databasePath,
      userId,
      username: user.username,
      role: user.role,
      multiUserMode: true,
    };
  } finally {
    database.close();
  }
}

function main() {
  const result = runMigration();

  log(`Database: ${result.databasePath}`);
  log(`Administrator: ${result.username} (${result.role})`);
  log("Multi-user mode: enabled");
  log("No credential material was printed.");
  log("Restart the application container before accepting new requests.");
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[enable-multi-user] ERROR: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  BCRYPT_HASH_PATTERN,
  passwordComplexityOptions,
  resolveDatabasePath,
  resolvePasswordHash,
  runMigration,
  validateBcryptHash,
  validateRole,
  validateUsername,
};
