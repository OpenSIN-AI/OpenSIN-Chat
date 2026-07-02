// SPDX-License-Identifier: MIT
const path = require("path");
const fs = require("fs");
const consoleLogger = require("../../utils/logger/console.js");
const { userFromSession, safeJsonParse } = require("../../utils/http");
const { Workspace } = require("../../models/workspace");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { validWorkspaceSlug } = require("../../utils/middleware/validWorkspace");
const { handlePfpUpload } = require("../../utils/files/multer");
const {
  determineWorkspacePfpFilepath,
  fetchPfp,
} = require("../../utils/files/pfp");
const { getStoragePath } = require("../../utils/paths");
const { normalizePath, isWithin } = require("../../utils/files");
const { getTTSProvider } = require("../../utils/TextToSpeech");
const { responseCache, cacheSet } = require("./shared");

// Precompiled once at module load instead of on every TTS request. The keyword
// list is a fixed constant (never user input), so these patterns are stable.
const THOUGHT_KEYWORDS = ["thought_chain", "thought", "thinking", "think"];
// Matches a fully-closed <keyword>...</keyword> block.
const THOUGHT_BLOCK_REGEXES = THOUGHT_KEYWORDS.map(
  (keyword) =>
    new RegExp(
      `<${keyword}\\s*(?:[^>]*?)?>[\\s\\S]*?<\\/${keyword}\\s*(?:[^>]*?)?>`,
      "gi",
    ),
);
// Matches an unclosed <keyword>... that runs to end of string.
const THOUGHT_OPEN_REGEXES = THOUGHT_KEYWORDS.map(
  (keyword) => new RegExp(`<${keyword}\\s*(?:[^>]*?)?>([\\s\\S]*)$`, "gi"),
);
const RESPONSE_TAG_REGEX = /<\/?(response|answer)\s*(?:[^>]*?)?>/gi;
const WHITESPACE_REGEX = /\s+/g;

function workspaceMediaEndpoints(app) {
  if (!app) return;

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

        let text = rawText;
        for (const regex of THOUGHT_BLOCK_REGEXES) {
          text = text.replace(regex, " ");
        }
        for (const regex of THOUGHT_OPEN_REGEXES) {
          text = text.replace(regex, " ");
        }
        text = text.replace(RESPONSE_TAG_REGEX, " ");
        text = text.replace(WHITESPACE_REGEX, " ").trim();
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
}

module.exports = { workspaceMediaEndpoints };
