// Purpose: Ensure `JWT_SECRET` is set in the environment.
//          If the user has not configured one in `.env` (or `.env.development`),
//          this generates a cryptographically secure 32-byte hex string, writes
//          it back to the env file, and sets `process.env.JWT_SECRET`.
// Docs: ensureJwtSecret.doc.md

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const LOG_PREFIX = "\x1b[32m[JWT Secret]\x1b[0m";

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

/**
 * Idempotent: if `JWT_SECRET` is set, this is a no-op. Otherwise, generates
 * a 32-byte hex secret, writes it into the active .env file, and exports it
 * to `process.env.JWT_SECRET` so the rest of the server can use it.
 *
 * Safe to call early in the boot sequence. Should be called BEFORE any code
 * that depends on JWT signing (i.e. before requiring `http/index.js`).
 */
function ensureJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) return;

  const secret = crypto.randomBytes(32).toString("hex");
  const envFile = resolveEnvFile();

  if (envFile) {
    // Read current file, strip any prior JWT_SECRET line, append new one.
    let content = "";
    try {
      content = fs.readFileSync(envFile, "utf8");
    } catch {
      // file unreadable; fall through and just set the env var
    }
    const lines = content.split(/\r?\n/).filter(
      (l) => !/^JWT_SECRET\s*=/.test(l)
    );
    lines.push(`JWT_SECRET='${secret}'`);
    try {
      fs.writeFileSync(envFile, lines.join("\n") + "\n");
      console.log(
        `${LOG_PREFIX} Generated new JWT_SECRET and wrote it to ${path.basename(envFile)}`
      );
    } catch (e) {
      console.warn(
        `${LOG_PREFIX} Could not persist JWT_SECRET to ${envFile}: ${e.message}. Using in-memory value for this session.`
      );
    }
  } else {
    console.log(
      `${LOG_PREFIX} Generated in-memory JWT_SECRET (no .env file found to persist to)`
    );
  }

  process.env.JWT_SECRET = secret;
}

module.exports = ensureJwtSecret;
