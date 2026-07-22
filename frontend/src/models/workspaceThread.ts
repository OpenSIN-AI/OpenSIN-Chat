// SPDX-License-Identifier: MIT
import { ABORT_STREAM_EVENT } from "@/utils/chat";
import { API_BASE } from "@/utils/constants";
import { baseHeaders, safeJsonParse } from "@/utils/request";
import { streamSSEPost } from "@/utils/chat/sseStream";
import { v4 } from "uuid";
import logger from "@/utils/logger";

const WorkspaceThread: any = {
  all: async function (workspaceSlug) {
    const { threads, folders, defaultThreadChatCount } = await fetch(
      `${API_BASE}/workspace/${workspaceSlug}/threads`,
      {
        method: "GET",
        headers: baseHeaders(),
      },
    )
      .then((res) => res.json())
      .catch(() => {
        return { threads: [], folders: [], defaultThreadChatCount: 0 };
      });

    return { threads, folders: folders ?? [], defaultThreadChatCount };
  },
  search: async function (workspaceSlug: string, query: string) {
    const { results } = await fetch(
      `${API_BASE}/workspace/${workspaceSlug}/threads/search?q=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: baseHeaders(),
      },
    )
      .then((res) => res.json())
      .catch(() => ({ results: [] }));
    return results || [];
  },
  new: async function (workspaceSlug: any) {
    const { thread, error } = await fetch(
      `${API_BASE}/workspace/${workspaceSlug}/thread/new`,
      {
        method: "POST",
        headers: baseHeaders(),
      },
    )
      .then((res) => res.json())
      .catch((e) => {
        return { thread: null, error: e.message };
      });

    return { thread, error };
  },
  update: async function (workspaceSlug: any, threadSlug: any, data = {}) {
    const { thread, message } = await fetch(
      `${API_BASE}/workspace/${workspaceSlug}/thread/${threadSlug}/update`,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
      },
    )
      .then((res) => res.json())
      .catch((e) => {
        return { thread: null, message: e.message };
      });

    return { thread, message };
  },
  delete: async function (workspaceSlug: any, threadSlug: any) {
    return await fetch(
      `${API_BASE}/workspace/${workspaceSlug}/thread/${threadSlug}`,
      {
        method: "DELETE",
        headers: baseHeaders(),
      },
    )
      .then((res) => res.ok)
      .catch(() => false);
  },
  deleteBulk: async function (workspaceSlug: any, threadSlugs: any = []) {
    return await fetch(
      `${API_BASE}/workspace/${workspaceSlug}/thread-bulk-delete`,
      {
        method: "DELETE",
        body: JSON.stringify({ slugs: threadSlugs }),
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
      },
    )
      .then((res) => res.ok)
      .catch(() => false);
  },
  chatHistory: async function (workspaceSlug: any, threadSlug: any) {
    const history = await fetch(
      `${API_BASE}/workspace/${workspaceSlug}/thread/${threadSlug}/chats`,
      {
        method: "GET",
        headers: baseHeaders(),
      },
    )
      .then((res) => res.json())
      .then((res) => res.history || [])
      .catch(() => []);
    return history;
  },
  streamChat: async function (
    { workspaceSlug, threadSlug }: any,
    message: any,
    handleChat: any,
    attachments: any = [],
    requestContext: {
      turnId?: string;
      notebookMode?: string;
      sourceSelectionExplicit?: boolean;
      selectedSourceIds?: string[];
      codeRunnerId?: string | null;
    } = {},
  ) {
    const {
      turnId,
      notebookMode = "chat",
      sourceSelectionExplicit = false,
      selectedSourceIds = [],
      codeRunnerId = null,
    } = requestContext;

    const ctrl = new AbortController();

    // Stall-detection: if no data is received for STALL_TIMEOUT_MS, abort
    // the connection and show an error so the user is not stuck with a
    // perpetual loading spinner. The server sends a heartbeat every 15s,
    // so 45s gives ample buffer before declaring the connection stale.
    const STALL_TIMEOUT_MS = 45_000;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    let stallHandled = false;
    function resetStallTimer() {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        if (stallHandled) return;
        stallHandled = true;
        handleChat({
          id: v4(),
          type: "abort",
          textResponse: null,
          sources: [],
          close: true,
          error:
            "Connection appears to be stale. Please try sending your message again.",
        });
        ctrl.abort();
      }, STALL_TIMEOUT_MS);
    }
    // Start the timer when streaming begins.
    resetStallTimer();

    // Listen for the ABORT_STREAM_EVENT key to be emitted by the client
    // to early abort the streaming response. On abort we send a special `stopGeneration`
    // event to be handled which resets the UI for us to be able to send another message.
    // The backend response abort handling is done in each LLM's handleStreamResponse.
    const handleAbort = (event: any) => {
      const detail = event && event.detail;
      if (detail) {
        if (
          detail.workspaceSlug &&
          workspaceSlug &&
          detail.workspaceSlug !== workspaceSlug
        ) {
          return;
        }
        if (
          detail.threadSlug &&
          threadSlug &&
          detail.threadSlug !== threadSlug
        ) {
          return;
        }
      }
      if (stallTimer) clearTimeout(stallTimer);
      ctrl?.abort();
      handleChat({ id: v4(), type: "stopGeneration" });
    };
    window.addEventListener(ABORT_STREAM_EVENT, handleAbort);

    try {
      await streamSSEPost(
        `${API_BASE}/workspace/${workspaceSlug}/thread/${threadSlug}/stream-chat`,
        {
          method: "POST",
          body: JSON.stringify({
            message,
            attachments,
            turnId,
            notebookMode,
            sourceSelectionExplicit,
            selectedSourceIds,
            codeRunnerId,
          }),
          headers: baseHeaders(),
          signal: ctrl.signal,
          async onopen(response) {
            if (response.ok) {
              return; // everything's good
            } else if (response.status === 429) {
              if (stallTimer) clearTimeout(stallTimer);
              const retryAfter = response.headers.get("Retry-After");
              handleChat({
                id: v4(),
                type: "abort",
                textResponse: null,
                sources: [],
                close: true,
                error: retryAfter
                  ? `You are sending messages too quickly. Please try again in ${retryAfter} seconds.`
                  : "You are sending messages too quickly. Please try again shortly.",
              });
              ctrl?.abort();
              throw new Error("Rate limited.");
            } else if (response.status >= 400 && response.status < 500) {
              if (stallTimer) clearTimeout(stallTimer);
              handleChat({
                id: v4(),
                type: "abort",
                textResponse: null,
                sources: [],
                close: true,
                error: `An error occurred while streaming response. Code ${response.status}`,
              });
              ctrl?.abort();
              throw new Error("Invalid Status code response.");
            } else {
              if (stallTimer) clearTimeout(stallTimer);
              handleChat({
                id: v4(),
                type: "abort",
                textResponse: null,
                sources: [],
                close: true,
                error: `An error occurred while streaming response. Unknown Error.`,
              });
              ctrl?.abort();
              throw new Error("Unknown error");
            }
          },
          async onmessage(msg) {
            // Reset stall timer on each message (includes server heartbeat comments).
            resetStallTimer();
            const chatResult = safeJsonParse(msg.data, null);
            if (chatResult) handleChat(chatResult);
          },
          onerror(err) {
            if (stallTimer) clearTimeout(stallTimer);
            if (
              err?.name === "AbortError" ||
              (err?.message || "").toLowerCase().includes("abort")
            ) {
              ctrl?.abort();
              throw new Error("Aborted");
            }
            const isNetworkError =
              err?.message?.includes("Failed to fetch") ||
              err?.message?.includes("NetworkError") ||
              err?.message?.includes("network") ||
              !navigator.onLine;
            handleChat({
              id: v4(),
              type: "abort",
              textResponse: null,
              sources: [],
              close: true,
              error: isNetworkError
                ? "Connection lost. You appear to be offline. Please check your network and try again."
                : `An error occurred while streaming response. ${err?.message || "Unknown error"}`,
            });
            ctrl?.abort();
            throw new Error(isNetworkError ? "Network error" : "Stream error");
          },
        },
      );
    } finally {
      if (stallTimer) clearTimeout(stallTimer);
      window.removeEventListener(ABORT_STREAM_EVENT, handleAbort);
    }
  },
  _deleteEditedChats: async function (
    workspaceSlug: any = "",
    threadSlug: any = "",
    startingId: any,
  ) {
    return await fetch(
      `${API_BASE}/workspace/${workspaceSlug}/thread/${threadSlug}/delete-edited-chats`,
      {
        method: "DELETE",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ startingId }),
      },
    )
      .then((res) => {
        if (res.ok) return true;
        throw new Error("Failed to delete chats.");
      })
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
  _updateChat: async function (
    workspaceSlug: any = "",
    threadSlug: any = "",
    chatId: any,
    newText: any,
    role: any = "assistant",
  ) {
    return await fetch(
      `${API_BASE}/workspace/${workspaceSlug}/thread/${threadSlug}/update-chat`,
      {
        method: "POST",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, newText, role }),
      },
    )
      .then((res) => {
        if (res.ok) return true;
        throw new Error("Failed to update chat.");
      })
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },

  folders: {
    new: async function (workspaceSlug: any, name: any = "New Folder") {
      return await fetch(
        `${API_BASE}/workspace/${workspaceSlug}/thread-folder/new`,
        {
          method: "POST",
          headers: { ...baseHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
      )
        .then((res) => res.json())
        .catch((e) => ({ folder: null, message: e.message }));
    },

    update: async function (workspaceSlug: any, folderId: any, data = {}) {
      return await fetch(
        `${API_BASE}/workspace/${workspaceSlug}/thread-folder/${folderId}/update`,
        {
          method: "POST",
          headers: { ...baseHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      )
        .then((res) => res.json())
        .catch((e) => ({ folder: null, message: e.message }));
    },

    delete: async function (workspaceSlug: any, folderId: any) {
      return await fetch(
        `${API_BASE}/workspace/${workspaceSlug}/thread-folder/${folderId}`,
        {
          method: "DELETE",
          headers: baseHeaders(),
        },
      )
        .then((res) => res.ok)
        .catch(() => false);
    },

    assignThread: async function (
      workspaceSlug: any,
      threadSlug: any,
      folderId: any,
    ) {
      return await fetch(
        `${API_BASE}/workspace/${workspaceSlug}/thread/${threadSlug}/assign-folder`,
        {
          method: "POST",
          headers: { ...baseHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ folderId }),
        },
      )
        .then((res) => res.ok)
        .catch(() => false);
    },
  },
};

export default WorkspaceThread;
