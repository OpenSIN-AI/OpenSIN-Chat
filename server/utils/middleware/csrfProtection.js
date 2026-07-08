// SPDX-License-Identifier: MIT
// Purpose: CSRF protection middleware for mutating endpoints.
// The server already has an Origin-Check in app.js for production, but this
// middleware provides explicit CSRF token validation as defence-in-depth.
// Docs: server/utils/middleware/csrfProtection.js.doc.md
//
// P2 fix (#539): Added Redis backend support so CSRF tokens work across
// multiple server instances. Falls back to in-memory Map when Redis is
// not configured (single-instance deployments).
// Set CSRF_BACKEND=redis and REDIS_URL=... to enable.
const consoleLogger = require("../logger/console.js");
const crypto = require("crypto");

// In-memory store for CSRF tokens with TTL (fallback).
// Each token is tied to a session JWT hash and expires after 1 hour.
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_TRACKED_KEYS = 10000;
const tokens = new Map(); // tokenHash -> { jwtHash, expiresAt }

// Redis backend (optional, for horizontal scaling)
const CSRF_BACKEND = (process.env.CSRF_BACKEND || "memory").toLowerCase();
let redisClient = null;
let redisSet = null;
let redisGet = null;
let redisDel = null;

if (CSRF_BACKEND === "redis") {
  try {
    const IORedis = require("ioredis");
    redisClient = new IORedis(
      process.env.REDIS_URL || "redis://localhost:6379",
      { lazyConnect: true, maxRetriesPerRequest: 1 },
    );
    redisClient.connect().catch((err) => {
      consoleLogger.warn(
        `[csrfProtection] Redis connection failed: ${err.message}. Falling back to in-memory.`,
      );
    });
    redisSet = async function (key, value, ttlMs) {
      await redisClient.set(key, value, "PX", ttlMs);
    };
    redisGet = async function (key) {
      return await redisClient.get(key);
    };
    redisDel = async function (key) {
      await redisClient.del(key);
    };
  } catch (err) {
    consoleLogger.warn(
      `[csrfProtection] CSRF_BACKEND=redis requested but ioredis not installed: ${err.message}. Falling back to in-memory.`,
    );
    redisClient = null;
    redisSet = null;
    redisGet = null;
    redisDel = null;
  }
}

// Purge expired tokens periodically (max 10000 entries)
function purgeExpiredTokens() {
  const now = Date.now();
  for (const [key, entry] of tokens) {
    if (entry.expiresAt <= now) tokens.delete(key);
  }
  if (tokens.size > MAX_TRACKED_KEYS) {
    const overflow = tokens.size - MAX_TRACKED_KEYS;
    const keys = tokens.keys();
    for (let i = 0; i < overflow; i++) tokens.delete(keys.next().value);
  }
}

// Periodic purge every 10 minutes (only needed for in-memory backend)
if (!redisClient) {
  setInterval(purgeExpiredTokens, 10 * 60 * 1000).unref();
}

/**
 * Generate a CSRF token for the current session.
 * The token is cryptographically random and tied to the JWT hash.
 * @param {string} jwtHash - Hash of the session JWT
 * @returns {Promise<string>} The CSRF token
 */
async function generateCsrfToken(jwtHash) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const key = `csrf:${tokenHash}`;

  if (redisSet) {
    try {
      await redisSet(key, jwtHash, TOKEN_TTL_MS);
      return token;
    } catch (err) {
      consoleLogger.warn(
        `[csrfProtection] Redis set failed: ${err.message}. Falling back to in-memory.`,
      );
    }
  }

  // In-memory fallback
  purgeExpiredTokens();
  tokens.set(tokenHash, {
    jwtHash,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

/**
 * Validate a CSRF token against the session JWT hash.
 * @param {string} token - The CSRF token from X-CSRF-Token header
 * @param {string} jwtHash - Hash of the session JWT
 * @returns {Promise<boolean>}
 */
async function validateCsrfToken(token, jwtHash) {
  if (!token || !jwtHash) return false;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const key = `csrf:${tokenHash}`;

  if (redisGet) {
    try {
      const stored = await redisGet(key);
      if (stored === null) return false;
      return stored === jwtHash;
    } catch (err) {
      consoleLogger.warn(
        `[csrfProtection] Redis get failed: ${err.message}. Falling back to in-memory.`,
      );
    }
  }

  // In-memory fallback
  const entry = tokens.get(tokenHash);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) {
    tokens.delete(tokenHash);
    return false;
  }
  return entry.jwtHash === jwtHash;
}

/**
 * Express middleware that validates CSRF tokens for mutating requests.
 * Skips for GET/HEAD/OPTIONS and for API-key-authenticated requests
 * (API keys are sent via Authorization header and are not subject to CSRF).
 *
 * @param {import("express").Request} request
 * @param {import("express").Response} response
 * @param {import("express").NextFunction} next
 */
async function csrfProtection(request, response, next) {
  // Only protect mutating methods
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (!mutating) return next();

  // API key requests are not subject to CSRF (not auto-sent by browsers)
  if (response.locals?.apiKey) return next();

  // Skip in test mode
  if (
    process.env.NODE_ENV === "test" &&
    process.env.INTEGRATION_TEST === "true"
  ) {
    return next();
  }

  // Skip if not in production (development doesn't need CSRF)
  if (process.env.NODE_ENV !== "production") return next();

  // Get the JWT from Authorization header to compute hash
  const auth = request.header("Authorization");
  const token = auth ? auth.split(" ")[1] : null;
  if (!token) return next(); // Let auth middleware handle missing tokens

  // Get CSRF token from header or body
  const csrfToken = request.header("X-CSRF-Token") || request.body?._csrf;
  if (!csrfToken) {
    return response.status(403).json({
      error: "CSRF token missing. Include X-CSRF-Token header.",
      id: crypto.randomUUID(),
    });
  }

  // Compute JWT hash for comparison
  const jwtHash = crypto.createHash("sha256").update(token).digest("hex");
  if (!(await validateCsrfToken(csrfToken, jwtHash))) {
    consoleLogger.warn(
      `[csrfProtection] Invalid CSRF token from ${request.ip} on ${request.method} ${request.path}`,
    );
    return response.status(403).json({
      error: "Invalid or expired CSRF token.",
      id: crypto.randomUUID(),
    });
  }

  next();
}

module.exports = {
  csrfProtection,
  generateCsrfToken,
  validateCsrfToken,
};
