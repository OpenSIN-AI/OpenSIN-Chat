// SPDX-License-Identifier: MIT
// Purpose: Ensure `JWT_SECRET`, `SIG_KEY`, and `SIG_SALT` are set.
//          In dev, auto-generates JWT_SECRET for convenience.
//          In prod, exits hard if any secret is missing or weak.
// Docs: ensureJwtSecret.doc.md

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const LOG_PREFIX = "\x1b[32m[JWT Secret]\x1b[0m";
const WEAK_VALUES = new Set([
  "my-random-string-for-seeding",
  "change-me-please",
  "passphrase",
  "salt",
  "hunter2",
]);

/**
 * Resolve the active .env file path based on `NODE_ENV`.
 * Mirrors the loader at the top of `server/index.js`:
 *   - development → `.env.${NODE_ENV}` (e.g. `.env.development`)
 *   - else        → `.env`
 *
 * @returns {string|null} Absolute path or null if it cannot be determined.
 */
function resolveEnvFile() {
  const candidates =
    process.env.NODE_ENV === "development" && process.env.NODE_ENV
      ? [`.env.${process.env.NODE_ENV}`, ".env"]
      : [".env"];
  for (const name of candidates) {
    const p = path.resolve(process.cwd(), name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function isProd() {
  return process.env.NODE_ENV === "production";
}

/**
 * Idempotent. In development: auto-generates JWT_SECRET for convenience.
 * In production: REQUIRES a strong JWT_SECRET to be set, otherwise exits hard.
 */
function ensureJwtSecret() {
  const current = process.env.JWT_SECRET;
  const isStrong = current && current.length >= 32 && !WEAK_VALUES.has(current);

  if (isStrong) return;

  if (isProd()) {
    console.error(
      `${LOG_PREFIX} FATAL: JWT_SECRET is missing or weak in production. ` +
        `Set a stable secret (openssl rand -hex 24) before starting.`,
    );
    process.exit(1);
  }

  const secret = crypto.randomBytes(32).toString("hex");
  const envFile = resolveEnvFile();

  if (envFile) {
    let content = "";
    try {
      content = fs.readFileSync(envFile, "utf8");
    } catch {
      // file unreadable; fall through and just set the env var
    }
    const lines = content
      .split(/\r?\n/)
      .filter((l) => !/^JWT_SECRET\s*=/.test(l));
    lines.push(`JWT_SECRET='${secret}'`);
    try {
      fs.writeFileSync(envFile, lines.join("\n") + "\n");
      try {
        fs.chmodSync(envFile, 0o600);
      } catch (e) {
        console.warn(
          `${LOG_PREFIX} Could not chmod ${envFile} to 0o600: ${e.message}`,
        );
      }
      console.log(
        `${LOG_PREFIX} Generated new JWT_SECRET and wrote it to ${path.basename(envFile)}`,
      );
    } catch (e) {
      console.warn(
        `${LOG_PREFIX} Could not persist JWT_SECRET to ${envFile}: ${e.message}. Using in-memory value for this session.`,
      );
    }
  } else {
    console.log(
      `${LOG_PREFIX} Generated in-memory JWT_SECRET (no .env file found to persist to)`,
    );
  }

  process.env.JWT_SECRET = secret;
}

/**
 * Validate the encryption secrets (SIG_KEY / SIG_SALT) used to encrypt stored
 * provider API keys. In production these MUST be present and strong, otherwise
 * stored secrets are trivially decryptable. Dev: warn only.
 */
function ensureEncryptionSecrets() {
  const checks = [
    ["SIG_KEY", process.env.SIG_KEY],
    ["SIG_SALT", process.env.SIG_SALT],
  ];
  const problems = checks.filter(
    ([, v]) => !v || v.length < 32 || WEAK_VALUES.has(v),
  );
  if (problems.length === 0) return;

  const names = problems.map(([n]) => n).join(", ");
  if (isProd()) {
    console.error(
      `${LOG_PREFIX} FATAL: ${names} missing or weak in production. ` +
        `Set with: openssl rand -hex 32`,
    );
    process.exit(1);
  }
  console.warn(
    `${LOG_PREFIX} WARNING: ${names} weak/missing. Fine for local dev, ` +
      `but stored API keys are NOT securely encrypted. Set strong values before deploying.`,
  );
}

module.exports = ensureJwtSecret;
module.exports.ensureJwtSecret = ensureJwtSecret;
module.exports.ensureEncryptionSecrets = ensureEncryptionSecrets;
