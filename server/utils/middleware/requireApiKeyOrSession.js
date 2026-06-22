// SPDX-License-Identifier: MIT
// Purpose: Require either a valid API key or a valid session token.
// Docs: server/utils/middleware/requireApiKeyOrSession.js.doc.md
const { ApiKey } = require("../../models/apiKeys");
const { SystemSettings } = require("../../models/systemSettings");
const { decodeJWT } = require("../http");
const { User } = require("../../models/user");

/**
 * Validate the session JWT from the Authorization header.
 * @param {import("express").Request} request
 * @returns {Promise<{id: number, username: string, role: string}|null>}
 */
async function validateSessionToken(request) {
  const auth = request.header("Authorization");
  const token = auth ? auth.split(" ")[1] : null;
  if (!token) return null;

  const valid = decodeJWT(token);
  if (!valid || !valid.id) return null;

  const user = await User.get({ id: valid.id });
  if (!user || user.suspended) return null;

  return user;
}

/**
 * Express middleware that accepts either a valid API key or a valid session
 * token. This is used for endpoints that are called both by the frontend UI
 * (session auth) and by external scripts (API key auth).
 *
 * @param {import("express").Request} request
 * @param {import("express").Response} response
 * @param {import("express").NextFunction} next
 */
async function requireApiKeyOrSession(request, response, next) {
  // When running the integration suite in tests/ we allow the developer API
  // routes to be exercised without a real API key.
  if (
    process.env.NODE_ENV === "test" &&
    process.env.INTEGRATION_TEST === "true"
  ) {
    return next();
  }

  const multiUserMode = await SystemSettings.isMultiUserMode();
  response.locals.multiUserMode = multiUserMode;

  const auth = request.header("Authorization");
  const bearer = auth ? auth.split(" ")[1] : null;
  if (!bearer) {
    return response.status(401).json({
      error: "No valid API key or session token found.",
    });
  }

  // Try API key first.
  const apiKey = await ApiKey.get({ secret: bearer });
  if (apiKey) {
    response.locals.apiKey = apiKey;
    return next();
  }

  // Try session token.
  const user = await validateSessionToken(request);
  if (user) {
    response.locals.user = user;
    return next();
  }

  return response.status(401).json({
    error: "No valid API key or session token found.",
  });
}

module.exports = {
  requireApiKeyOrSession,
  validateSessionToken,
};
