// SPDX-License-Identifier: MIT
const {
  userFromSession,
  multiUserMode,
  safeJsonParse,
} = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { WorkspaceChats } = require("../models/workspaceChats");
const { Workspace } = require("../models/workspace");
const { ScheduledJobRun } = require("../models/scheduledJobRun");
const createFilesLib = require("../utils/agents/aibitat/plugins/create-files/lib");
const { Telemetry } = require("../models/telemetry");

// Extensions the browser can render inline (PDF for sidebar iframe,
// raster images for <img>). SVG excluded: it can carry <script> tags
// (stored-XSS vector). html/htm excluded for the same reason.
const INLINE_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "gif", "webp"]);

/**
 * Builds the response headers for a generated-file download.
 *
 * Defense in depth — these headers keep file responses inert even if the
 * INLINE_EXTENSIONS set is ever widened by mistake:
 * - `X-Content-Type-Options: nosniff` stops browsers from re-interpreting
 *   a file as HTML/JS based on content sniffing.
 * - `Content-Security-Policy: sandbox; default-src 'none'` neutralizes any
 *   scripts inside an inline-rendered document (SVG/HTML) and isolates it
 *   from the app origin.
 * - `Cache-Control: private, max-age=0, must-revalidate` prevents shared
 *   caches/proxies from storing auth-protected files.
 * - `Cross-Origin-Resource-Policy: same-origin` blocks other origins from
 *   embedding these files.
 *
 * Exported separately so it can be unit-tested without spinning up Express.
 *
 * @param {{ extension: string, mimeType: string, safeFilename: string, byteLength: number }} file
 * @returns {Record<string, string|number>} headers to set on the response
 */
function buildFileResponseHeaders({
  extension,
  mimeType,
  safeFilename,
  byteLength,
}) {
  const ext = String(extension || "").toLowerCase();
  const disposition = INLINE_EXTENSIONS.has(ext) ? "inline" : "attachment";
  return {
    "Content-Type": mimeType,
    "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
    "Content-Length": byteLength,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Cache-Control": "private, max-age=0, must-revalidate",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}

/**
 * Endpoints for serving agent-generated files (PPTX, etc.) with authentication
 * and ownership validation.
 */
function agentFileServerEndpoints(app) {
  if (!app) return;

  /**
   * Download a generated file by its storage filename.
   * Validates that the requesting user has access to the workspace
   * where the file was generated.
   */
  app.get(
    "/agent-skills/generated-files/:filename",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { filename } = request.params;
        if (!filename)
          return response.status(400).json({ error: "Filename is required" });

        // Validate filename format
        const parsed = createFilesLib.parseFilename(filename);
        if (!parsed) {
          return response
            .status(400)
            .json({ error: "Invalid filename format" });
        }

        // Find a chat or scheduled job run that references this file
        const fileSource = await findFileSource(filename, {
          user,
          isMultiUser: multiUserMode(response),
        });

        if (!fileSource) {
          return response.status(404).json({
            error: "File not found or access denied",
          });
        }

        // Retrieve the file from storage
        const fileData = await createFilesLib.getGeneratedFile(filename);
        if (!fileData) {
          return response
            .status(404)
            .json({ error: "File not found in storage" });
        }

        // Get mime type and set headers for download
        const mimeType = createFilesLib.getMimeType(`.${parsed.extension}`);
        const safeFilename = createFilesLib.sanitizeFilenameForHeader(
          fileSource.displayFilename || filename,
        );
        const headers = buildFileResponseHeaders({
          extension: parsed.extension,
          mimeType,
          safeFilename,
          byteLength: fileData.buffer.length,
        });
        for (const [name, value] of Object.entries(headers)) {
          response.setHeader(name, value);
        }
        response.send(fileData.buffer);
        Telemetry.sendTelemetry("agent_generated_file_downloaded", {
          type: mimeType,
        }).catch((err) => { console.error("Telemetry error:", err.message); });
        return;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[agentFileServer] Download error:", error.message);
        return response.status(500).json({ error: "Failed to download file" });
      }
    },
  );
}

/**
 * Locates the source record (a workspace chat or a scheduled job run) that
 * references the given storage filename, and confirms the requester has access.
 *
 * Search order:
 *   1. Workspace chats the user can access (per multi-user permissions).
 *   2. Scheduled job runs — single-user only, so no per-user access check.
 *
 * @param {string} storageFilename
 * @param {{ user: object|null, isMultiUser: boolean }} ctx
 * @returns {Promise<{workspaceId: number|null, displayFilename: string}|null>}
 */
async function findFileSource(storageFilename, { user, isMultiUser }) {
  try {
    const fromChat = await findInWorkspaceChats(storageFilename, {
      user,
      isMultiUser,
    });
    if (fromChat) return fromChat;

    if (isMultiUser) return null;

    return await findInScheduledJobRuns(storageFilename);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[findFileSource] Error:", error.message);
    return null;
  }
}

// Search workspace chats the user has access to. In single-user mode all
// workspaces are accessible; in multi-user mode only workspaces assigned to
// the user are. Returns the matching chat's workspace + display filename.
async function findInWorkspaceChats(storageFilename, { user, isMultiUser }) {
  const workspaces =
    isMultiUser && user
      ? await Workspace.whereWithUser(user)
      : await Workspace.where();

  const workspaceIds = workspaces.map((w) => w.id);
  if (workspaceIds.length === 0) return null;

  // DB-level filter so we don't load every chat into memory.
  const chats = await WorkspaceChats.where({
    workspaceId: { in: workspaceIds },
    include: true,
    response: { contains: storageFilename },
  });

  for (const chat of chats) {
    const { outputs = [] } = safeJsonParse(chat.response, { outputs: [] });
    const output = outputs.find(
      (o) => o?.payload?.storageFilename === storageFilename,
    );
    if (!output) continue;
    return {
      workspaceId: chat.workspaceId,
      displayFilename:
        output.payload.filename || output.payload.displayFilename,
    };
  }

  return null;
}

// Search completed scheduled job runs. Scheduled jobs are single-user only,
// so this skips access control. Returns the matching run's display filename.
async function findInScheduledJobRuns(storageFilename) {
  const runs = await ScheduledJobRun.where({
    status: "completed",
    result: { contains: storageFilename },
  });

  for (const run of runs) {
    const { outputs = [] } = safeJsonParse(run.result, { outputs: [] });
    const output = outputs.find(
      (o) => o?.payload?.storageFilename === storageFilename,
    );
    if (!output) continue;
    return {
      workspaceId: null,
      displayFilename: output.payload.filename || storageFilename,
    };
  }

  return null;
}

module.exports = {
  agentFileServerEndpoints,
  buildFileResponseHeaders,
  INLINE_EXTENSIONS,
};
