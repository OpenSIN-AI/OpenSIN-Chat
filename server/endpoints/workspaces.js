// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const {
  reqBody,
  multiUserMode,
  userFromSession,
  safeJsonParse,
} = require("../utils/http");
const { normalizePath, isWithin } = require("../utils/files");
const { Workspace } = require("../models/workspace");
const { Document } = require("../models/documents");
const { WorkspaceChats } = require("../models/workspaceChats");
const { getVectorDbClass } = require("../utils/helpers");
const {
  handleFileUpload,
  handlePfpUpload,
  cleanupUploadedFile,
} = require("../utils/files/multer");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { EventLogs } = require("../models/eventLogs");
const {
  WorkspaceSuggestedMessages,
} = require("../models/workspacesSuggestedMessages");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");
const { convertToChatHistory } = require("../utils/helpers/chat/responses");
const { CollectorApi } = require("../utils/collectorApi");
const {
  determineWorkspacePfpFilepath,
  fetchPfp,
} = require("../utils/files/pfp");
const { getStoragePath, getCollectorPath } = require("../utils/paths");
const { getTTSProvider } = require("../utils/TextToSpeech");
const { WorkspaceThread } = require("../models/workspaceThread");
const prisma = require("../utils/prisma");

const truncate = require("truncate");
const { purgeDocument } = require("../utils/files/purgeDocument");
const { getModelTag } = require("./utils");
const { searchWorkspaceAndThreads } = require("../utils/helpers/search");
const { workspaceParsedFilesEndpoints } = require("./workspacesParsedFiles");
const {
  workspaceDeletionProtection,
} = require("../utils/middleware/workspaceDeletionProtection");
const { simpleRateLimit } = require("../utils/middleware/simpleRateLimit");

function cleanupHotdirFile(request) {
  cleanupUploadedFile(request);
}

function workspaceEndpoints(app) {
  if (!app) return;
  const RESPONSE_CACHE_MAX = 50;
  const responseCache = new Map();
  function cacheSet(key, value) {
    responseCache.set(key, value);
    if (responseCache.size > RESPONSE_CACHE_MAX) {
      const firstKey = responseCache.keys().next().value;
      responseCache.delete(firstKey);
    }
  }

  app.post(
    "/workspace/new",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      simpleRateLimit({
        bucket: "workspace-new",
        max: 5,
        windowMs: 60 * 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name = null } = reqBody(request);
        const { workspace, message } = await Workspace.new(name, user?.id);
        await Telemetry.sendTelemetry(
          "workspace_created",
          {
            multiUserMode: multiUserMode(response),
            LLMSelection: process.env.LLM_PROVIDER || "openai",
            Embedder: process.env.EMBEDDING_ENGINE || "inherit",
            VectorDbSelection: process.env.VECTOR_DB || "lancedb",
            TTSSelection: process.env.TTS_PROVIDER || "native",
            LLMModel: getModelTag(),
          },
          user?.id,
        );

        await EventLogs.logEvent(
          "workspace_created",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
          },
          user?.id,
        );
        response.status(200).json({ workspace, message });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/:slug/update",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      simpleRateLimit({
        bucket: "workspace-update",
        max: 30,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug = null } = request.params;
        const data = reqBody(request);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) {
          response.sendStatus(400);
          return;
        }

        await Workspace.trackChange(currWorkspace, data, user);
        const { workspace, message } = await Workspace.update(
          currWorkspace.id,
          data,
        );
        response.status(200).json({ workspace, message });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

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

        const { success, reason, documents } = await Collector.processDocument(
          collectorFilename,
          { title: originalname },
        );
        if (!success || documents?.length === 0) {
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

  // Connect local files to workspace — reads from server filesystem
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

        // Resolve file paths: either an explicit list or all files in a directory
        let resolvedFilePaths = filePaths;
        if (
          (!resolvedFilePaths ||
            !Array.isArray(resolvedFilePaths) ||
            resolvedFilePaths.length === 0) &&
          directory
        ) {
          try {
            const { safeStorageJoin } = require("../utils/paths");
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

        // Allowed source roots for connect-files: only the storage
        // documents, uploads, and collector hotdir directories. Without
        // this check an attacker could copy arbitrary server files (e.g.
        // /etc/passwd, .env) into the documents folder and read them via
        // the document API — a local file disclosure vulnerability.
        const allowedRoots = [
          path.resolve(getStoragePath("documents")),
          path.resolve(getStoragePath("uploads")),
          getCollectorPath("hotdir"),
        ];

        const results = [];
        for (const filePath of resolvedFilePaths) {
          try {
            const basename = path.basename(filePath);
            if (!fs.existsSync(filePath)) {
              results.push({
                file: basename,
                success: false,
                error: "File not found",
              });
              continue;
            }

            // Block path traversal — the source file must reside inside
            // one of the allowed storage roots.
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
            fs.copyFileSync(filePath, destPath);

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
          } catch (e) {
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
        } = require("../utils/EmbeddingWorkerManager");

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

  app.delete(
    "/workspace/:slug",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      workspaceDeletionProtection,
    ],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const user = await userFromSession(request, response);
        const VectorDb = getVectorDbClass();
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400);
          return;
        }

        const workspaceId = Number(workspace.id);
        await prisma.$transaction(async (tx) => {
          const docs = await tx.workspace_documents.findMany({
            where: { workspaceId },
            select: { docId: true },
          });
          const docIds = docs.map((d) => d.docId);
          if (docIds.length > 0) {
            await tx.document_vectors.deleteMany({
              where: { docId: { in: docIds } },
            });
          }
          await tx.workspaces.delete({ where: { id: workspaceId } });
        });

        await EventLogs.logEvent(
          "workspace_deleted",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
          },
          response.locals?.user?.id,
        );

        try {
          await VectorDb["delete-namespace"]({ namespace: slug });
        } catch (e) {
          consoleLogger.error(e.message);
        }
        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspace/:slug/reset-vector-db",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const user = await userFromSession(request, response);
        const VectorDb = getVectorDbClass();
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400);
          return;
        }

        await prisma.$transaction(async (tx) => {
          const docs = await tx.workspace_documents.findMany({
            where: { workspaceId: Number(workspace.id) },
            select: { docId: true },
          });
          const docIds = docs.map((d) => d.docId);
          if (docIds.length > 0) {
            await tx.document_vectors.deleteMany({
              where: { docId: { in: docIds } },
            });
          }
          await tx.workspace_documents.deleteMany({
            where: { workspaceId: Number(workspace.id) },
          });
        });

        await EventLogs.logEvent(
          "workspace_vectors_reset",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
          },
          response.locals?.user?.id,
        );

        try {
          await VectorDb["delete-namespace"]({ namespace: slug });
        } catch (e) {
          consoleLogger.error(e.message);
        }
        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspaces",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspaces = multiUserMode(response)
          ? await Workspace.whereWithUser(user)
          : await Workspace.where();

        response.status(200).json({ workspaces });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspace/:slug",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const user = await userFromSession(request, response);
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        response.status(200).json({ workspace });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspace/:slug/chats",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const user = await userFromSession(request, response);
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400);
          return;
        }

        const history = multiUserMode(response)
          ? await WorkspaceChats.forWorkspaceByUser(workspace.id, user.id)
          : await WorkspaceChats.forWorkspace(workspace.id);
        response.status(200).json({ history: convertToChatHistory(history) });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspace/:slug/delete-chats",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { chatIds = [] } = reqBody(request);
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        if (!workspace || !Array.isArray(chatIds)) {
          response.sendStatus(400);
          return;
        }

        // This works for both workspace and threads.
        // we simplify this by just looking at workspace<>user overlap
        // since they are all on the same table.
        await WorkspaceChats.delete({
          id: { in: chatIds.map((id) => Number(id)) },
          user_id: user?.id ?? null,
          workspaceId: workspace.id,
        });

        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspace/:slug/delete-edited-chats",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { startingId } = reqBody(request);
        if (!startingId || isNaN(Number(startingId))) {
          return response
            .status(400)
            .json({ success: false, error: "startingId is required." });
        }
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        await WorkspaceChats.delete({
          workspaceId: workspace.id,
          thread_id: null,
          user_id: user?.id,
          id: { gte: Number(startingId) },
        });

        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/:slug/update-chat",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { chatId, newText = null, role = "assistant" } = reqBody(request);
        if (!newText || !String(newText).trim())
          throw new Error("Cannot save empty edit");

        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const existingChat = await WorkspaceChats.get({
          workspaceId: workspace.id,
          thread_id: null,
          user_id: user?.id,
          id: Number(chatId),
        });
        if (!existingChat) throw new Error("Invalid chat.");

        if (role === "user") {
          await WorkspaceChats._update(existingChat.id, {
            prompt: String(newText),
          });
        } else {
          const chatResponse = safeJsonParse(existingChat.response, null);
          if (!chatResponse) throw new Error("Failed to parse chat response");
          await WorkspaceChats._update(existingChat.id, {
            response: JSON.stringify({
              ...chatResponse,
              text: String(newText),
            }),
          });
        }

        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/:slug/chat-feedback/:chatId",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { chatId } = request.params;
        const { feedback = null } = reqBody(request);
        const user = await userFromSession(request, response);
        const existingChat = await WorkspaceChats.get({
          id: Number(chatId),
          workspaceId: response.locals.workspace.id,
          user_id: user?.id,
        });

        if (!existingChat) return response.status(404).json({ success: false });
        await WorkspaceChats.updateFeedbackScore(chatId, feedback);
        return response.status(200).json({ success: true });
      } catch (error) {
        consoleLogger.error("Error updating chat feedback:", error);
        response.status(500).end();
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
    "/workspace/:slug/tts/:chatId",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async function (request, response) {
      try {
        const { chatId } = request.params;
        const workspace = response.locals.workspace;
        const user = await userFromSession(request, response);
        const cacheKey = `${workspace.slug}:${chatId}`;
        const wsChat = await WorkspaceChats.get({
          id: Number(chatId),
          workspaceId: workspace.id,
          user_id: user?.id,
        });

        if (!wsChat) return response.sendStatus(404);
        const cachedResponse = responseCache.get(cacheKey);
        if (cachedResponse) {
          response.writeHead(200, {
            "Content-Type": cachedResponse.mime || "audio/mpeg",
          });
          response.end(cachedResponse.buffer);
          return;
        }

        const rawText = safeJsonParse(wsChat.response, null)?.text;
        if (!rawText) return response.sendStatus(204);

        // Strip thinking/thought blocks before handing the text to the TTS
        // provider — the model's internal reasoning must not be read aloud.
        const THOUGHT_KEYWORDS = [
          "thought_chain",
          "thought",
          "thinking",
          "think",
        ];
        let text = rawText;
        for (const keyword of THOUGHT_KEYWORDS) {
          text = text.replace(
            new RegExp(
              `<${keyword}\\s*(?:[^>]*?)?>[\\s\\S]*?<\\/${keyword}\\s*(?:[^>]*?)?>`,
              "gi",
            ),
            " ",
          );
        }
        for (const keyword of THOUGHT_KEYWORDS) {
          text = text.replace(
            new RegExp(`<${keyword}\\s*(?:[^>]*?)?>([\\s\\S]*)$`, "gi"),
            " ",
          );
        }
        // Strip <response>/<answer> wrapper tags but keep their content.
        text = text.replace(/<\/?(response|answer)\s*(?:[^>]*?)?>/gi, " ");
        text = text.replace(/\s+/g, " ").trim();
        if (!text) return response.sendStatus(204);

        const TTSProvider = getTTSProvider();
        const buffer = await TTSProvider.ttsBuffer(text);
        if (buffer === null) return response.sendStatus(204);

        cacheSet(cacheKey, { buffer, mime: "audio/mpeg" });
        response.writeHead(200, {
          "Content-Type": "audio/mpeg",
        });
        response.end(buffer);
        return;
      } catch (error) {
        consoleLogger.error("Error processing the TTS request:", error);
        response.status(500).json({ message: "TTS could not be completed" });
      }
    },
  );

  app.get(
    "/workspace/:slug/pfp",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const cachedResponse = responseCache.get(slug);

        if (cachedResponse) {
          response.writeHead(200, {
            "Content-Type": cachedResponse.mime || "image/png",
          });
          response.end(cachedResponse.buffer);
          return;
        }

        const pfpPath = await determineWorkspacePfpFilepath(slug);

        if (!pfpPath) {
          response.sendStatus(204);
          return;
        }

        const { found, buffer, mime } = fetchPfp(pfpPath);
        if (!found) {
          response.sendStatus(204);
          return;
        }

        cacheSet(slug, { buffer, mime });

        response.writeHead(200, {
          "Content-Type": mime || "image/png",
        });
        response.end(buffer);
        return;
      } catch (error) {
        consoleLogger.error("Error processing the logo request:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/workspace/:slug/upload-pfp",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      handlePfpUpload,
    ],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const uploadedFileName = request.randomFileName;
        if (!uploadedFileName) {
          return response.status(400).json({ message: "File upload failed." });
        }

        const workspaceRecord = await Workspace.get({
          slug,
        });

        if (!workspaceRecord) return response.sendStatus(404);

        const oldPfpFilename = workspaceRecord.pfpFilename;
        if (oldPfpFilename) {
          const storagePath = getStoragePath("assets", "pfp");
          const oldPfpPath = path.join(
            storagePath,
            normalizePath(workspaceRecord.pfpFilename),
          );
          if (!isWithin(path.resolve(storagePath), path.resolve(oldPfpPath)))
            throw new Error("Invalid path name");
          await fs.promises.unlink(oldPfpPath).catch(() => {
            /* file already gone, safe to ignore */
          });
        }

        const { workspace, message } = await Workspace._update(
          workspaceRecord.id,
          {
            pfpFilename: uploadedFileName,
          },
        );

        return response.status(workspace ? 200 : 500).json({
          message: workspace
            ? "Profile picture uploaded successfully."
            : message,
        });
      } catch (error) {
        consoleLogger.error(
          "Error processing the profile picture upload:",
          error,
        );
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.delete(
    "/workspace/:slug/remove-pfp",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const workspaceRecord = await Workspace.get({
          slug,
        });
        if (!workspaceRecord) return response.sendStatus(404);
        const oldPfpFilename = workspaceRecord.pfpFilename;

        if (oldPfpFilename) {
          const storagePath = getStoragePath("assets", "pfp");
          const oldPfpPath = path.join(
            storagePath,
            normalizePath(oldPfpFilename),
          );
          if (!isWithin(path.resolve(storagePath), path.resolve(oldPfpPath)))
            throw new Error("Invalid path name");
          await fs.promises.unlink(oldPfpPath).catch(() => {
            /* file already gone, safe to ignore */
          });
        }

        const { workspace, message } = await Workspace._update(
          workspaceRecord.id,
          {
            pfpFilename: null,
          },
        );

        // Clear the cache
        responseCache.delete(slug);

        return response.status(workspace ? 200 : 500).json({
          message: workspace
            ? "Profile picture removed successfully."
            : message,
        });
      } catch (error) {
        consoleLogger.error(
          "Error processing the profile picture removal:",
          error,
        );
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/workspace/:slug/thread/fork",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { chatId, threadSlug } = reqBody(request);
        if (!chatId)
          return response.status(400).json({ message: "chatId is required" });

        // Get threadId we are branching from if that request body is sent
        // and is a valid thread slug. Filter by user_id so users can only
        // fork their own threads in multi-user mode.
        let threadId = null;
        if (threadSlug) {
          const sourceThread = await WorkspaceThread.get({
            slug: String(threadSlug),
            workspace_id: workspace.id,
            user_id: user?.id ?? null,
          });
          if (!sourceThread) {
            return response
              .status(400)
              .json({ message: "Thread not found for this workspace." });
          }
          threadId = sourceThread.id;
        }
        const chatsToFork = await WorkspaceChats.where(
          {
            workspaceId: workspace.id,
            user_id: user?.id,
            include: true, // only duplicate visible chats
            thread_id: threadId,
            api_session_id: null, // Do not include API session chats.
            id: { lte: Number(chatId) },
          },
          null,
          { id: "asc" },
        );

        const { thread: newThread, message: threadError } =
          await WorkspaceThread.new(workspace, user?.id);
        if (threadError)
          return response.status(500).json({ error: threadError });

        let lastMessageText = "";
        const chatsData = chatsToFork.map((chat) => {
          const chatResponse = safeJsonParse(chat.response, {});
          if (chatResponse?.text) lastMessageText = chatResponse.text;

          return {
            workspaceId: workspace.id,
            prompt: chat.prompt,
            response: JSON.stringify(chatResponse),
            user_id: user?.id,
            thread_id: newThread.id,
            include: true,
          };
        });
        await WorkspaceChats.bulkCreate(chatsData);
        await WorkspaceThread.update(newThread, {
          name: !!lastMessageText
            ? truncate(lastMessageText, 22)
            : "Forked Thread",
        });

        await EventLogs.logEvent(
          "thread_forked",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
            threadName: newThread.name,
          },
          user?.id,
        );
        response.status(200).json({ newThreadSlug: newThread.slug });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.put(
    "/workspace/workspace-chats/:id",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const user = await userFromSession(request, response);
        const validChat = await WorkspaceChats.get({
          id: Number(id),
          user_id: user?.id ?? null,
        });
        if (!validChat)
          return response
            .status(404)
            .json({ success: false, error: "Chat not found." });

        await WorkspaceChats._update(validChat.id, { include: false });
        response.json({ success: true, error: null });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.status(500).json({ success: false, error: "Server error" });
      }
    },
  );

  /** Handles the uploading and embedding in one-call by uploading via drag-and-drop in chat container. */
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

        const { success, reason, documents } = await Collector.processDocument(
          collectorFilename,
          { title: originalname },
        );
        if (!success || documents?.length === 0) {
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

        // Will delete the document from the entire system + wil unembed it.
        await purgeDocument(body.documentLocation);
        response.status(200).end();
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspace/:slug/prompt-history",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (_, response) => {
      try {
        response.status(200).json({
          history: await Workspace.promptHistory({
            workspaceId: response.locals.workspace.id,
          }),
        });
      } catch (error) {
        consoleLogger.error("Error fetching prompt history:", error);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspace/:slug/prompt-history",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      validWorkspaceSlug,
    ],
    async (_, response) => {
      try {
        response.status(200).json({
          success: await Workspace.deleteAllPromptHistory({
            workspaceId: response.locals.workspace.id,
          }),
        });
      } catch (error) {
        consoleLogger.error("Error clearing prompt history:", error);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspace/prompt-history/:id",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const { PromptHistory } = require("../models/promptHistory");
        response.status(200).json({
          success: await PromptHistory.delete({ id: Number(id) }),
        });
      } catch (error) {
        consoleLogger.error("Error deleting prompt history:", error);
        response.sendStatus(500);
      }
    },
  );

  /**
   * Searches for workspaces and threads by thread name or workspace name.
   * Only returns assets owned by the user (if multi-user mode is enabled).
   */
  app.post(
    "/workspace/search",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { searchTerm } = reqBody(request);
        const searchResults = await searchWorkspaceAndThreads(
          searchTerm,
          response.locals?.user,
        );
        response.status(200).json(searchResults);
      } catch (error) {
        consoleLogger.error("Error searching for workspaces:", error);
        response.sendStatus(500);
      }
    },
  );

  // SSE endpoint for embedding progress
  app.get(
    "/workspace/:slug/embed-progress",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const {
          addSSEConnection,
          removeSSEConnection,
        } = require("../utils/EmbeddingWorkerManager");

        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders();
        addSSEConnection(workspace.slug, response);
        request.on("close", () => {
          removeSSEConnection(workspace.slug, response);
        });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.status(500).end();
      }
    },
  );

  app.delete(
    "/workspace/:slug/embed-queue",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      validWorkspaceSlug,
    ],
    async (request, response) => {
      try {
        const workspace = response.locals.workspace;
        const { filename } = reqBody(request);
        if (!filename) {
          response
            .status(400)
            .json({ success: false, error: "Missing filename" });
          return;
        }

        const { removeQueuedFile } = require("../utils/EmbeddingWorkerManager");
        const sent = removeQueuedFile(workspace.slug, filename);
        response.status(200).json({ success: sent });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        response
          .status(500)
          .json({ success: false, error: "Internal server error", errorId });
      }
    },
  );

  app.get(
    "/workspace/:slug/is-agent-command-available",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (_, response) => {
      try {
        response.status(200).json({
          showAgentCommand: await Workspace.isAgentCommandAvailable(
            response.locals.workspace,
          ),
        });
      } catch (error) {
        consoleLogger.error(
          "Error checking if agent command is available:",
          error,
        );
        response.status(500).json({ showAgentCommand: true });
      }
    },
  );

  // Parsed Files in separate endpoint just to keep the workspace endpoints clean
  workspaceParsedFilesEndpoints(app);
}

module.exports = { workspaceEndpoints };
