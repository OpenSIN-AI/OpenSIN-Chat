// SPDX-License-Identifier: MIT
// Purpose: API key management and custom model discovery endpoints.
// Docs: server/endpoints/system.doc.md
const { ApiKey } = require("../../models/apiKeys");
const { EventLogs } = require("../../models/eventLogs");
const { getCustomModels } = require("../../utils/helpers/customModels");
const { reqBody } = require("../../utils/http");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  requireApiKeyOrSession,
} = require("../../utils/middleware/requireApiKeyOrSession");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { simpleRateLimit } = require("../../utils/middleware/simpleRateLimit");

function apiKeyEndpoints(app) {
  if (!app) return;

  app.get("/system/api-keys", [requireApiKeyOrSession], async (_, response) => {
    try {
      if (response.locals.multiUserMode) {
        return response.sendStatus(401);
      }
      const apiKeys = await ApiKey.where({});
      return response.status(200).json({
        apiKeys,
        error: null,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      response.status(500).json({
        apiKey: null,
        error: "Could not find an API Key.",
      });
    }
  });

  app.post(
    "/system/generate-api-key",
    [
      requireApiKeyOrSession,
      simpleRateLimit({
        bucket: "system-generate-api-key",
        max: 5,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        if (response.locals.multiUserMode) {
          return response.sendStatus(401);
        }
        const { name = null } = reqBody(request);
        const { apiKey, error } = await ApiKey.create(null, name);
        await EventLogs.logEvent(
          "api_key_created",
          { name: apiKey?.name },
          response?.locals?.user?.id,
        );
        return response.status(200).json({
          apiKey,
          error,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        response.status(500).json({
          apiKey: null,
          error: "Error generating api key.",
        });
      }
    },
  );

  // TODO: This endpoint is replicated in the admin endpoints file.
  // and should be consolidated to be a single endpoint with flexible role protection.
  app.delete(
    "/system/api-key/:id",
    [requireApiKeyOrSession],
    async (request, response) => {
      try {
        if (response.locals.multiUserMode) {
          return response.sendStatus(401);
        }
        const { id } = request.params;
        if (!id || isNaN(Number(id))) return response.sendStatus(400);

        await ApiKey.delete({ id: Number(id) });
        await EventLogs.logEvent(
          "api_key_deleted",
          { deletedBy: response.locals?.user?.username },
          response?.locals?.user?.id,
        );
        return response.status(200).end();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        response.status(500).end();
      }
    },
  );

  app.post(
    "/system/custom-models",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { provider, apiKey = null, basePath = null } = reqBody(request);
        const { models, error } = await getCustomModels(
          provider,
          apiKey,
          basePath,
        );
        return response.status(200).json({
          models,
          error,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        response.status(500).end();
      }
    },
  );
}

module.exports = { apiKeyEndpoints };
