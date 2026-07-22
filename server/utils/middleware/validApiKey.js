// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const { ApiKey } = require("../../models/apiKeys");
const { SystemSettings } = require("../../models/systemSettings");

function extractBearerToken(request) {
  const auth = request.header("Authorization");
  if (typeof auth !== "string") return null;
  return auth.match(/^Bearer\s+([^\s]+)$/i)?.[1] ?? null;
}

/**
 * Validates the Bearer API key on developer API routes.
 *
 * Security telemetry: failed attempts are logged with client IP and path
 * (never the attempted key itself) so brute-force attempts are visible in
 * logs and can be alerted on / fed into fail2ban-style tooling.
 */
async function validApiKey(request, response, next) {
  const multiUserMode = await SystemSettings.isMultiUserMode();
  response.locals.multiUserMode = multiUserMode;

  // When running the integration suite in tests/ we allow the developer API
  // routes to be exercised without a real API key. This is gated by the
  // INTEGRATION_TEST env var so the unit tests for this middleware in Jest
  // (which also run in NODE_ENV=test) still validate the real behavior.
  if (
    process.env.NODE_ENV === "test" &&
    process.env.INTEGRATION_TEST === "true"
  ) {
    next();
    return;
  }

  const bearerKey = extractBearerToken(request);
  if (!bearerKey) {
    logFailedAuth(request, "missing_bearer");
    response.status(403).json({
      error: "No valid api key found.",
    });
    return;
  }

  const apiKey = await ApiKey.get({ secret: bearerKey });
  if (!apiKey) {
    logFailedAuth(request, "invalid_key");
    response.status(403).json({
      error: "No valid api key found.",
    });
    return;
  }

  // In multi-user mode, verify the key's creator is still a valid,
  // non-suspended user. This mirrors the browser-extension API key
  // middleware and prevents deleted/suspended users from accessing
  // the developer API with orphaned keys.
  if (multiUserMode) {
    if (!apiKey.createdBy) {
      logFailedAuth(request, "orphaned_key");
      response.status(403).json({
        error: "No valid api key found.",
      });
      return;
    }
    const { User } = require("../../models/user");
    const user = await User.get({ id: apiKey.createdBy });
    if (!user) {
      logFailedAuth(request, "deleted_user");
      response.status(403).json({
        error: "No valid api key found.",
      });
      return;
    }
    if (user.suspended) {
      logFailedAuth(request, "suspended_user");
      response.status(401).json({
        error: "User is suspended from system",
      });
      return;
    }
    response.locals.user = user;
  }

  // Expose the validated API key (secret already stripped by ApiKey.get)
  // so downstream route handlers can scope responses to the key creator.
  response.locals.apiKey = apiKey;
  next();
}

/**
 * Validates the Bearer API key AND requires the key owner to have admin role.
 * Extends validApiKey with a role check when multi-user mode is enabled.
 */
async function validAdminApiKey(request, response, next) {
  const multiUserMode = await SystemSettings.isMultiUserMode();
  response.locals.multiUserMode = multiUserMode;

  if (
    process.env.NODE_ENV === "test" &&
    process.env.INTEGRATION_TEST === "true"
  ) {
    next();
    return;
  }

  const bearerKey = extractBearerToken(request);
  if (!bearerKey) {
    logFailedAuth(request, "missing_bearer");
    response.status(403).json({
      error: "No valid api key found.",
    });
    return;
  }

  const apiKey = await ApiKey.get({ secret: bearerKey });
  if (!apiKey) {
    logFailedAuth(request, "invalid_key");
    response.status(403).json({
      error: "No valid api key found.",
    });
    return;
  }

  if (multiUserMode) {
    // In multi-user mode, admin API keys must have a valid creator with
    // admin role. If createdBy is null (e.g. creator was deleted), the key
    // is orphaned and must NOT be granted admin access.
    if (!apiKey.createdBy) {
      response.status(403).json({
        error: "Admin access required.",
      });
      return;
    }
    const { User } = require("../../models/user");
    const user = await User.get({ id: apiKey.createdBy });
    if (!user || user.suspended || user.role !== "admin") {
      logFailedAuth(
        request,
        !user ? "deleted_user" : user.suspended ? "suspended_user" : "not_admin",
      );
      response.status(403).json({
        error: "Admin access required.",
      });
      return;
    }
    response.locals.user = user;
  }

  response.locals.apiKey = apiKey;
  next();
}

/**
 * Log a failed API authentication attempt. Never logs the attempted
 * credential — only IP, method, path, and failure reason.
 * @param {import("express").Request} request
 * @param {"missing_bearer"|"invalid_key"|"orphaned_key"|"deleted_user"|"suspended_user"|"not_admin"} reason
 */
function logFailedAuth(request, reason) {
  try {
    consoleLogger.warn(
      `\x1b[33m[AUTH-FAIL]\x1b[0m reason=${reason} ip=${request.ip || "unknown"} ${request.method} ${request.originalUrl || request.path}`,
    );
  } catch {
    /* logging must never break auth flow */
  }
}

module.exports = {
  validApiKey,
  validAdminApiKey,
};
