// SPDX-License-Identifier: MIT
const {
  BrowserExtensionApiKey,
} = require("../../models/browserExtensionApiKey");
const { SystemSettings } = require("../../models/systemSettings");
const { User } = require("../../models/user");

async function validBrowserExtensionApiKey(request, response, next) {
  const multiUserMode = await SystemSettings.isMultiUserMode();
  response.locals.multiUserMode = multiUserMode;

  const auth = request.header("Authorization");
  const bearerKey = auth ? auth.split(" ")[1] : null;
  if (!bearerKey) {
    logFailedAuth(request, "missing_bearer");
    response.status(403).json({
      error: "No valid API key found.",
    });
    return;
  }

  const apiKey = await BrowserExtensionApiKey.validate(bearerKey);
  if (!apiKey) {
    logFailedAuth(request, "invalid_key");
    response.status(403).json({
      error: "No valid API key found.",
    });
    return;
  }

  if (multiUserMode) {
    const user = await User.get({ id: apiKey.user_id });
    if (!user) {
      response.status(403).json({
        error: "User not found.",
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
  }

  response.locals.apiKey = apiKey;
  next();
}

/**
 * Log a failed browser-extension auth attempt. Never logs the attempted
 * credential — only IP, method, path, and failure reason.
 * @param {import("express").Request} request
 * @param {"missing_bearer"|"invalid_key"} reason
 */
function logFailedAuth(request, reason) {
  try {
    // eslint-disable-next-line no-console
    console.warn(
      `\x1b[33m[BROWSER-EXT-AUTH-FAIL]\x1b[0m reason=${reason} ip=${request.ip || "unknown"} ${request.method} ${request.originalUrl || request.path}`,
    );
  } catch {
    /* logging must never break auth flow */
  }
}

module.exports = { validBrowserExtensionApiKey };
