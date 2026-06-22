// SPDX-License-Identifier: MIT
// Purpose: Health, migration, onboarding, and setup-status endpoints.
// Docs: server/endpoints/system.doc.md
const { SystemSettings } = require("../../models/systemSettings");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { simpleRateLimit } = require("../../utils/middleware/simpleRateLimit");
const {
  requireAuthWhenOnboardingComplete,
} = require("../../utils/middleware/requireAuthWhenOnboardingComplete");
const { dumpENV } = require("../../utils/helpers/updateENV");

function healthEndpoints(app) {
  if (!app) return;

  app.get("/ping", (_, response) => {
    response.status(200).json({
      online: true,
      version: process.env.APP_VERSION || null,
      commit: process.env.GIT_SHA || null,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  app.get(
    "/migrate",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (_, response) => {
      response.sendStatus(200);
    },
  );

  app.get(
    "/env-dump",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin]),
      simpleRateLimit({ bucket: "env-dump", max: 2, windowMs: 60 * 1000 }),
    ],
    async (request, response) => {
      if (process.env.NODE_ENV !== "production")
        return response.sendStatus(200);
      // eslint-disable-next-line no-console
      console.warn(
        `\x1b[33m[ENV-DUMP]\x1b[0m triggered by ip=${request.ip || "unknown"}`,
      );
      dumpENV();
      response.sendStatus(200);
    },
  );

  app.get("/onboarding", async (_, response) => {
    try {
      const results = await SystemSettings.isOnboardingComplete();
      response.status(200).json({ onboardingComplete: results });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e.message, e);
      response.sendStatus(500);
    }
  });

  app.post(
    "/onboarding",
    [requireAuthWhenOnboardingComplete],
    async (_, response) => {
      try {
        await SystemSettings.markOnboardingComplete();
        response.sendStatus(200);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get("/setup-complete", async (_, response) => {
    try {
      const results = await SystemSettings.currentSettings();
      response.status(200).json({ results });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e.message, e);
      response.sendStatus(500);
    }
  });
}

module.exports = { healthEndpoints };
