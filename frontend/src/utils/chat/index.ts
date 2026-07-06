// SPDX-License-Identifier: MIT
import { THREAD_RENAME_EVENT } from "@/components/Sidebar/ActiveWorkspaces/ThreadContainer";
import { emitAssistantMessageCompleteEvent } from "@/components/contexts/TTSProvider";
export const ABORT_STREAM_EVENT = "abort-chat-stream";

// For handling of chat responses in the frontend by their various types.
export default function handleChat(
  chatResult,
  setLoadingResponse,
  setChatHistory,
  remHistory,
  _chatHistory,
  setWebsocket,
) {
  const {
    uuid,
    textResponse,
    type,
    sources = [],
    error,
    errorId = null,
    close,
    animate = false,
    chatId = null,
    action = null,
    metrics = {},
    routedTo = null,
  } = chatResult;

  const chatHistory = [..._chatHistory];

  if (type === "modelRouteNotification") {
    setChatHistory((prev) => [
      ...prev,
      {
        type: "modelRouteNotification",
        uuid,
        routedTo,
        role: "assistant",
      },
    ]);
    return;
  }

  if (type === "abort" || type === "statusResponse") {
    setLoadingResponse(false);
    setChatHistory((prev) => {
      const withoutPending = prev[prev.length - 1]?.pending
        ? prev.slice(0, -1)
        : prev;
      return [
        ...withoutPending,
        {
          type,
          uuid,
          content: textResponse,
          role: "assistant",
          sources,
          closed: true,
          error,
          errorId,
          animate,
          pending: false,
          metrics,
        },
      ];
    });
    chatHistory.push({
      type,
      uuid,
      content: textResponse,
      role: "assistant",
      sources,
      closed: true,
      error,
      errorId,
      animate,
      pending: false,
      metrics,
    });
  } else if (type === "textResponse") {
    setLoadingResponse(false);
    setChatHistory((prev) => {
      const withoutPending = prev[prev.length - 1]?.pending
        ? prev.slice(0, -1)
        : prev;
      return [
        ...withoutPending,
        {
          uuid,
          content: textResponse,
          role: "assistant",
          sources,
          closed: close,
          error,
          animate: !close,
          pending: false,
          chatId,
          metrics,
        },
      ];
    });
    chatHistory.push({
      uuid,
      content: textResponse,
      role: "assistant",
      sources,
      closed: close,
      error,
      animate: !close,
      pending: false,
      chatId,
      metrics,
    });
    emitAssistantMessageCompleteEvent(chatId);
  } else if (
    type === "textResponseChunk" ||
    type === "finalizeResponseStream"
  ) {
    // Use functional setState so we always operate on the LATEST chatHistory.
    // The previous implementation used a stale `_chatHistory` closure variable
    // that was captured once at the start of `fetchReply` and never updated
    // between chunks — this caused `findIndex(uuid)` to always return -1,
    // so every streaming chunk created a NEW message with just the delta
    // text instead of appending to the existing message. The result was that
    // only the last chunk's text was visible to the user during SSE streaming.
    setChatHistory((prev) => {
      const chatIdx = prev.findIndex((chat) => chat.uuid === uuid);
      if (chatIdx !== -1) {
        const existingHistory = { ...prev[chatIdx] };
        let updatedHistory;

        // If the response is finalized, we can set the loading state to false.
        // and append the metrics to the history.
        if (type === "finalizeResponseStream") {
          updatedHistory = {
            ...existingHistory,
            closed: close,
            animate: !close,
            pending: false,
            chatId,
            metrics,
          };

          // Update the preceding user prompt with the chatId.
          // Guard against chatIdx === 0 (no preceding message) to avoid
          // setting a property at index -1 on the array.
          // NOTE: Do NOT mutate `prev` directly — React may reuse the array.
          // The update is applied to `next` below instead.

          emitAssistantMessageCompleteEvent(chatId);
          setLoadingResponse(false);
        } else {
          updatedHistory = {
            ...existingHistory,
            content: (existingHistory.content || "") + textResponse,
            ...(sources && sources.length > 0 ? { sources } : {}),
            error,
            closed: close,
            animate: !close,
            pending: false,
            chatId,
            metrics,
          };
        }
        const next = [...prev];
        next[chatIdx] = updatedHistory;
        if (chatIdx > 0 && type === "finalizeResponseStream") {
          next[chatIdx - 1] = { ...prev[chatIdx - 1], chatId };
        }
        return next;
      }
      // First chunk for this uuid — create a new assistant message.
      return [
        ...prev,
        {
          uuid,
          sources,
          error,
          content: textResponse || "",
          role: "assistant",
          closed: close,
          animate: !close,
          pending: false,
          chatId,
          metrics,
        },
      ];
    });
  } else if (type === "agentInitWebsocketConnection") {
    setWebsocket(chatResult.websocketUUID);
  } else if (type === "stopGeneration") {
    setChatHistory((prev) => {
      if (prev.length === 0) return prev;
      const chatIdx = prev.length - 1;
      const existingHistory = { ...prev[chatIdx] };
      const updatedHistory = {
        ...existingHistory,
        sources: [],
        closed: true,
        error: null,
        animate: false,
        pending: false,
        metrics,
      };
      const next = [...prev];
      next[chatIdx] = updatedHistory;
      return next;
    });
    setLoadingResponse(false);
  }

  // Action Handling via special 'action' attribute on response.
  if (action === "reset_chat") setChatHistory([]);

  // If thread was updated automatically based on chat prompt
  // then we can handle the updating of the thread here.
  if (action === "rename_thread") {
    if (!!chatResult?.thread?.slug && chatResult.thread.name) {
      window.dispatchEvent(
        new CustomEvent(THREAD_RENAME_EVENT, {
          detail: {
            threadSlug: chatResult.thread.slug,
            newName: chatResult.thread.name,
          },
        }),
      );
    }
  }
}

export function getWorkspaceSystemPrompt(workspace) {
  return (
    workspace?.openAiPrompt ??
    "Given the following conversation, relevant context, and a follow up question, reply with an answer to the current question the user is asking. Return only your response to the question given the above information following the users instructions as needed."
  );
}

export function chatQueryRefusalResponse(workspace) {
  return (
    workspace?.queryRefusalResponse ??
    "There is no relevant information in this workspace to answer your query."
  );
}
