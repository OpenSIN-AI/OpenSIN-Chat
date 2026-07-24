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

function extractBearerToken(request) {
  const auth = request.header("Authorization");
  if (typeof auth !== "string") return null;
  return auth.match(/^Bearer\s+([^\s]+)$/i)?.[1] ?? null;
}

function safeDecodeJWT(token) {
  try {
    return decodeJWT(token);
  } catch {
    return null;
  }
}

/**
 * Validate the session JWT from the Authorization header.
 * @param {import("express").Request} request
 * @returns {Promise<{id: number, username: string, role: string}|null>}
 */
async function validateSessionToken(request) {
  const token = extractBearerToken(request);
  if (!token) return null;

  const valid = safeDecodeJWT(token);
  const userId = Number(valid?.id);
  if (!Number.isSafeInteger(userId) || userId <= 0) return null;

  const user = await User.get({ id: userId });
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

  const bearer = extractBearerToken(request);
  if (!bearer) {
    return response.status(401).json({
      error: "No valid API key or session token found.",
    });
  }

  // Try API key first.
  const apiKey = await ApiKey.get({ secret: bearer });
  if (apiKey) {
    if (multiUserMode) {
      if (!apiKey.createdBy) {
        return response.status(401).json({
          error: "No valid API key or session token found.",
        });
      }
      const owner = await User.get({ id: apiKey.createdBy });
      if (!owner || owner.suspended) {
        return response.status(401).json({
          error: "No valid API key or session token found.",
        });
      }
      response.locals.user = owner;
    }
    response.locals.apiKey = apiKey;
    return next();
  }

  // Try a session token. Accept only tokens carrying a recognized identity or
  // encrypted single-user credential claim; unrelated signed JWTs are rejected.
  const valid = safeDecodeJWT(bearer);
  const userId = Number(valid?.id);
  const hasUserIdentity = Number.isSafeInteger(userId) && userId > 0;
  const hasSingleUserCredential =
    typeof valid?.p === "string" && valid.p.length > 0;
  if (!valid || (!hasUserIdentity && !hasSingleUserCredential)) {
    return response.status(401).json({
      error: "No valid API key or session token found.",
    });
  }

  // In multi-user mode, a valid user id is required. A single-user JWT
  // (with `p` set but no `id`) must not be accepted — it has no user
  // identity and would grant access without a valid user context.
  if (multiUserMode && !hasUserIdentity) {
    return response.status(401).json({
      error: "No valid API key or session token found.",
    });
  }

  if (hasUserIdentity) {
    const user = await User.get({ id: userId });
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
