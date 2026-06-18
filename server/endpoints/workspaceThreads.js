// SPDX-License-Identifier: MIT
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
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        response.sendStatus(500).end();
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

        // ==========================================
        // <-- ÄNDERUNG: Sortierung der Threads
        // ==========================================
        // Wir übergeben als 3. Parameter das "orderBy" Objekt.
        // "desc" (descending) sorgt dafür, dass neue Threads oben andocken.
        const threads = await WorkspaceThread.where(
          {
            workspace_id: workspace.id,
            user_id: user?.id || null,
          },
          null, // limit
          { createdAt: "desc" }, // <-- ÄNDERUNG: Neueste Threads zuerst!
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
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        response.sendStatus(500).end();
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
        response.sendStatus(200).end();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        response.sendStatus(500).end();
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
          return response.sendStatus(200).end();

        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        await WorkspaceThread.delete({
          slug: { in: slugs },
          user_id: user?.id ?? null,
          workspace_id: workspace.id,
        });
        response.sendStatus(200).end();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        response.sendStatus(500).end();
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
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        response.sendStatus(500).end();
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
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        response.sendStatus(500).end();
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

        response.sendStatus(200).end();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        response.sendStatus(500).end();
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

        response.sendStatus(200).end();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        response.sendStatus(500).end();
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
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    },
  );

  app.post(
    "/workspace/:slug/thread-folder/:folderId/update",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { folderId } = request.params;
        const data = reqBody(request);
        const { folder, message } = await WorkspaceThreadFolder.update(
          folderId,
          data,
        );
        response.status(200).json({ folder, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    },
  );

  app.delete(
    "/workspace/:slug/thread-folder/:folderId",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { folderId } = request.params;
        const success = await WorkspaceThreadFolder.delete(folderId);
        if (!success) return response.sendStatus(500).end();
        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
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
        if (!success) return response.sendStatus(500).end();
        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    },
  );
}

module.exports = { workspaceThreadEndpoints };
