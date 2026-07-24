// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const {
  multiUserMode,
  userFromSession,
  reqBody,
  safeJsonParse,
} = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { EventLogs } = require("../models/eventLogs");
const { WorkspaceThread } = require("../models/workspaceThread");
const { WorkspaceThreadFolder } = require("../models/workspaceThreadFolder");
const {
  validWorkspaceSlug,
  validWorkspaceAndThreadSlug,
} = require("../utils/middleware/validWorkspace");
const { WorkspaceChats } = require("../models/workspaceChats");
const { convertToChatHistory } = require("../utils/helpers/chat/responses");
const { getModelTag } = require("./utils");
const prisma = require("../utils/prisma");
const { Prisma } = require("@prisma/client");

function workspaceThreadEndpoints(app) {
  if (!app) return;

  app.post(
    "/workspace/:slug/thread/new",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { thread, message } = await WorkspaceThread.new(
          workspace,
          user?.id,
        );
        await Telemetry.sendTelemetry(
          "workspace_thread_created",
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
          "workspace_thread_created",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
          },
          user?.id,
        );
        response.status(200).json({ thread, message });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspace/:slug/threads",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        // Sort by lastUpdatedAt desc so recently active threads appear first.
        // Threads without lastUpdatedAt fall back to createdAt via the DB default.
        const threads = await WorkspaceThread.where(
          {
            workspace_id: workspace.id,
            user_id: user?.id || null,
          },
          null, // limit
          { lastUpdatedAt: "desc" }, // recently active threads first
        );

        const folders = await WorkspaceThreadFolder.where({
          workspace_id: workspace.id,
          user_id: user?.id ?? null,
        });

        const defaultThreadChatCount = await WorkspaceChats.count({
          workspaceId: workspace.id,
          user_id: user?.id || null,
          thread_id: null,
          api_session_id: null,
          include: true,
        });

        response.status(200).json({ threads, folders, defaultThreadChatCount });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspace/:slug/threads/search",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const query = (request.query.q || "").toString().trim();
        if (!query) {
          return response.status(200).json({ results: [] });
        }

        const workspace = response.locals.workspace;
        const user = await userFromSession(request, response);
        const userId = user?.id ?? null;
        const lowerPattern = `%${query.toLowerCase()}%`;

        const threadUserFilter =
          userId !== null
            ? Prisma.sql`AND t.user_id = ${userId}`
            : Prisma.sql`AND t.user_id IS NULL`;
        const chatUserFilterC =
          userId !== null
            ? Prisma.sql`AND c.user_id = ${userId}`
            : Prisma.sql`AND c.user_id IS NULL`;
        const chatUserFilterC2 =
          userId !== null
            ? Prisma.sql`AND c2.user_id = ${userId}`
            : Prisma.sql`AND c2.user_id IS NULL`;

        const rows = await prisma.$queryRaw`
          SELECT t.id, t.name, t.slug, t.workspace_id, t.user_id, t.folder_id, t.createdAt, t.lastUpdatedAt,
            CASE WHEN LOWER(t.name) LIKE ${lowerPattern} THEN 1 ELSE 0 END as nameMatch,
            (
              SELECT SUBSTR(c2.prompt, 1, 120)
              FROM workspace_chats c2
              WHERE c2.thread_id = t.id
                ${chatUserFilterC2}
                AND c2.include = 1
                AND (LOWER(c2.prompt) LIKE ${lowerPattern} OR LOWER(c2.response) LIKE ${lowerPattern})
              LIMIT 1
            ) as contentSnippet
          FROM workspace_threads t
          WHERE t.workspace_id = ${workspace.id}
            ${threadUserFilter}
            AND (
              LOWER(t.name) LIKE ${lowerPattern}
              OR EXISTS (
                SELECT 1 FROM workspace_chats c
                WHERE c.thread_id = t.id
                  ${chatUserFilterC}
                  AND c.include = 1
                  AND (LOWER(c.prompt) LIKE ${lowerPattern} OR LOWER(c.response) LIKE ${lowerPattern})
              )
            )
          ORDER BY nameMatch DESC, t.lastUpdatedAt DESC
          LIMIT 50
        `;

        const results = Array.isArray(rows)
          ? rows.map((r) => ({
              id: Number(r.id),
              name: r.name,
              slug: r.slug,
              workspace_id: Number(r.workspace_id),
              user_id: r.user_id !== null ? Number(r.user_id) : null,
              folder_id: r.folder_id !== null ? Number(r.folder_id) : null,
              createdAt: r.createdAt,
              lastUpdatedAt: r.lastUpdatedAt,
              nameMatch: Boolean(r.nameMatch),
              contentSnippet: r.contentSnippet || null,
            }))
          : [];

        response.status(200).json({ results });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspace/:slug/thread/:threadSlug",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (_, response) => {
      try {
        const thread = response.locals.thread;
        await WorkspaceThread.delete({ id: thread.id });
        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspace/:slug/thread-bulk-delete",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { slugs = [] } = reqBody(request);
        if (!Array.isArray(slugs) || slugs.length === 0)
          return response.sendStatus(200);

        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        await WorkspaceThread.delete({
          slug: { in: slugs },
          user_id: user?.id ?? null,
          workspace_id: workspace.id,
        });
        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/workspace/:slug/thread/:threadSlug/chats",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const thread = response.locals.thread;
        const history = await WorkspaceChats.where(
          {
            workspaceId: workspace.id,
            user_id: user?.id || null,
            thread_id: thread.id,
            api_session_id: null,
            include: true,
          },
          null,
          { id: "asc" },
        );

        response.status(200).json({ history: convertToChatHistory(history) });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/:slug/thread/:threadSlug/update",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (request, response) => {
      try {
        const data = reqBody(request);
        const currentThread = response.locals.thread;
        const { thread, message } = await WorkspaceThread.update(
          currentThread,
          data,
        );
        response.status(200).json({ thread, message });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspace/:slug/thread/:threadSlug/delete-edited-chats",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
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
        const thread = response.locals.thread;

        await WorkspaceChats.delete({
          workspaceId: Number(workspace.id),
          thread_id: Number(thread.id),
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
    "/workspace/:slug/thread/:threadSlug/update-chat",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (request, response) => {
      try {
        const { chatId, newText = null, role = "assistant" } = reqBody(request);
        if (!chatId || isNaN(Number(chatId)))
          throw new Error("Valid chatId is required.");
        if (!newText || !String(newText).trim())
          throw new Error("Cannot save empty edit");

        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const thread = response.locals.thread;
        const existingChat = await WorkspaceChats.get({
          workspaceId: workspace.id,
          thread_id: thread.id,
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

  // ── Thread Folder endpoints ──────────────────────────────────────────────

  app.post(
    "/workspace/:slug/thread-folder/new",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { name } = reqBody(request);
        const { folder, message } = await WorkspaceThreadFolder.new(
          workspace,
          user?.id ?? null,
          name,
        );
        response.status(200).json({ folder, message });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/:slug/thread-folder/:folderId/update",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { folderId } = request.params;
        const workspace = response.locals.workspace;
        const user = await userFromSession(request, response);
        const data = reqBody(request);
        const { folder, message } = await WorkspaceThreadFolder.update(
          folderId,
          data,
          workspace.id,
          user?.id ?? null,
        );
        response.status(200).json({ folder, message });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/workspace/:slug/thread-folder/:folderId",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { folderId } = request.params;
        const workspace = response.locals.workspace;
        const user = await userFromSession(request, response);
        const success = await WorkspaceThreadFolder.delete(
          folderId,
          workspace.id,
          user?.id ?? null,
        );
        if (!success) return response.sendStatus(500);
        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/:slug/thread/:threadSlug/assign-folder",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (request, response) => {
      try {
        const thread = response.locals.thread;
        const { folderId } = reqBody(request);
        const success = await WorkspaceThreadFolder.assignThread(
          thread.id,
          folderId ?? null,
        );
        if (!success) return response.sendStatus(500);
        response.sendStatus(200);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );
}

module.exports = { workspaceThreadEndpoints };
