// SPDX-License-Identifier: MIT
// Purpose: Require either a valid API key, a valid session token, or single-user
// mode. In single-user mode the frontend may not have a session token yet, so
// we fall back to the same passthrough behavior as validatedRequest for that
// case. In multi-user mode a real credential is always required.
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
 * token. In single-user mode it falls back to the same passthrough behavior as
 * validatedRequest so the UI can still create the first API key. In multi-user
 * mode a real credential is always required.
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

  // Try session token. A valid JWT signed by JWT_SECRET is sufficient.
  // In multi-user mode it carries a user id; in single-user no-password mode
  // it carries { p: null }.
  const valid = decodeJWT(bearer);
  if (!valid || (valid.p === null && valid.id === null)) {
    return response.status(401).json({
      error: "No valid API key or session token found.",
    });
  }

  // In multi-user mode, a valid user id is required. A single-user JWT
  // (with `p` set but no `id`) must not be accepted — it has no user
  // identity and would grant access without a valid user context.
  if (multiUserMode && !valid.id) {
    return response.status(401).json({
      error: "No valid API key or session token found.",
    });
  }

  if (valid.id) {
    const user = await User.get({ id: valid.id });
    if (!user || user.suspended) {
      return response.status(401).json({
        error: "No valid API key or session token found.",
      });
    }
    response.locals.user = user;
  }

  return next();
}

module.exports = {
  requireApiKeyOrSession,
  validateSessionToken,
};
