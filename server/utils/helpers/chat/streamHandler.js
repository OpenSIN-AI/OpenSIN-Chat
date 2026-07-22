// SPDX-License-Identifier: MIT
/**
 * streamChatHandler
 * -----------------
 * Shared request handler for all SSE-based chat routes. Both the plain-
 * workspace and thread variants used to duplicate ~100 lines of identical
 * logic: input validation, SSE header setup, heartbeat lifecycle, rate-quota
 * check, abort-controller wiring, stream dispatch, telemetry, and error
 * handling. Any fix applied to one variant had to be manually applied to the
 * other — this helper eliminates that coupling.
 *
 * Usage:
 *   await streamChatHandler(request, response, { thread: null });     // workspace
 *   await streamChatHandler(request, response, { thread: <Thread> }); // thread
 *
 * The only difference between the two routes is:
 *   1. Whether `thread` is present (passed down to streamChatWithWorkspace).
 *   2. Whether `WorkspaceThread.autoRenameThread` is invoked after streaming.
 *   3. The extra `thread` field on the EventLogs payload.
 */

const crypto = require("node:crypto");
const { v4: uuidv4 } = require("uuid");
const consoleLogger = require("../../logger/console.js");

const { reqBody, userFromSession, multiUserMode } = require("../../http");
const { User } = require("../../../models/user");
const { Telemetry } = require("../../../models/telemetry");
const { EventLogs } = require("../../../models/eventLogs");
const { WorkspaceThread } = require("../../../models/workspaceThread");
const { streamChatWithWorkspace } = require("../../chats/stream");
const { writeResponseChunk } = require("./responses");
const { startSSEHeartbeat } = require("../sse");
const { getModelTag } = require("../../../endpoints/utils");

// Hard cap mirrored from chat.js. A single source of truth here so any
// change is automatically reflected in both routes.
const CHAT_MESSAGE_MAX_LENGTH = 32_000;

/**
 * @param {import("express").Request}  request
 * @param {import("express").Response} response
 * @param {{ thread?: object|null }}   opts
 */
async function streamChatHandler(request, response, { thread = null } = {}) {
  let stopHeartbeat = null;
  try {
    // PERF: open SSE as early as possible so the client gets headers in ms,
    // then validate. Body is already buffered by express.json.
    const { message, attachments = [], notebookMode = "chat" } = reqBody(request);
    const workspace = response.locals.workspace;

    // --- Input validation (sync, before any await) --------------------------
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

    // --- SSE setup ----------------------------------------------------------
    response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Connection", "keep-alive");
    // Hint reverse proxies / CF not to buffer SSE
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();
    stopHeartbeat = startSSEHeartbeat(response);

    // Session + quota after headers so TTFB is not blocked by DB auth round-trip
    const user = await userFromSession(request, response);

    // --- Daily quota guard --------------------------------------------------
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

    // --- Abort wiring -------------------------------------------------------
    const abortController = new AbortController();
    request.on("close", () => abortController.abort("client-disconnect"));

    // --- Stream -------------------------------------------------------------
    await streamChatWithWorkspace(
      response,
      workspace,
      message,
      workspace?.chatMode,
      user,
      thread,
      attachments,
      abortController,
      notebookMode,
    );
    stopHeartbeat();

    // --- Thread auto-rename (thread-route only) -----------------------------
    if (thread) {
      await WorkspaceThread.autoRenameThread({
        thread,
        workspace,
        user,
        prompt: message,
        onRename: (renamed) => {
          if (!renamed) return;
          writeResponseChunk(response, {
            action: "rename_thread",
            thread: { slug: renamed.slug, name: renamed.name },
          });
        },
      });
    }

    // --- Telemetry & event log ---------------------------------------------
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
        ...(thread ? { thread: thread.name } : {}),
        chatModel: workspace?.chatModel || "System Default",
      },
      user?.id,
    );

    if (!response.writableEnded) response.end();
  } catch (e) {
    if (stopHeartbeat) stopHeartbeat();
    const id = crypto.randomUUID();
    consoleLogger.error(`[chat SSE error id=${id}]`, e);
    // Surface the server-generated error id to the client via a dedicated
    // `errorId` field. The generic `error` string intentionally hides all
    // implementation details (no stacktrace/message), but the stable id lets
    // users quote it in support tickets so we can correlate it with the
    // server log line above. NOTE: we cannot reuse `id` for this — the
    // frontend consumes `uuid` as the message key and never reads `id`.
    writeResponseChunk(response, {
      id,
      errorId: id,
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: "Internal error",
    });
    if (!response.writableEnded) response.end();
  }
}

module.exports = { streamChatHandler, CHAT_MESSAGE_MAX_LENGTH };
