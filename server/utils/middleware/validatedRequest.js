// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const { SystemSettings } = require("../../models/systemSettings");
const { User } = require("../../models/user");
const { EncryptionManager } = require("../EncryptionManager");
const { decodeJWT } = require("../http");
const EncryptionMgr = new EncryptionManager();

// Cache the bcrypt hash of AUTH_TOKEN to avoid CPU-blocking hashSync on every request.
let _cachedAuthTokenHash = null;
function getAuthTokenHash() {
  if (!_cachedAuthTokenHash) {
    const bcrypt = require("bcryptjs");
    _cachedAuthTokenHash = bcrypt.hashSync(process.env.AUTH_TOKEN, 12);
  }
  return _cachedAuthTokenHash;
}

function invalidateAuthTokenHash() {
  _cachedAuthTokenHash = null;
}

function extractBearerToken(request) {
  const auth = request.header("Authorization");
  if (typeof auth !== "string") return null;
  const match = auth.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

function safeDecodeJWT(token) {
  if (!token) return null;
  try {
    return decodeJWT(token);
  } catch {
    return null;
  }
}

function envFlag(name) {
  return ["1", "true", "yes", "on"].includes(
    String(process.env[name] ?? "")
      .trim()
      .toLowerCase(),
  );
}

// Short TTL: after enable-multi-user the cache is also explicitly invalidated.
// Keep a small positive TTL for request fan-out, not a 60s ACL window.
const MULTI_USER_MODE_TTL_MS = 5 * 1000;
let cachedMultiUserMode = { value: null, expiresAt: 0 };
async function getCachedMultiUserMode() {
  if (
    Date.now() < cachedMultiUserMode.expiresAt &&
    cachedMultiUserMode.value !== null
  ) {
    return cachedMultiUserMode.value;
  }
  const value = await SystemSettings.isMultiUserMode();
  cachedMultiUserMode = {
    value,
    expiresAt: Date.now() + MULTI_USER_MODE_TTL_MS,
  };
  return value;
}

function invalidateMultiUserModeCache() {
  cachedMultiUserMode = { value: null, expiresAt: 0 };
}

async function validatedRequest(request, response, next) {
  const integrationTestMode =
    process.env.NODE_ENV === "test" &&
    process.env.INTEGRATION_TEST === "true";
  const multiUserMode = await getCachedMultiUserMode();
  response.locals.multiUserMode = multiUserMode;
  if (multiUserMode)
    return await validateMultiUserRequest(request, response, next);

  const isProduction =
    (process.env.NODE_ENV ?? "").toLowerCase() === "production";
  const unauthenticatedSingleUserAllowed = envFlag(
    "ALLOW_UNAUTHENTICATED_SINGLE_USER",
  );

  // Defense in depth for callers that construct the app without the normal
  // boot checks. Production must have a signing secret and either an access
  // password or an explicit opt-in to unauthenticated single-user mode.
  if (
    isProduction &&
    (!process.env.JWT_SECRET ||
      (!process.env.AUTH_TOKEN && !unauthenticatedSingleUserAllowed))
  ) {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    consoleLogger.error(
      `[validatedRequest FATAL id=${id}] auth misconfigured in production. AUTH_TOKEN=${!!process.env.AUTH_TOKEN} JWT_SECRET=${!!process.env.JWT_SECRET}`,
    );
    return response.status(503).json({
      error: "Server is misconfigured. Please contact the operator.",
      id,
    });
  }

  // Development, the explicit integration harness and a deliberately enabled
  // unauthenticated single-user deployment may bypass password validation.
  // A bare NODE_ENV=test must not disable auth in non-CI environments.
  if (
    process.env.NODE_ENV === "development" ||
    integrationTestMode ||
    (!process.env.AUTH_TOKEN && unauthenticatedSingleUserAllowed) ||
    !process.env.JWT_SECRET
  ) {
    // In test mode, provide a real user context so integration tests can
    // exercise endpoints that call userFromSession without a full auth flow.
    // Creating/looking up a stable test user ensures foreign-key constraints
    // in tables like system_prompt_variables are satisfied.
    if (integrationTestMode) {
      let testUser = await User.get({ username: "integration.test.user" });
      if (!testUser) {
        try {
          const result = await User.create({
            username: "integration.test.user",
            password: "integration-test-password",
            role: "admin",
          });
          testUser = result.user;
        } catch {
          // User.create race condition in parallel test runs — silently fall back to existing user.
          testUser = await User.get({ username: "integration.test.user" });
        }
      }
      response.locals.user = {
        id: testUser?.id || 1,
        username: testUser?.username || "test",
        role: testUser?.role || "admin",
      };
    }
    next();
    return;
  }

  if (!process.env.AUTH_TOKEN) {
    response.status(401).json({
      error: "You need to set an AUTH_TOKEN environment variable.",
    });
    return;
  }

  const token = extractBearerToken(request);

  if (!token) {
    response.status(401).json({
      error: "No auth token found.",
    });
    return;
  }

  const bcrypt = require("bcryptjs");
  const decoded = safeDecodeJWT(token);
  const p = decoded?.p;

  if (p === null || typeof p !== "string" || p.length < 16) {
    response.status(401).json({
      error: "Token expired or failed validation.",
    });
    return;
  }

  if (!/^[A-Za-z0-9+/=_-]+$/.test(p)) {
    response.status(401).json({
      error: "Token expired or failed validation.",
    });
    return;
  }

  const decrypted = EncryptionMgr.decrypt(p);
  if (!decrypted) {
    response.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (!bcrypt.compareSync(decrypted, getAuthTokenHash())) {
    response.status(401).json({
      error: "Invalid auth credentials.",
    });
    return;
  }

  next();
}

async function validateMultiUserRequest(request, response, next) {
  try {
    const token = extractBearerToken(request);

    if (!token) {
      response.status(401).json({
        error: "No auth token found.",
      });
      return;
    }

    const valid = safeDecodeJWT(token);
    const userId = Number(valid?.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      response.status(401).json({
        error: "Invalid auth token.",
      });
      return;
    }

    const user = await User.get({ id: userId });
    if (!user) {
      response.status(401).json({
        error: "Invalid auth for user.",
      });
      return;
    }

    if (user.suspended) {
      response.status(401).json({
        error: "User is suspended from system",
      });
      return;
    }

    response.locals.user = user;
    next();
  } catch (e) {
    consoleLogger.error(e.message, e);
    response.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  validatedRequest,
  invalidateAuthTokenHash,
  getAuthTokenHash,
  invalidateMultiUserModeCache,
  getCachedMultiUserMode,
};
