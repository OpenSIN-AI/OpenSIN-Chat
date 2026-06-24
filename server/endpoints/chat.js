// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const crypto = require("node:crypto");
const { v4: uuidv4 } = require("uuid");
const { reqBody, userFromSession, multiUserMode } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");
const { streamChatWithWorkspace } = require("../utils/chats/stream");
const {
  ROLES,
  flexUserRoleValid,
} = require("../utils/middleware/multiUserProtected");
const { EventLogs } = require("../models/eventLogs");
const {
  validWorkspaceAndThreadSlug,
  validWorkspaceSlug,
} = require("../utils/middleware/validWorkspace");
const { writeResponseChunk } = require("../utils/helpers/chat/responses");
const { startSSEHeartbeat } = require("../utils/helpers/sse");
const { WorkspaceThread } = require("../models/workspaceThread");
const { User } = require("../models/user");
const { getModelTag } = require("./utils");
const { simpleRateLimit } = require("../utils/middleware/simpleRateLimit");

// Hard cap on a single chat message. Without this a user can paste 50000+
// chars which costs the LLM provider real money, can stall the SSE parser,
// and breaks downstream chat-history pagination that assumes a sane upper
// bound. The frontend cap (PROMPT_INPUT_MAX_LENGTH) is enforced in
// TextArea.tsx, but the server must police this independently because the
// limit can be bypassed with raw curl or any other non-browser client.
const CHAT_MESSAGE_MAX_LENGTH = 32_000;

function chatEndpoints(app) {
  if (!app) return;

  app.post(
    "/workspace/:slug/stream-chat",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceSlug,
      simpleRateLimit({
        bucket: "chat-stream",
        max: 60,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      let stopHeartbeat = null;
      try {
        const user = await userFromSession(request, response);
        const { message, attachments = [] } = reqBody(request);
        const workspace = response.locals.workspace;

        if (typeof message !== "string" || message.trim().length === 0) {
          response.status(400).json({
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: "Message is empty.",
          });
          return;
        }

        if (message.length > CHAT_MESSAGE_MAX_LENGTH) {
          response.status(413).json({
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: `Message too long. The maximum permitted length is ${CHAT_MESSAGE_MAX_LENGTH} characters.`,
          });
          return;
        }

        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders();
        stopHeartbeat = startSSEHeartbeat(response);

        if (multiUserMode(response) && !(await User.canSendChat(user))) {
          stopHeartbeat();
          writeResponseChunk(response, {
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: `You have met your maximum 24 hour chat quota of ${user.dailyMessageLimit} chats. Try again later.`,
          });
          return;
        }

        const abortController = new AbortController();
        request.on("close", () => abortController.abort("client-disconnect"));

        await streamChatWithWorkspace(
          response,
          workspace,
          message,
          workspace?.chatMode,
          user,
          null,
          attachments,
          abortController,
        );
        stopHeartbeat();
        await Telemetry.sendTelemetry("sent_chat", {
          multiUserMode: multiUserMode(response),
          LLMSelection: process.env.LLM_PROVIDER || "openai",
          Embedder: process.env.EMBEDDING_ENGINE || "inherit",
          VectorDbSelection: process.env.VECTOR_DB || "lancedb",
          multiModal: Array.isArray(attachments) && attachments?.length !== 0,
          TTSSelection: process.env.TTS_PROVIDER || "native",
          LLMModel: getModelTag(),
        });

        await EventLogs.logEvent(
          "sent_chat",
          {
            workspaceName: workspace?.name,
            chatModel: workspace?.chatModel || "System Default",
          },
          user?.id,
        );
        if (!response.writableEnded) response.end();
      } catch (e) {
        if (stopHeartbeat) stopHeartbeat();
        const id = crypto.randomUUID();

        consoleLogger.error(`[chat SSE error id=${id}]`, e);
        writeResponseChunk(response, {
          id,
          type: "abort",
          textResponse: null,
          sources: [],
          close: true,
          error: "Internal error",
        });
        if (!response.writableEnded) response.end();
      }
    },
  );

  app.post(
    "/workspace/:slug/thread/:threadSlug/stream-chat",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
      simpleRateLimit({
        bucket: "chat-stream",
        max: 60,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      let stopHeartbeat = null;
      try {
        const user = await userFromSession(request, response);
        const { message, attachments = [] } = reqBody(request);
        const workspace = response.locals.workspace;
        const thread = response.locals.thread;

        if (typeof message !== "string" || message.trim().length === 0) {
          response.status(400).json({
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: "Message is empty.",
          });
          return;
        }

        if (message.length > CHAT_MESSAGE_MAX_LENGTH) {
          response.status(413).json({
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: `Message too long. The maximum permitted length is ${CHAT_MESSAGE_MAX_LENGTH} characters.`,
          });
          return;
        }

        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders();
        stopHeartbeat = startSSEHeartbeat(response);

        if (multiUserMode(response) && !(await User.canSendChat(user))) {
          stopHeartbeat();
          writeResponseChunk(response, {
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: `You have met your maximum 24 hour chat quota of ${user.dailyMessageLimit} chats. Try again later.`,
          });
          return;
        }

        const abortController = new AbortController();
        request.on("close", () => abortController.abort("client-disconnect"));

        await streamChatWithWorkspace(
          response,
          workspace,
          message,
          workspace?.chatMode,
          user,
          thread,
          attachments,
          abortController,
        );
        stopHeartbeat();

        // If thread was renamed emit event to frontend via special `action` response.
        await WorkspaceThread.autoRenameThread({
          thread,
          workspace,
          user,
          prompt: message,
          onRename: (thread) => {
            if (!thread) return;
            writeResponseChunk(response, {
              action: "rename_thread",
              thread: {
                slug: thread.slug,
                name: thread.name,
              },
            });
          },
        });

        await Telemetry.sendTelemetry("sent_chat", {
          multiUserMode: multiUserMode(response),
          LLMSelection: process.env.LLM_PROVIDER || "openai",
          Embedder: process.env.EMBEDDING_ENGINE || "inherit",
          VectorDbSelection: process.env.VECTOR_DB || "lancedb",
          multiModal: Array.isArray(attachments) && attachments?.length !== 0,
          TTSSelection: process.env.TTS_PROVIDER || "native",
          LLMModel: getModelTag(),
        });

        await EventLogs.logEvent(
          "sent_chat",
          {
            workspaceName: workspace.name,
            thread: thread.name,
            chatModel: workspace?.chatModel || "System Default",
          },
          user?.id,
        );
        if (!response.writableEnded) response.end();
      } catch (e) {
        if (stopHeartbeat) stopHeartbeat();
        const id = crypto.randomUUID();

        consoleLogger.error(`[chat SSE error id=${id}]`, e);
        writeResponseChunk(response, {
          id,
          type: "abort",
          textResponse: null,
          sources: [],
          close: true,
          error: "Internal error",
        });
        if (!response.writableEnded) response.end();
      }
    },
  );
}

module.exports = { chatEndpoints };
