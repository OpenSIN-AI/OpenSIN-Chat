// SPDX-License-Identifier: MIT
const consoleLogger = require("../../utils/logger/console.js");

const ImportedPlugin = require("../../utils/agents/imported");
const { reqBody } = require("../../utils/http");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");

function importedAgentPluginEndpoints(app) {
  if (!app) return;

  app.post(
    "/experimental/agent-plugins/:hubId/toggle",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    (request, response) => {
      try {
        const { hubId } = request.params;
        const { active } = reqBody(request);
        const updatedConfig = ImportedPlugin.updateImportedPlugin(hubId, {
          active: Boolean(active),
        });
        response.status(200).json(updatedConfig);
      } catch (e) {
        consoleLogger.error(e);
        response.status(500).end();
      }
    },
  );

  app.post(
    "/experimental/agent-plugins/:hubId/config",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    (request, response) => {
      try {
        const { hubId } = request.params;
        const { updates } = reqBody(request);
        if (!updates || typeof updates !== "object")
          return response
            .status(400)
            .json({ error: "updates must be a non-empty object" });
        const updatedConfig = ImportedPlugin.updateImportedPlugin(
          hubId,
          updates,
        );
        if (!updatedConfig)
          return response.status(404).json({ error: "Plugin not found" });
        response.status(200).json(updatedConfig);
      } catch (e) {
        consoleLogger.error(e);
        response.status(500).end();
      }
    },
  );

  app.delete(
    "/experimental/agent-plugins/:hubId",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { hubId } = request.params;
        const result = ImportedPlugin.deletePlugin(hubId);
        if (!result)
          return response.status(404).json({ error: "Plugin not found" });
        response.status(200).json({ success: true });
      } catch (e) {
        consoleLogger.error(e);
        response.status(500).end();
      }
    },
  );
}

module.exports = { importedAgentPluginEndpoints };
