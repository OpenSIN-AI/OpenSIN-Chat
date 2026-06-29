const crypto = require("crypto");
const consoleLogger = require("../../utils/logger/console.js");
const {
  reqBody,
  multiUserMode,
  userFromSession,
  safeJsonParse,
} = require("../../utils/http");
const { Workspace } = require("../../models/workspace");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { WorkspaceThread } = require("../../models/workspaceThread");
const { EventLogs } = require("../../models/eventLogs");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const {
  validWorkspaceSlug,
} = require("../../utils/middleware/validWorkspace");
const truncate = require("truncate");
const { searchWorkspaceAndThreads } = require("../../utils/helpers/search");

function workspaceMiscEndpoints(app) {
  if (!app) return;

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
            include: true,
            thread_id: threadId,
            api_session_id: null,
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
        const { PromptHistory } = require("../../models/promptHistory");
        response.status(200).json({
          success: await PromptHistory.delete({ id: Number(id) }),
        });
      } catch (error) {
        consoleLogger.error("Error deleting prompt history:", error);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/workspace/search",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { searchTerm } = reqBody(request);
        if (typeof searchTerm !== "string" || !searchTerm.trim()) {
          return response.status(400).json({
            error: "searchTerm is required and must be a non-empty string.",
          });
        }
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
        } = require("../../utils/EmbeddingWorkerManager");

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

        const { removeQueuedFile } = require("../../utils/EmbeddingWorkerManager");
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
        response.status(200).json({ showAgentCommand: true });
      }
    },
  );
}

module.exports = { workspaceMiscEndpoints };
