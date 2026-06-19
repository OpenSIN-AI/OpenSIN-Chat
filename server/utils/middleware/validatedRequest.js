// SPDX-License-Identifier: MIT
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
    _cachedAuthTokenHash = bcrypt.hashSync(process.env.AUTH_TOKEN, 10);
  }
  return _cachedAuthTokenHash;
}

function invalidateAuthTokenHash() {
  _cachedAuthTokenHash = null;
}

const MULTI_USER_MODE_TTL_MS = 60 * 1000;
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
  const multiUserMode = await getCachedMultiUserMode();
  response.locals.multiUserMode = multiUserMode;
  if (multiUserMode)
    return await validateMultiUserRequest(request, response, next);

  if (
    (process.env.NODE_ENV ?? "").toLowerCase() === "production" &&
    (!process.env.AUTH_TOKEN || !process.env.JWT_SECRET)
  ) {
    const id =
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    console.error(
      `[validatedRequest FATAL id=${id}] auth misconfigured in production. AUTH_TOKEN=${!!process.env.AUTH_TOKEN} JWT_SECRET=${!!process.env.JWT_SECRET}`,
    );
    return response.status(503).json({
      error: "Server is misconfigured. Please contact the operator.",
      id,
    });
  }

  // When in development or test mode passthrough auth token for ease of development.
  // Or if the user simply did not set an Auth token or JWT Secret
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test" ||
    !process.env.AUTH_TOKEN ||
    !process.env.JWT_SECRET
  ) {
    // In test mode, provide a real user context so integration tests can
    // exercise endpoints that call userFromSession without a full auth flow.
    // Creating/looking up a stable test user ensures foreign-key constraints
    // in tables like system_prompt_variables are satisfied.
    if (process.env.NODE_ENV === "test") {
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

  const auth = request.header("Authorization");
  const token = auth ? auth.split(" ")[1] : null;

  if (!token) {
    response.status(401).json({
      error: "No auth token found.",
    });
    return;
  }

  const bcrypt = require("bcryptjs");
  const { p } = decodeJWT(token);

  if (p === null || !/\w{32}:\w{32}/.test(p)) {
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
    const auth = request.header("Authorization");
    const token = auth ? auth.split(" ")[1] : null;

    if (!token) {
      response.status(401).json({
        error: "No auth token found.",
      });
      return;
    }

    const valid = decodeJWT(token);
    if (!valid || !valid.id) {
      response.status(401).json({
        error: "Invalid auth token.",
      });
      return;
    }

    const user = await User.get({ id: valid.id });
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
    console.error(e.message, e);
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
