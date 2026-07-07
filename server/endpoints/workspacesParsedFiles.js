// SPDX-License-Identifier: MIT
// Purpose: Endpoints for parsed workspace files (chat uploads) and their
//          mirror into the server uploads directory for the FilesystemSidebar.
// Docs: server/endpoints/workspacesParsedFiles.js.doc.md
const consoleLogger = require("../utils/logger/console.js");

const crypto = require("crypto");
const { reqBody, multiUserMode, userFromSession } = require("../utils/http");
const {
  handleFileUpload,
  mirrorToSupabase,
} = require("../utils/files/multer");
const { ParseJobs, JOB_STATUS } = require("../utils/parseJobs");
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
const { simpleRateLimit } = require("../utils/middleware/simpleRateLimit");
const fs = require("fs");
const path = require("path");
const { ensureStorageDir } = require("../utils/paths");

async function cleanupHotdirFile(request) {
  try {
    const filePath = request.file?.path;
    if (!filePath) return;
    await fs.promises.access(filePath);
    await fs.promises.rm(filePath, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Best-effort copy of a successfully parsed chat upload into the server's
 * uploads directory so it surfaces in the FilesystemSidebar (Issue #271).
 * Only runs for local disk uploads (request.file.path exists). Supabase
 * uploads are skipped because the sidebar reads from local storage.
 * @param {import("express").Request} request
 */
async function copyToUploads(request) {
  try {
    const filePath = request.file?.path;
    const filename = request.file?.filename;
    if (!filePath || !filename) return;
    try {
      await fs.promises.access(filePath);
    } catch {
      consoleLogger.info(
        "[copyToUploads] source file no longer exists (already processed by collector):",
        filePath,
      );
      return;
    }
    const uploadsDir = ensureStorageDir("uploads");
    const destPath = path.join(uploadsDir, filename);
    await fs.promises.copyFile(filePath, destPath);
  } catch (e) {
    consoleLogger.info("[copyToUploads] best-effort copy failed:", e.message);
  }
}

/**
 * Extracts the minimal set of upload fields the background parse pipeline
 * needs from a multer-populated request. The background job must NOT retain
 * the Express request object itself — it holds references to the socket,
 * headers, parsed body, session, etc., which would otherwise stay pinned in
 * memory for the lifetime of the job (potentially minutes for OCR-heavy
 * PDFs).
 *
 * The returned object is `{ file: {...} }`-shaped so the existing helpers
 * (`cleanupHotdirFile`, `copyToUploads`, `mirrorToSupabase`) work unchanged.
 *
 * @param {import("express").Request} request — multer-populated request.
 * @returns {{file: {path: string, filename: string, originalname: string, mimetype: string, size: number}}}
 */
function extractUpload(request) {
  return {
    file: {
      path: request.file?.path,
      filename: request.file?.filename,
      originalname: request.file?.originalname,
      mimetype: request.file?.mimetype,
      size: request.file?.size,
    },
  };
}

/**
 * Runs the full parse pipeline (collector parse → DB rows → uploads mirror →
 * Supabase mirror) for an already-received upload and records the outcome on
 * the parse job. Called WITHOUT await from the /parse endpoint so the HTTP
 * response returns as soon as the file is on disk.
 *
 * @param {string} jobId
 * @param {{file: object}} upload — minimal upload descriptor from
 *   extractUpload(). Never pass the Express request here: the job outlives
 *   the response and must not pin the request (socket/headers/body) in RAM.
 * @param {{workspace: object, user: object|null, thread: object|null}} ctx
 */
async function runParseJob(jobId, upload, ctx) {
  const { workspace, user, thread } = ctx;
  const originalname = upload.file?.originalname || "unknown";
  const collectorFilename = upload.file?.filename || originalname;
  await ParseJobs.markProcessing(jobId);

  try {
    const Collector = new CollectorApi();
    const processingOnline = await Collector.online();
    if (!processingOnline) {
      await cleanupHotdirFile(upload);
      await ParseJobs.markFailed(
        jobId,
        `Document processing API is not online. Document ${originalname} will not be parsed.`,
      );
      return;
    }

    // Durability mirror runs in parallel with parsing — neither blocks
    // the other and neither ever blocked the client's upload request.
    const mirrorPromise = mirrorToSupabase(upload).catch(() => {});

    const { success, reason, documents } =
      await Collector.parseDocument(collectorFilename);
    if (!success || !documents?.[0]) {
      await mirrorPromise;
      await cleanupHotdirFile(upload);
      await ParseJobs.markFailed(
        jobId,
        reason || "No document returned from collector",
      );
      return;
    }

    const files = [];
    const BATCH_SIZE = 5;
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (doc) => {
          const metadata = { ...doc };
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
      files.push(...batchResults);
    }

    // Mirror the local upload into the FilesystemSidebar uploads root and
    // wait for the Supabase mirror to settle — both best-effort.
    await Promise.all([copyToUploads(upload), mirrorPromise]);

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
    await ParseJobs.markCompleted(jobId, files);
  } catch (e) {
    await cleanupHotdirFile(upload);
    const errorId = crypto.randomUUID();
    consoleLogger.error(`[parse job error ${errorId}]`, e);
    await ParseJobs.markFailed(jobId, `Internal server error (${errorId})`).catch(
      () => {},
    );
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
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
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
        consoleLogger.error(e.message, e);
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
      simpleRateLimit({
        bucket: "workspace-embed-parsed",
        max: 20,
        windowMs: 60 * 1000,
      }),
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
        consoleLogger.error(e.message, e);
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
      simpleRateLimit({
        bucket: "workspace-parse",
        max: 30,
        windowMs: 60 * 1000,
      }),
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
        const originalname = request.file?.originalname || "unknown";

        // Resolve the thread before responding — it's a fast DB lookup and
        // the background job needs it for row scoping.
        const { threadSlug = null } = reqBody(request);
        const thread = threadSlug
          ? await WorkspaceThread.get({
              slug: String(threadSlug),
              workspace_id: workspace.id,
              user_id: user?.id || null,
            })
          : null;

        // Back-compat: ?sync=true retains the old blocking behavior for
        // existing API consumers that expect files in the response.
        const sync = String(request.query?.sync) === "true";

        const job = await ParseJobs.create({
          workspaceId: workspace.id,
          userId: user?.id || null,
          originalname,
        });

        // Detach the upload descriptor from the request so the background
        // job never pins the Express request (socket/headers/body) in RAM.
        const upload = extractUpload(request);

        if (sync) {
          await runParseJob(job.id, upload, { workspace, user, thread });
          const finished = await ParseJobs.get(job.id, {
            workspaceId: workspace.id,
            userId: user?.id || null,
          });
          if (finished?.status === JOB_STATUS.COMPLETED) {
            return response
              .status(200)
              .json({ success: true, error: null, files: finished.files });
          }
          return response.status(500).json({
            success: false,
            error: finished?.error || "Parsing failed",
          });
        }

        // Async (default): the file is safely on local disk — respond NOW.
        // Parsing, OCR, DB rows and the Supabase mirror run in the
        // background; the client polls /parse-status/:jobId.
        runParseJob(job.id, upload, { workspace, user, thread }).catch(
          (e) => {
            consoleLogger.error("[parse job] unhandled error", e);
            ParseJobs.markFailed(job.id, "Internal server error").catch(
              () => {},
            );
          },
        );

        return response.status(202).json({
          success: true,
          error: null,
          jobId: job.id,
        });
      } catch (e) {
        await cleanupHotdirFile(request);
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        return response.status(500).json({
          success: false,
          error: "Internal server error",
          errorId,
        });
      }
    },
  );

  app.get(
    "/workspace/:slug/parse-status/:jobId",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceSlug,
      // Generous cap for a polling endpoint: the frontend polls one job
      // every ~1.5s, so even ~5 concurrent uploads stay well under the
      // limit while scripted abuse is cut off.
      simpleRateLimit({
        bucket: "workspace-parse-status",
        max: 240,
        windowMs: 60 * 1000,
      }),
    ],
    async function (request, response) {
      try {
        const { jobId } = request.params;
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const job = await ParseJobs.get(String(jobId), {
          workspaceId: workspace.id,
          userId: multiUserMode(response) ? user?.id || null : null,
        });

        if (!job)
          return response
            .status(404)
            .json({ success: false, error: "Job not found" });

        return response.status(200).json({
          success: true,
          status: job.status,
          files: job.status === JOB_STATUS.COMPLETED ? job.files : null,
          error: job.status === JOB_STATUS.FAILED ? job.error : null,
        });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
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
