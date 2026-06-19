// SPDX-License-Identifier: MIT
const crypto = require("crypto");
const { reqBody, multiUserMode, userFromSession } = require("../utils/http");
const { handleFileUpload } = require("../utils/files/multer");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { EventLogs } = require("../models/eventLogs");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");
const { CollectorApi } = require("../utils/collectorApi");
const { WorkspaceThread } = require("../models/workspaceThread");
const { WorkspaceParsedFiles } = require("../models/workspaceParsedFiles");
const fs = require("fs");

function cleanupHotdirFile(request) {
  try {
    const filePath = request.file?.path;
    if (filePath && fs.existsSync(filePath)) fs.rmSync(filePath);
  } catch {
    // Best-effort cleanup
  }
}

function workspaceParsedFilesEndpoints(app) {
  if (!app) return;

  app.get(
    "/workspace/:slug/parsed-files",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const threadSlug = request.query.threadSlug || null;
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const thread = threadSlug
          ? await WorkspaceThread.get({ slug: String(threadSlug) })
          : null;
        const { files, contextWindow, currentContextTokenCount } =
          await WorkspaceParsedFiles.getContextMetadataAndLimits(
            workspace,
            thread || null,
            multiUserMode(response) ? user : null,
          );

        return response
          .status(200)
          .json({ files, contextWindow, currentContextTokenCount });
      } catch (e) {
        const errorId = crypto.randomUUID();
        console.error(`[endpoint error ${errorId}]`, e);
        return response.status(500).json({
          success: false,
          error: "Internal server error",
          errorId,
        });
      }
    },
  );

  app.delete(
    "/workspace/:slug/delete-parsed-files",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async function (request, response) {
      try {
        const { fileIds = [] } = reqBody(request);
        if (!fileIds.length) return response.sendStatus(400);
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const success = await WorkspaceParsedFiles.delete({
          id: {
            in: fileIds.map((id) => parseInt(id)),
          },
          ...(user ? { userId: user.id } : {}),
          workspaceId: workspace.id,
        });
        return response.status(success ? 200 : 403).end();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        return response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/:slug/embed-parsed-file/:fileId",
    [
      validatedRequest,
      // Embed is still an admin/manager only feature
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      validWorkspaceSlug,
    ],
    async function (request, response) {
      const { fileId = null } = request.params;
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        if (!fileId) return response.sendStatus(400);
        const { success, error, document } =
          await WorkspaceParsedFiles.moveToDocumentsAndEmbed(
            user,
            fileId,
            workspace,
          );

        if (!success) {
          return response.status(500).json({
            success: false,
            error: error || "Failed to embed file",
          });
        }

        await Telemetry.sendTelemetry("document_embedded");
        await EventLogs.logEvent(
          "document_embedded",
          {
            documentName: document?.name || "unknown",
            workspaceId: workspace.id,
          },
          user?.id,
        );

        await WorkspaceParsedFiles.delete({ id: parseInt(fileId) });
        return response.status(200).json({
          success: true,
          error: null,
          document,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        return response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/:slug/parse",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      handleFileUpload,
      validWorkspaceSlug,
    ],
    async function (request, response) {
      try {
        if (!request.file) {
          return response
            .status(400)
            .json({ success: false, error: "No file uploaded." });
        }

        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const Collector = new CollectorApi();
        const originalname = request.file?.originalname || "unknown";
        const collectorFilename = request.file?.filename || originalname;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          cleanupHotdirFile(request);
          return response.status(500).json({
            success: false,
            error: `Document processing API is not online. Document ${originalname} will not be parsed.`,
          });
        }

        const { success, reason, documents } =
          await Collector.parseDocument(collectorFilename);
        if (!success || !documents?.[0]) {
          cleanupHotdirFile(request);
          return response.status(500).json({
            success: false,
            error: reason || "No document returned from collector",
          });
        }

        // Get thread ID if we have a slug
        const { threadSlug = null } = reqBody(request);
        const thread = threadSlug
          ? await WorkspaceThread.get({
              slug: String(threadSlug),
              workspace_id: workspace.id,
              user_id: user?.id || null,
            })
          : null;
        const files = await Promise.all(
          documents.map(async (doc) => {
            const metadata = { ...doc };
            // Strip out pageContent
            delete metadata.pageContent;
            const filename = `${originalname}-${doc.id}.json`;
            const { file, error: dbError } = await WorkspaceParsedFiles.create({
              filename,
              workspaceId: workspace.id,
              userId: user?.id || null,
              threadId: thread?.id || null,
              metadata: JSON.stringify(metadata),
              tokenCountEstimate: doc.token_count_estimate || 0,
            });

            if (dbError) throw new Error(dbError);
            return file;
          }),
        );

        Collector.log(`Document ${originalname} parsed successfully.`);
        await EventLogs.logEvent(
          "document_uploaded_to_chat",
          {
            documentName: originalname,
            workspace: workspace.slug,
            thread: thread?.name || null,
          },
          user?.id,
        );

        return response.status(200).json({
          success: true,
          error: null,
          files,
        });
      } catch (e) {
        cleanupHotdirFile(request);
        const errorId = crypto.randomUUID();
        console.error(`[endpoint error ${errorId}]`, e);
        return response.status(500).json({
          success: false,
          error: "Internal server error",
          errorId,
        });
      }
    },
  );
}

module.exports = { workspaceParsedFilesEndpoints };
