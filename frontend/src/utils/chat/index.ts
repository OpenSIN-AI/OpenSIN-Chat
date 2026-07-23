// SPDX-License-Identifier: MIT
import { THREAD_RENAME_EVENT } from "@/components/Sidebar/ActiveWorkspaces/ThreadContainer";
import { emitAssistantMessageCompleteEvent } from "@/components/contexts/TTSProvider";
export const ABORT_STREAM_EVENT = "abort-chat-stream";

interface ChatHistoryItem {
  uuid?: string;
  content?: string;
  role?: string;
  sources?: any[];
  closed?: boolean;
  error?: any;
  errorId?: string | null;
  animate?: boolean;
  pending?: boolean;
  chatId?: string | null;
  metrics?: Record<string, any>;
  type?: string;
  routedTo?: string | null;
  [key: string]: any;
}

interface ChatResult {
  uuid?: string;
  textResponse?: string;
  type?: string;
  sources?: any[];
  error?: any;
  errorId?: string | null;
  close?: boolean;
  animate?: boolean;
  chatId?: string | null;
  action?: string | null;
  metrics?: Record<string, any>;
  routedTo?: string | null;
  websocketUUID?: string;
  thread?: { slug?: string; name?: string };
  [key: string]: any;
}

// For handling of chat responses in the frontend by their various types.
export default function handleChat(
  chatResult: ChatResult,
  setLoadingResponse: (v: boolean) => void,
  setChatHistory: (fn: ChatHistoryItem[] | ((prev: ChatHistoryItem[]) => ChatHistoryItem[])) => void,
  remHistory: ChatHistoryItem[],
  _chatHistory: ChatHistoryItem[],
  setWebsocket: (v: any) => void,
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
    setChatHistory((prev: ChatHistoryItem[]) => [
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
    setChatHistory((prev: ChatHistoryItem[]) => {
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
    setChatHistory((prev: ChatHistoryItem[]) => {
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
    setChatHistory((prev: ChatHistoryItem[]) => {
      const chatIdx = prev.findIndex((chat: ChatHistoryItem) => chat.uuid === uuid);
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
        // Keep the preceding user prompt's chatId in sync so "Edit prompt"
        // is enabled as soon as the server assigns an id (not only at finalize).
        if (chatId && chatIdx > 0 && prev[chatIdx - 1]?.role === "user") {
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
    setChatHistory((prev: ChatHistoryItem[]) => {
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

  // --- Code Runner Events ---
  // Display runner status and output as ephemeral status messages in the chat.
  if (type === "codeRunnerStatus") {
    const runnerId = chatResult.runnerId || "runner";
    const status = chatResult.status || "unknown";
    const msg =
      status === "running"
        ? `▶ ${runnerId}: ${chatResult.message || "läuft…"}`
        : status === "done"
          ? `✓ ${runnerId}:fertig (exit ${chatResult.exitCode ?? 0})`
          : status === "unavailable"
            ? `⚠ ${runnerId}: ${chatResult.message || "nicht verfügbar"}`
            : `✗ ${runnerId}: ${chatResult.runnerError || "Fehler"}`;

    setChatHistory((prev: ChatHistoryItem[]) => [
      ...prev.filter((m: ChatHistoryItem) => !!m.content),
      {
        uuid,
        type: "statusResponse",
        content: msg,
        role: "assistant",
        sources: [],
        closed: true,
        error: null,
        animate: false,
        pending: false,
      },
    ]);

    if (status === "done" || status === "error" || status === "unavailable") {
      setLoadingResponse(false);
    }
  }

  if (type === "codeRunnerOutput") {
    const stream = chatResult.stream || "stdout";
    const content = chatResult.content || "";
    const prefix = stream === "stderr" ? "⚠ " : "";
    setChatHistory((prev: ChatHistoryItem[]) => {
      const last = prev[prev.length - 1];
      if (
        last?.type === "statusResponse" &&
        String(last.content || "").startsWith(
          `${prefix}${chatResult.runnerId || ""}`,
        )
      ) {
        const next = [...prev];
        next[next.length - 1] = {
          ...last,
          content: String(last.content || "") + content,
        };
        return next;
      }
      return [
        ...prev,
        {
          uuid,
          type: "statusResponse",
          content: `${prefix}${content}`,
          role: "assistant",
          sources: [],
          closed: true,
          error: null,
          animate: false,
          pending: false,
        },
      ];
    });
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

export function getWorkspaceSystemPrompt(workspace: any) {
  return (
    workspace?.openAiPrompt ??
    "Given the following conversation, relevant context, and a follow up question, reply with an answer to the current question the user is asking. Return only your response to the question given the above information following the users instructions as needed."
  );
}

export function chatQueryRefusalResponse(workspace: any) {
  return (
    workspace?.queryRefusalResponse ??
    "There is no relevant information in this workspace to answer your query."
  );
}
