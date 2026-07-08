// SPDX-License-Identifier: MIT
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const consoleLogger = require("../../utils/logger/console.js");
const { reqBody, multiUserMode, userFromSession } = require("../../utils/http");
const { isWithin } = require("../../utils/files");
const { Workspace } = require("../../models/workspace");
const { Document } = require("../../models/documents");
const { Telemetry } = require("../../models/telemetry");
const { EventLogs } = require("../../models/eventLogs");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const {
  handleFileUpload,
  mirrorToSupabase,
} = require("../../utils/files/multer");
const { CollectorApi } = require("../../utils/collectorApi");
const { getStoragePath, getCollectorPath } = require("../../utils/paths");
const { simpleRateLimit } = require("../../utils/middleware/simpleRateLimit");
const { purgeDocument } = require("../../utils/files/purgeDocument");
const { cleanupHotdirFile } = require("./shared");

function workspaceDocumentEndpoints(app) {
  if (!app) return;

  app.post(
    "/workspace/:slug/upload",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      simpleRateLimit({
        bucket: "workspace-upload",
        max: 30,
        windowMs: 60 * 60 * 1000,
      }),
      handleFileUpload,
    ],
    async function (request, response) {
      try {
        const { slug = null } = request.params;
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) {
          response.sendStatus(400);
          return;
        }

        const Collector = new CollectorApi();
        const { originalname } = request.file;
        const collectorFilename = request.file.filename || originalname;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          cleanupHotdirFile(request);
          response
            .status(500)
            .json({
              success: false,
              error: `Document processing API is not online. Document ${originalname} will not be processed automatically.`,
            })
            .end();
          return;
        }

        // Kick off the Supabase durability mirror out-of-band — the client
        // never waits for the OCI → Supabase roundtrip.
        const mirrorPromise = mirrorToSupabase(request).catch(() => {});

        const { success, reason, documents } = await Collector.processDocument(
          collectorFilename,
          { title: originalname },
        );
        if (!success || documents?.length === 0) {
          await mirrorPromise;
          cleanupHotdirFile(request);
          response.status(500).json({ success: false, error: reason }).end();
          return;
        }

        Collector.log(
          `Document ${originalname} uploaded processed and successfully. It is now available in documents.`,
        );
        await Telemetry.sendTelemetry("document_uploaded");
        await EventLogs.logEvent(
          "document_uploaded",
          {
            documentName: originalname,
          },
          response.locals?.user?.id,
        );

        const document = documents[0];
        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          currWorkspace,
          [document.location],
          response.locals?.user?.id,
        );

        if (failedToEmbed.length > 0) {
          response
            .status(500)
            .json({ success: false, error: errors?.[0] })
            .end();
          return;
        }

        // Fire-and-forget: apply default transformations to newly uploaded doc.
        const { applyDefaultTransformations } = require("../../utils/transformations/autoApply");
        applyDefaultTransformations({
          workspace: currWorkspace,
          docPaths: [document.location],
        }).catch((e) =>
          consoleLogger.error(`[Transformations] auto-apply failed: ${e.message}`),
        );

        response.status(200).json({ success: true, error: null, document });
      } catch (e) {
        cleanupHotdirFile(request);

        consoleLogger.error(e.message, e);
        response
          .status(500)
          .json({ success: false, error: "Upload failed" })
          .end();
      }
    },
  );

  app.post(
    "/workspace/:slug/connect-files",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug = null } = request.params;
        const { files: filePaths, directory } = reqBody(request);
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) {
          response.status(400).json({ error: "Workspace not found" }).end();
          return;
        }

        let resolvedFilePaths = filePaths;
        if (
          (!resolvedFilePaths ||
            !Array.isArray(resolvedFilePaths) ||
            resolvedFilePaths.length === 0) &&
          directory
        ) {
          try {
            const { safeStorageJoin } = require("../../utils/paths");
            const dirPath = safeStorageJoin("uploads", directory);
            const entries = await fs.promises.readdir(dirPath, {
              withFileTypes: true,
            });
            resolvedFilePaths = entries
              .filter((e) => e.isFile() && !e.name.startsWith("."))
              .map((e) => path.join(dirPath, e.name));
          } catch (dirErr) {
            response
              .status(400)
              .json({ error: `Cannot read directory: ${dirErr.message}` })
              .end();
            return;
          }
        }

        if (
          !resolvedFilePaths ||
          !Array.isArray(resolvedFilePaths) ||
          resolvedFilePaths.length === 0
        ) {
          response.status(400).json({ error: "No files provided" }).end();
          return;
        }

        const storageDir = getStoragePath("documents");
        const Collector = new CollectorApi();
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          response
            .status(500)
            .json({
              success: false,
              error: "Document processing API is not online.",
            })
            .end();
          return;
        }

        const allowedRoots = [
          path.resolve(getStoragePath("documents")),
          path.resolve(getStoragePath("uploads")),
          getCollectorPath("hotdir"),
        ];

        const results = [];
        for (const filePath of resolvedFilePaths) {
          try {
            const basename = path.basename(filePath);
            try {
              await fs.promises.access(filePath);
            } catch {
              results.push({
                file: basename,
                success: false,
                error: "File not found",
              });
              continue;
            }

            const resolvedSource = path.resolve(filePath);
            const isAllowed = allowedRoots.some(
              (root) =>
                resolvedSource === root ||
                resolvedSource.startsWith(root + path.sep),
            );
            if (!isAllowed) {
              results.push({
                file: basename,
                success: false,
                error: "File is outside the permitted storage directories.",
              });
              continue;
            }

            const destPath = path.join(storageDir, basename);
            if (!isWithin(storageDir, destPath)) {
              results.push({
                file: basename,
                success: false,
                error: "Invalid destination path.",
              });
              continue;
            }
            await fs.promises.copyFile(filePath, destPath);

            const { success, reason, documents } =
              await Collector.processDocument(basename);
            if (!success || documents?.length === 0) {
              results.push({ file: basename, success: false, error: reason });
              continue;
            }

            const document = documents[0];
            const { failedToEmbed = [], errors = [] } =
              await Document.addDocuments(
                currWorkspace,
                [document.location],
                response.locals?.user?.id,
              );

            if (failedToEmbed.length > 0) {
              results.push({
                file: basename,
                success: false,
                error: errors?.[0],
              });
            } else {
              results.push({ file: basename, success: true, document });
            }
          } catch {
            results.push({
              file: path.basename(filePath),
              success: false,
              error: "Failed to process file",
            });
          }
        }

        await Telemetry.sendTelemetry("document_uploaded");
        await EventLogs.logEvent(
          "document_uploaded",
          { documentName: `${results.length} files via directory browser` },
          response.locals?.user?.id,
        );

        const successCount = results.filter((r) => r.success).length;
        response.status(200).json({
          success: successCount > 0,
          connected: successCount,
          total: results.length,
          results,
        });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        response
          .status(500)
          .json({ error: "Internal server error", errorId })
          .end();
      }
    },
  );

  app.post(
    "/workspace/:slug/upload-link",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug = null } = request.params;
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) {
          response.sendStatus(400);
          return;
        }

        const Collector = new CollectorApi();
        const { link = "" } = reqBody(request);
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          response
            .status(500)
            .json({
              success: false,
              error: `Document processing API is not online. Link ${link} will not be processed automatically.`,
            })
            .end();
          return;
        }

        const { success, reason, documents } =
          await Collector.processLink(link);
        if (!success || documents?.length === 0) {
          response.status(500).json({ success: false, error: reason }).end();
          return;
        }

        Collector.log(
          `Link ${link} uploaded processed and successfully. It is now available in documents.`,
        );
        await Telemetry.sendTelemetry("link_uploaded");
        await EventLogs.logEvent(
          "link_uploaded",
          { link },
          response.locals?.user?.id,
        );

        const document = documents[0];
        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          currWorkspace,
          [document.location],
          response.locals?.user?.id,
        );

        if (failedToEmbed.length > 0) {
          response
            .status(500)
            .json({ success: false, error: errors?.[0] })
            .end();
          return;
        }

        response.status(200).json({ success: true, error: null, document });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/:slug/update-embeddings",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      simpleRateLimit({
        bucket: "workspace-update-embeddings",
        max: 10,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug = null } = request.params;
        const { adds = [], deletes = [] } = reqBody(request);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) {
          response.sendStatus(400);
          return;
        }

        await Document.removeDocuments(
          currWorkspace,
          deletes,
          response.locals?.user?.id,
        );

        const {
          isNativeEmbedder,
          embedFiles,
        } = require("../../utils/EmbeddingWorkerManager");

        if (isNativeEmbedder() && adds.length > 0) {
          await embedFiles(
            currWorkspace.slug,
            adds,
            currWorkspace.id,
            response.locals?.user?.id ?? null,
          );
          const updatedWorkspace = await Workspace.get({
            id: currWorkspace.id,
          });
          response
            .status(200)
            .json({ workspace: updatedWorkspace, message: null });
          return;
        }

        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          currWorkspace,
          adds,
          response.locals?.user?.id,
        );
        const updatedWorkspace = await Workspace.get({ id: currWorkspace.id });
        response.status(200).json({
          workspace: updatedWorkspace,
          message:
            failedToEmbed.length > 0
              ? `${failedToEmbed.length} documents failed to add.\n\n${errors
                  .map((msg) => `${msg}`)
                  .join("\n\n")}`
              : null,
        });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/:slug/upload-and-embed",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      handleFileUpload,
      simpleRateLimit({
        bucket: "workspace-upload-and-embed",
        max: 20,
        windowMs: 60 * 1000,
      }),
    ],
    async function (request, response) {
      try {
        const { slug = null } = request.params;
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) {
          response.sendStatus(400);
          return;
        }

        const Collector = new CollectorApi();
        const { originalname } = request.file;
        const collectorFilename = request.file.filename || originalname;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          cleanupHotdirFile(request);
          response
            .status(500)
            .json({
              success: false,
              error: `Document processing API is not online. Document ${originalname} will not be processed automatically.`,
            })
            .end();
          return;
        }

        // Out-of-band Supabase durability mirror (see /upload above).
        const mirrorPromise = mirrorToSupabase(request).catch(() => {});

        const { success, reason, documents } = await Collector.processDocument(
          collectorFilename,
          { title: originalname },
        );
        if (!success || documents?.length === 0) {
          await mirrorPromise;
          cleanupHotdirFile(request);
          response.status(500).json({ success: false, error: reason }).end();
          return;
        }

        Collector.log(
          `Document ${originalname} uploaded processed and successfully. It is now available in documents.`,
        );
        await Telemetry.sendTelemetry("document_uploaded");
        await EventLogs.logEvent(
          "document_uploaded",
          {
            documentName: originalname,
          },
          response.locals?.user?.id,
        );

        if (!documents?.length) {
          cleanupHotdirFile(request);
          return response.status(400).json({
            success: false,
            error: "No documents were returned from processing.",
          });
        }
        const document = documents[0];
        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          currWorkspace,
          [document.location],
          response.locals?.user?.id,
        );

        if (failedToEmbed.length > 0)
          return response
            .status(200)
            .json({ success: false, error: errors?.[0], document: null });

        response.status(200).json({
          success: true,
          error: null,
          document: { id: document.id, location: document.location },
        });
      } catch (e) {
        cleanupHotdirFile(request);

        consoleLogger.error(e.message, e);
        response
          .status(500)
          .json({ success: false, error: "Upload failed" })
          .end();
      }
    },
  );

  app.delete(
    "/workspace/:slug/remove-and-unembed",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      handleFileUpload,
    ],
    async function (request, response) {
      try {
        const { slug = null } = request.params;
        const body = reqBody(request);
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace || !body.documentLocation)
          return response.sendStatus(400);

        await purgeDocument(body.documentLocation);
        response.status(200).end();
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );
}

module.exports = { workspaceDocumentEndpoints };
