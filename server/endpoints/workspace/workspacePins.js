// SPDX-License-Identifier: MIT
const consoleLogger = require("../../utils/logger/console.js");
const { reqBody } = require("../../utils/http");
const { Document } = require("../../models/documents");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { validWorkspaceSlug } = require("../../utils/middleware/validWorkspace");
const {
  WorkspaceSuggestedMessages,
} = require("../../models/workspacesSuggestedMessages");

function workspacePinEndpoints(app) {
  if (!app) return;

  app.post(
    "/workspace/:slug/update-pin",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const { docPath, pinStatus = false } = reqBody(request);
        const workspace = response.locals.workspace;

        const document = await Document.get({
          workspaceId: workspace.id,
          docpath: docPath,
        });
        if (!document) return response.sendStatus(404);

        await Document.update(document.id, { pinned: pinStatus });
        return response.status(200).end();
      } catch (error) {
        consoleLogger.error("Error processing the pin status update:", error);
        return response.status(500).end();
      }
    },
  );

  app.get(
    "/workspace/:slug/suggested-messages",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const suggestedMessages =
          await WorkspaceSuggestedMessages.getMessages(slug);
        response.status(200).json({ success: true, suggestedMessages });
      } catch (error) {
        consoleLogger.error("Error fetching suggested messages:", error);
        response
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
  );

  app.post(
    "/workspace/:slug/suggested-messages",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { messages = [] } = reqBody(request);
        const { slug } = request.params;
        if (!Array.isArray(messages)) {
          return response.status(400).json({
            success: false,
            message: "Invalid message format. Expected an array of messages.",
          });
        }

        await WorkspaceSuggestedMessages.saveAll(messages, slug);
        return response.status(200).json({
          success: true,
          message: "Suggested messages saved successfully.",
        });
      } catch (error) {
        consoleLogger.error("Error processing the suggested messages:", error);
        response.status(500).json({
          success: false,
          message: "Error saving the suggested messages.",
        });
      }
    },
  );
}

module.exports = { workspacePinEndpoints };
