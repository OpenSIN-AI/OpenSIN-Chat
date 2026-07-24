// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");
const { askDocuments } = require("../utils/ask");
const { WorkspaceChats } = require("../models/workspaceChats");
const { userFromSession, reqBody } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");

function askEndpoints(app) {
  if (!app) return;

  /**
   * POST /workspaces/:slug/ask
   *
   * Runs the multi-query "ask" pipeline against the workspace documents and
   * returns a synthesised answer with cited sources.
   *
   * Body: { question: string }
   * Response: { answer, strategy, subAnswers, sources }
   */
  app.post(
    "/workspace/:slug/ask",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { question = "" } = reqBody(request);

        if (
          !question ||
          typeof question !== "string" ||
          question.trim().length === 0
        ) {
          return response
            .status(400)
            .json({ error: "question must be a non-empty string" });
        }

        if (question.length > 4_000) {
          return response.status(400).json({
            error: "question exceeds maximum length of 4 000 characters",
          });
        }

        const result = await askDocuments({
          question: question.trim(),
          workspace,
        });

        // Persist result as a workspace chat entry so it appears in history.
        await WorkspaceChats.new({
          workspaceId: workspace.id,
          prompt: question.trim(),
          response: {
            text: result.answer,
            sources: result.sources,
            type: "ask",
            attachments: [],
          },
          user,
        });

        response.status(200).json(result);
      } catch (e) {
        consoleLogger.error(e);
        response.status(500).json({ error: e.message });
      }
    },
  );
}

module.exports = { askEndpoints };
