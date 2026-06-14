// SPDX-License-Identifier: MIT
const { ApiKey } = require("../../models/apiKeys");
const { SystemSettings } = require("../../models/systemSettings");

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

  const auth = request.header("Authorization");
  const bearerKey = auth ? auth.split(" ")[1] : null;
  if (!bearerKey) {
    logFailedAuth(request, "missing_bearer");
    response.status(403).json({
      error: "No valid api key found.",
    });
    return;
  }

  if (!(await ApiKey.get({ secret: bearerKey }))) {
    logFailedAuth(request, "invalid_key");
    response.status(403).json({
      error: "No valid api key found.",
    });
    return;
  }

  next();
}

/**
 * Log a failed API authentication attempt. Never logs the attempted
 * credential — only IP, method, path, and failure reason.
 * @param {import("express").Request} request
 * @param {"missing_bearer"|"invalid_key"} reason
 */
function logFailedAuth(request, reason) {
  try {
    // eslint-disable-next-line no-console
    console.warn(
      `\x1b[33m[AUTH-FAIL]\x1b[0m reason=${reason} ip=${request.ip || "unknown"} ${request.method} ${request.originalUrl || request.path}`,
    );
  } catch {
    /* logging must never break auth flow */
  }
}

module.exports = {
  validApiKey,
};
