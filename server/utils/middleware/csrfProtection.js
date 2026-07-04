// SPDX-License-Identifier: MIT
// Purpose: CSRF protection middleware for mutating endpoints.
// The server already has an Origin-Check in app.js for production, but this
// middleware provides explicit CSRF token validation as defence-in-depth.
// Docs: server/utils/middleware/csrfProtection.js.doc.md
const consoleLogger = require("../logger/console.js");
const crypto = require("crypto");

// In-memory store for CSRF tokens with TTL.
// Each token is tied to a session JWT hash and expires after 1 hour.
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const tokens = new Map(); // tokenHash -> { jwtHash, expiresAt }

// Purge expired tokens periodically (max 10000 entries)
function purgeExpiredTokens() {
  const now = Date.now();
  for (const [key, entry] of tokens) {
    if (entry.expiresAt <= now) tokens.delete(key);
  }
  if (tokens.size > 10000) {
    const overflow = tokens.size - 10000;
    const keys = tokens.keys();
    for (let i = 0; i < overflow; i++) tokens.delete(keys.next().value);
  }
}

// Periodic purge every 10 minutes
setInterval(purgeExpiredTokens, 10 * 60 * 1000).unref();

/**
 * Generate a CSRF token for the current session.
 * The token is cryptographically random and tied to the JWT hash.
 * @param {string} jwtHash - Hash of the session JWT
 * @returns {string} The CSRF token
 */
function generateCsrfToken(jwtHash) {
  purgeExpiredTokens();
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
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
 * @returns {boolean}
 */
function validateCsrfToken(token, jwtHash) {
  if (!token || !jwtHash) return false;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
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
function csrfProtection(request, response, next) {
  // Only protect mutating methods
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (!mutating) return next();

  // API key requests are not subject to CSRF (not auto-sent by browsers)
  if (response.locals?.apiKey) return next();

  // Skip in test mode
  if (process.env.NODE_ENV === "test" && process.env.INTEGRATION_TEST === "true") {
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
  if (!validateCsrfToken(csrfToken, jwtHash)) {
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
