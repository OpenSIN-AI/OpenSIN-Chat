// SPDX-License-Identifier: MIT
// Purpose: Express middleware that allows onboarding completion without auth while setup is still pending.
// Docs: server/utils/middleware/requireAuthWhenOnboardingComplete.doc.md
const consoleLogger = require("../logger/console.js");

const { SystemSettings } = require("../../models/systemSettings");
const { validatedRequest } = require("./validatedRequest");

/**
 * Allow marking onboarding complete without authentication while onboarding
 * is still in progress (e.g. single-user no-password mode has no JWT yet).
 * Once onboarding is complete, require authentication before changing the flag.
 * @param {import("express").Request} request
 * @param {import("express").Response} response
 * @param {import("express").NextFunction} next
 */
async function requireAuthWhenOnboardingComplete(request, response, next) {
  try {
    const isComplete = await SystemSettings.isOnboardingComplete();
    if (!isComplete) return next();
    return validatedRequest(request, response, next);
  } catch (e) {
    consoleLogger.error(e.message, e);
    response.sendStatus(500);
  }
}

module.exports = {
  requireAuthWhenOnboardingComplete,
};
