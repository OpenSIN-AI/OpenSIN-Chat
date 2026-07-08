// SPDX-License-Identifier: MIT
import { API_BASE, fullApiUrl } from "@/utils/constants";
import { baseHeaders, safeJsonParse } from "@/utils/request";
import { streamSSEPost } from "@/utils/chat/sseStream";
import WorkspaceThread from "@/models/workspaceThread";
import { v4 } from "uuid";
import { ABORT_STREAM_EVENT } from "@/utils/chat";
import { safeGetItem } from "@/utils/safeStorage";
import logger from "@/utils/logger";

/**
 * Safely parse a fetch Response as JSON.
 * Throws an Error with HTTP status info when the response is not ok,
 * so callers' .catch() blocks receive a meaningful error instead of a
 * SyntaxError from trying to parse non-JSON error bodies.
 * @param {Response} res
 * @returns {Promise<any>}
 */
async function safeJson(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

const Workspace = {
  workspaceOrderStorageKey: "opensin-workspace-order",
  /** The maximum percentage of the context window that can be used for attachments */
  maxContextWindowLimit: 0.8,

  new: async function (data = {}) {
    const { workspace, message } = await fetch(`${API_BASE}/workspace/new`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
    })
      .then((res) => safeJson(res))
      .catch((e) => {
        return { workspace: null, message: e.message };
      });

    return { workspace, message };
  },
  update: async function (slug, data = {}) {
    const { workspace, message } = await fetch(
      `${API_BASE}/workspace/${slug}/update`,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
      },
    )
      .then((res) => safeJson(res))
      .catch((e) => {
        return { workspace: null, message: e.message };
      });

    return { workspace, message };
  },
  modifyEmbeddings: async function (slug, changes = {}) {
    const { workspace, message } = await fetch(
      `${API_BASE}/workspace/${slug}/update-embeddings`,
      {
        method: "POST",
        body: JSON.stringify(changes), // contains 'adds' and 'removes' keys that are arrays of filepaths
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
      },
    )
      .then((res) => safeJson(res))
      .catch((e) => {
        return { workspace: null, message: e.message };
      });

    return { workspace, message };
  },
  removeQueuedEmbedding: async function (slug, filename) {
    return fetch(`${API_BASE}/workspace/${slug}/embed-queue`, {
      method: "DELETE",
      body: JSON.stringify({ filename }),
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
    })
      .then((res) => safeJson(res))
      .catch(() => ({ success: false }));
  },
  chatHistory: async function (slug) {
    const history = await fetch(`${API_BASE}/workspace/${slug}/chats`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res))
      .then((res) => res.history || [])
      .catch(() => []);
    return history;
  },
  updateChatFeedback: async function (chatId, slug, feedback) {
    const result = await fetch(
      `${API_BASE}/workspace/${slug}/chat-feedback/${chatId}`,
      {
        method: "POST",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      },
    )
      .then((res) => res.ok)
      .catch(() => false);
    return result;
  },

  deleteChats: async function (slug = "", chatIds = []) {
    return await fetch(`${API_BASE}/workspace/${slug}/delete-chats`, {
      method: "DELETE",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ chatIds }),
    })
      .then((res) => {
        if (res.ok) return true;
        throw new Error("Failed to delete chats.");
      })
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
  deleteEditedChats: async function (slug = "", threadSlug = "", startingId) {
    if (!!threadSlug)
      return this.threads._deleteEditedChats(slug, threadSlug, startingId);
    return this._deleteEditedChats(slug, startingId);
  },
  updateChat: async function (
    slug = "",
    threadSlug = "",
    chatId,
    newText,
    role = "assistant",
  ) {
    if (!!threadSlug)
      return this.threads._updateChat(slug, threadSlug, chatId, newText, role);
    return this._updateChat(slug, chatId, newText, role);
  },
  multiplexStream: async function ({
    workspaceSlug,
    threadSlug = null,
    prompt,
    chatHandler,
    attachments = [],
  }) {
    if (!!threadSlug)
      return this.threads.streamChat(
        { workspaceSlug, threadSlug },
        prompt,
        chatHandler,
        attachments,
      );
    return this.streamChat(
      { slug: workspaceSlug },
      prompt,
      chatHandler,
      attachments,
    );
  },
  streamChat: async function ({ slug }, message, handleChat, attachments = []) {
    const ctrl = new AbortController();

    // Stall-detection: if no data is received for STALL_TIMEOUT_MS, abort
    // the connection and show an error so the user is not stuck with a
    // perpetual loading spinner. The server sends a heartbeat every 15s,
    // so 45s gives ample buffer before declaring the connection stale.
    const STALL_TIMEOUT_MS = 45_000;
    let stallTimer = null;
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
    const handleAbort = (event) => {
      const detail = event && event.detail;
      if (detail && detail.workspaceSlug && detail.workspaceSlug !== slug) {
        return;
      }
      if (stallTimer) clearTimeout(stallTimer);
      ctrl.abort();
      handleChat({ id: v4(), type: "stopGeneration" });
    };
    window.addEventListener(ABORT_STREAM_EVENT, handleAbort);

    try {
      await streamSSEPost(`${API_BASE}/workspace/${slug}/stream-chat`, {
        method: "POST",
        body: JSON.stringify({ message, attachments }),
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
            ctrl.abort();
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
            ctrl.abort();
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
            ctrl.abort();
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
            ctrl.abort();
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
          ctrl.abort();
          throw new Error(isNetworkError ? "Network error" : "Stream error");
        },
      });
    } finally {
      if (stallTimer) clearTimeout(stallTimer);
      window.removeEventListener(ABORT_STREAM_EVENT, handleAbort);
    }
  },
  all: async function () {
    const workspaces = await fetch(`${API_BASE}/workspaces`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res))
      .then((res) => res.workspaces || [])
      .catch(() => []);

    return workspaces;
  },
  bySlug: async function (slug = "") {
    const workspace = await fetch(`${API_BASE}/workspace/${slug}`, {
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res))
      .then((res) => res.workspace)
      .catch(() => null);
    return workspace;
  },
  delete: async function (slug) {
    const result = await fetch(`${API_BASE}/workspace/${slug}`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.ok)
      .catch(() => false);

    return result;
  },
  wipeVectorDb: async function (slug) {
    return await fetch(`${API_BASE}/workspace/${slug}/reset-vector-db`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => res.ok)
      .catch(() => false);
  },
  uploadFile: async function (slug, formData) {
    const response = await fetch(`${API_BASE}/workspace/${slug}/upload`, {
      method: "POST",
      body: formData,
      headers: baseHeaders(),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      // Non-JSON response — usually a proxy/tunnel error page (e.g.
      // Cloudflare 413 body-too-large or 524 timeout). Surface the HTTP
      // status so the real cause is visible instead of a generic message.
      data = {
        success: false,
        error: `Upload failed (HTTP ${response.status}${
          response.statusText ? ` ${response.statusText}` : ""
        })`,
      };
    }
    return { response, data };
  },
  parseFile: async function (slug, formData) {
    const response = await fetch(`${API_BASE}/workspace/${slug}/parse`, {
      method: "POST",
      body: formData,
      headers: baseHeaders(),
    });

    let data;
    try {
      data = await response.json();
    } catch {
      // Non-JSON response — usually a proxy/tunnel error page (e.g.
      // Cloudflare 413 body-too-large or 524 timeout). Surface the HTTP
      // status so the real cause is visible instead of a generic message.
      data = {
        success: false,
        error: `Parse failed (HTTP ${response.status}${
          response.statusText ? ` ${response.statusText}` : ""
        })`,
      };
    }
    return { response, data };
  },

  /**
   * Uploads a file for async parsing with real upload progress reporting.
   * The server responds 202 + { jobId } as soon as the file is received;
   * parsing happens in the background (poll with parseFileStatus).
   * @param {string} slug - workspace slug
   * @param {FormData} formData - form data containing the file (+ threadSlug)
   * @param {{onUploadProgress?: (percent: number) => void}} [options]
   * @returns {Promise<{success: boolean, jobId?: string, error?: string}>}
   */
  uploadAndParseFile: async function (
    slug,
    formData,
    { onUploadProgress } = {},
  ) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      // Timeout: 120s for the upload phase. If the upload stalls (e.g.
      // nginx client_max_body_size rejects mid-transfer, or Cloudflare
      // tunnel drops), the user gets a clear error instead of an
      // infinite spinner at 72%.
      const UPLOAD_TIMEOUT_MS =
        Number(
          typeof window !== "undefined" && window.__OPENSIN_UPLOAD_TIMEOUT_MS__,
        ) || 120_000;
      xhr.timeout = UPLOAD_TIMEOUT_MS;
      xhr.open("POST", `${API_BASE}/workspace/${slug}/parse`);
      const headers = baseHeaders();
      for (const [key, value] of Object.entries(headers)) {
        if (value) xhr.setRequestHeader(key, value);
      }

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || !onUploadProgress) return;
        onUploadProgress(Math.round((event.loaded / event.total) * 100));
      };

      xhr.onload = () => {
        let data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = {
            success: false,
            error: `Upload failed (HTTP ${xhr.status}${
              xhr.statusText ? ` ${xhr.statusText}` : ""
            })`,
          };
        }
        resolve(data);
      };
      xhr.onerror = () =>
        resolve({
          success: false,
          error:
            "Upload failed (network error). This is often caused by a proxy body-size limit (nginx client_max_body_size) or a Cloudflare tunnel upload cap. Check server/nginx config.",
        });
      xhr.ontimeout = () =>
        resolve({
          success: false,
          error: `Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s. The server may have a body-size limit that silently drops the connection.`,
        });
      xhr.onabort = () =>
        resolve({ success: false, error: "Upload was cancelled" });
      xhr.send(formData);
    });
  },

  /**
   * Polls the status of an async parse job started via uploadAndParseFile.
   * Exposes the HTTP status code and Retry-After header so callers can
   * distinguish transient failures (429 rate limit, 5xx, network blips —
   * retry with backoff) from terminal ones (404 job gone).
   * @param {string} slug - workspace slug
   * @param {string} jobId
   * @returns {Promise<{success: boolean, status?: "pending"|"processing"|"completed"|"failed", files?: object[]|null, error?: string|null, statusCode: number|null, retryAfterMs: number|null}>}
   */
  parseFileStatus: async function (slug, jobId) {
    try {
      const res = await fetch(
        `${API_BASE}/workspace/${slug}/parse-status/${jobId}`,
        {
          method: "GET",
          headers: baseHeaders(),
        },
      );
      let data;
      try {
        data = await res.json();
      } catch {
        data = { success: false, error: `HTTP ${res.status}` };
      }
      const retryAfter = Number(res.headers.get("Retry-After"));
      return {
        ...data,
        statusCode: res.status,
        retryAfterMs:
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : null,
      };
    } catch (e) {
      // Network error — statusCode null marks this as transient.
      return {
        success: false,
        error: e.message,
        statusCode: null,
        retryAfterMs: null,
      };
    }
  },

  getParsedFiles: async function (slug, threadSlug = null) {
    const basePath = new URL(`${fullApiUrl()}/workspace/${slug}/parsed-files`);
    if (threadSlug) basePath.searchParams.set("threadSlug", threadSlug);
    const response = await fetch(basePath, {
      method: "GET",
      headers: baseHeaders(),
    });

    const data = await response.json();
    return data;
  },
  uploadLink: async function (slug, link) {
    const response = await fetch(`${API_BASE}/workspace/${slug}/upload-link`, {
      method: "POST",
      body: JSON.stringify({ link }),
      headers: {
        ...baseHeaders(),
        "Content-Type": "application/json",
      },
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = {
        success: false,
        error: response.statusText || "Link upload failed",
      };
    }
    return { response, data };
  },

  getSuggestedMessages: async function (slug) {
    return await fetch(`${API_BASE}/workspace/${slug}/suggested-messages`, {
      method: "GET",
      cache: "no-cache",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Could not fetch suggested messages.");
        return res.json();
      })
      .then((res) => res.suggestedMessages)
      .catch((e) => {
        logger.error(e);
        return null;
      });
  },
  setSuggestedMessages: async function (slug, messages) {
    return fetch(`${API_BASE}/workspace/${slug}/suggested-messages`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(
            res.statusText || "Error setting suggested messages.",
          );
        }
        const json = await res.json();
        return { success: true, ...json };
      })
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  setPinForDocument: async function (slug, docPath, pinStatus) {
    return fetch(`${API_BASE}/workspace/${slug}/update-pin`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ docPath, pinStatus }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            res.statusText || "Error setting pin status for document.",
          );
        }
        return true;
      })
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
  ttsMessage: async function (slug, chatId) {
    return await fetch(`${API_BASE}/workspace/${slug}/tts/${chatId}`, {
      method: "GET",
      cache: "no-cache",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (res.ok && res.status !== 204) return res.blob();
        throw new Error("Failed to fetch TTS.");
      })
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => {
        return null;
      });
  },
  uploadPfp: async function (formData, slug) {
    return await fetch(`${API_BASE}/workspace/${slug}/upload-pfp`, {
      method: "POST",
      body: formData,
      headers: baseHeaders(),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error uploading pfp.");
        return { success: true, error: null };
      })
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },

  fetchPfp: async function (slug) {
    return await fetch(`${API_BASE}/workspace/${slug}/pfp`, {
      method: "GET",
      cache: "no-cache",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (res.ok && res.status !== 204) return res.blob();
        throw new Error("Failed to fetch pfp.");
      })
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => {
        return null;
      });
  },

  removePfp: async function (slug) {
    return await fetch(`${API_BASE}/workspace/${slug}/remove-pfp`, {
      method: "DELETE",
      headers: baseHeaders(),
    })
      .then((res) => {
        if (res.ok) return { success: true, error: null };
        throw new Error("Failed to remove pfp.");
      })
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  _updateChat: async function (slug = "", chatId, newText, role = "assistant") {
    return await fetch(`${API_BASE}/workspace/${slug}/update-chat`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, newText, role }),
    })
      .then((res) => {
        if (res.ok) return true;
        throw new Error("Failed to update chat.");
      })
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
  _deleteEditedChats: async function (slug = "", startingId) {
    return await fetch(`${API_BASE}/workspace/${slug}/delete-edited-chats`, {
      method: "DELETE",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ startingId }),
    })
      .then((res) => {
        if (res.ok) return true;
        throw new Error("Failed to delete chats.");
      })
      .catch((e) => {
        logger.error(e);
        return false;
      });
  },
  deleteChat: async (chatId) => {
    return await fetch(`${API_BASE}/workspace/workspace-chats/${chatId}`, {
      method: "PUT",
      headers: baseHeaders(),
    })
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return { success: false, error: e.message };
      });
  },
  forkThread: async function (slug = "", threadSlug = null, chatId = null) {
    return await fetch(`${API_BASE}/workspace/${slug}/thread/fork`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ threadSlug, chatId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fork thread.");
        return res.json();
      })
      .then((data) => data.newThreadSlug)
      .catch((e) => {
        logger.error("Error forking thread:", e);
        return null;
      });
  },
  /**
   * Uploads and embeds a single file in a single call into a workspace
   * @param {string} slug - workspace slug
   * @param {FormData} formData
   * @returns {Promise<{response: {ok: boolean}, data: {success: boolean, error: string|null, document: {id: string, location:string}|null}}>}
   */
  uploadAndEmbedFile: async function (slug, formData) {
    const response = await fetch(
      `${API_BASE}/workspace/${slug}/upload-and-embed`,
      {
        method: "POST",
        body: formData,
        headers: baseHeaders(),
      },
    );

    let data;
    try {
      data = await response.json();
    } catch {
      data = {
        success: false,
        error: response.statusText || "Upload and embed failed",
      };
    }
    return { response, data };
  },

  deleteParsedFiles: async function (slug, fileIds = []) {
    const response = await fetch(
      `${API_BASE}/workspace/${slug}/delete-parsed-files`,
      {
        method: "DELETE",
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds }),
      },
    );
    return response.ok;
  },

  embedParsedFile: async function (slug, fileId) {
    const response = await fetch(
      `${API_BASE}/workspace/${slug}/embed-parsed-file/${fileId}`,
      {
        method: "POST",
        headers: baseHeaders(),
      },
    );

    let data;
    try {
      data = await response.json();
    } catch {
      data = { success: false, error: response.statusText || "Embed failed" };
    }
    return { response, data };
  },

  /**
   * Deletes and un-embeds a single file in a single call from a workspace
   * @param {string} slug - workspace slug
   * @param {string} documentLocation - location of file eg: custom-documents/my-file-uuid.json
   * @returns {Promise<boolean>}
   */
  deleteAndUnembedFile: async function (slug, documentLocation) {
    const response = await fetch(
      `${API_BASE}/workspace/${slug}/remove-and-unembed`,
      {
        method: "DELETE",
        body: JSON.stringify({ documentLocation }),
        headers: { ...baseHeaders(), "Content-Type": "application/json" },
      },
    );
    return response.ok;
  },

  /**
   * Reorders workspaces in the UI via localstorage on client side.
   * @param {string[]} workspaceIds - array of workspace ids to reorder
   * @returns {boolean}
   */
  storeWorkspaceOrder: function (workspaceIds = []) {
    try {
      localStorage.setItem(
        this.workspaceOrderStorageKey,
        JSON.stringify(workspaceIds),
      );
      return true;
    } catch (error) {
      logger.error("Error reordering workspaces:", error);
      return false;
    }
  },

  /**
   * Orders workspaces based on the order preference stored in localstorage
   * @param {Array} workspaces - array of workspace JSON objects
   * @returns {Array} - ordered workspaces
   */
  orderWorkspaces: function (workspaces = []) {
    const workspaceOrderPreference =
      safeJsonParse(safeGetItem(this.workspaceOrderStorageKey)) || [];
    if (workspaceOrderPreference.length === 0) return workspaces;
    const orderedWorkspaces = Array.from(workspaces);
    orderedWorkspaces.sort(
      (a, b) =>
        workspaceOrderPreference.indexOf(a.id) -
        workspaceOrderPreference.indexOf(b.id),
    );
    return orderedWorkspaces;
  },

  /**
   * Searches for workspaces and threads
   * @param {string} searchTerm
   * @returns {Promise<{workspaces: [{slug: string, name: string}], threads: [{slug: string, name: string, workspace: {slug: string, name: string}}]}}>}
   */
  searchWorkspaceOrThread: async function (searchTerm) {
    const response = await fetch(`${API_BASE}/workspace/search`, {
      method: "POST",
      headers: { ...baseHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ searchTerm }),
    })
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return { workspaces: [], threads: [] };
      });
    return response;
  },

  /**
   * Checks if the agent command is available for a workspace
   * by checking if the workspace's agent provider supports native tool calling.
   *
   * This can be model specific or enabled via ENV flag.
   * @param {string} slug - workspace slug
   * @returns {Promise<{showAgentCommand: boolean}>}
   */
  agentCommandAvailable: async function (slug = null) {
    if (!slug) return { showAgentCommand: true };
    return await fetch(
      `${API_BASE}/workspace/${slug}/is-agent-command-available`,
      { headers: baseHeaders() },
    )
      .then((res) => safeJson(res))
      .catch((e) => {
        logger.error(e);
        return { showAgentCommand: false };
      });
  },

  threads: WorkspaceThread,
};

export default Workspace;
