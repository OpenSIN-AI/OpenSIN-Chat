// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");
const { Document } = require("../models/documents");
const { generateDocumentSummary } = require("../utils/documentSummary");
const { reqBody } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");

const VALID_CONTEXT_MODES = ["off", "summary", "full"];

function contextModeEndpoints(app) {
  if (!app) return;

  /**
   * PATCH /workspaces/:slug/documents/:docId/context-mode
   * Sets the contextMode for a workspace document.
   * Body: { contextMode: "off" | "summary" | "full" }
   */
  app.patch(
    "/workspace/:slug/documents/:docId/context-mode",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { docId } = request.params;
        const { contextMode } = reqBody(request);

        if (!VALID_CONTEXT_MODES.includes(contextMode)) {
          return response.status(400).json({
            error: `contextMode must be one of: ${VALID_CONTEXT_MODES.join(", ")}`,
          });
        }

        const document = await Document.get({
          docId: String(docId),
          workspaceId: Number(workspace.id),
        });
        if (!document) {
          return response.status(404).json({ error: "Document not found" });
        }

        // Keep legacy `pinned` in sync with contextMode so older code paths
        // (and any external clients still using update-pin) stay consistent:
        //   full → pinned true (always-on full text)
        //   off / summary → pinned false
        const pinned = contextMode === "full";
        await Document._updateAll(
          { docId: String(docId), workspaceId: Number(workspace.id) },
          { contextMode, pinned },
        );

        // Pre-generate a summary immediately when switching to summary mode so
        // the first chat request does not have to wait for LLM generation.
        if (contextMode === "summary") {
          generateDocumentSummary({ document, workspace }).catch((e) =>
            consoleLogger.error(
              `[ContextMode] Background summary generation failed for ${docId}:`,
              e.message,
            ),
          );
        }

        response.status(200).json({ success: true, contextMode });
      } catch (e) {
        consoleLogger.error(e);
        response.status(500).json({ error: e.message });
      }
    },
  );

  /**
   * POST /workspaces/:slug/documents/:docId/refresh-summary
   * Forces regeneration of the LLM summary for a document.
   */
  app.post(
    "/workspace/:slug/documents/:docId/refresh-summary",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { docId } = request.params;

        const document = await Document.get({
          docId: String(docId),
          workspaceId: Number(workspace.id),
        });
        if (!document) {
          return response.status(404).json({ error: "Document not found" });
        }

        const summary = await generateDocumentSummary({
          document,
          workspace,
          forceRefresh: true,
        });

        if (!summary) {
          return response
            .status(500)
            .json({ error: "Failed to generate summary" });
        }

        response.status(200).json({ summary });
      } catch (e) {
        consoleLogger.error(e);
        response.status(500).json({ error: e.message });
      }
    },
  );
}

module.exports = { contextModeEndpoints };
