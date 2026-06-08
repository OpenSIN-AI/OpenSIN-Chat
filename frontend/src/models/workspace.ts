// SPDX-License-Identifier: MIT
/**
 * Workspace model - Typed version of models/workspace.js
 * Handles workspace, thread, and chat operations.
 */

import { API_BASE, fullApiUrl } from "@/utils/constants";
import { baseHeaders, safeJsonParse } from "@/utils/request";
import type { Workspace, Thread, Message, ChatHistory } from "@/types/workspace";
import type { ApiResponse } from "@/types/api";

interface WorkspaceResponse extends ApiResponse<Workspace> {}
interface ThreadResponse extends ApiResponse<Thread> {}
interface ChatHistoryResponse extends ApiResponse<ChatHistory> {}

const Workspace = {
  /**
   * Get all workspaces for current user
   */
  all: async function (): Promise<Workspace[]> {
    const res = await fetch(`${fullApiUrl()}/workspaces`, {
      headers: baseHeaders(),
    });
    if (!res.ok) throw new Error("Could not fetch workspaces");
    const json = await res.json();
    return json?.workspaces || [];
  },

  /**
   * Get workspace by slug
   */
  bySlug: async function (slug: string): Promise<Workspace | null> {
    try {
      const res = await fetch(`${fullApiUrl()}/workspace/${slug}`, {
        headers: baseHeaders(),
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.workspace || null;
    } catch {
      return null;
    }
  },

  /**
   * Create new workspace
   */
  create: async function (data: Partial<Workspace>): Promise<Workspace | null> {
    try {
      const res = await fetch(`${fullApiUrl()}/workspace/new`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create workspace");
      const json = await res.json();
      return json?.workspace || null;
    } catch {
      return null;
    }
  },

  /**
   * Update workspace
   */
  update: async function (
    slug: string,
    data: Partial<Workspace>
  ): Promise<Workspace | null> {
    try {
      const res = await fetch(`${fullApiUrl()}/workspace/${slug}`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update workspace");
      const json = await res.json();
      return json?.workspace || null;
    } catch {
      return null;
    }
  },

  /**
   * Delete workspace
   */
  delete: async function (slug: string): Promise<boolean> {
    try {
      const res = await fetch(`${fullApiUrl()}/workspace/${slug}`, {
        method: "DELETE",
        headers: baseHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Thread operations
   */
  threads: {
    /**
     * Get all threads for workspace
     */
    all: async function (workspaceSlug: string): Promise<Thread[]> {
      try {
        const res = await fetch(`${fullApiUrl()}/workspace/${workspaceSlug}/threads`, {
          headers: baseHeaders(),
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json?.threads || [];
      } catch {
        return [];
      }
    },

    /**
     * Get thread by slug
     */
    bySlug: async function (
      workspaceSlug: string,
      threadSlug: string
    ): Promise<Thread | null> {
      try {
        const res = await fetch(
          `${fullApiUrl()}/workspace/${workspaceSlug}/thread/${threadSlug}`,
          { headers: baseHeaders() }
        );
        if (!res.ok) return null;
        const json = await res.json();
        return json?.thread || null;
      } catch {
        return null;
      }
    },

    /**
     * Get chat history for thread
     */
    chatHistory: async function (
      workspaceSlug: string,
      threadSlug: string
    ): Promise<Message[]> {
      try {
        const res = await fetch(
          `${fullApiUrl()}/workspace/${workspaceSlug}/thread/${threadSlug}/messages`,
          { headers: baseHeaders() }
        );
        if (!res.ok) return [];
        const json = await res.json();
        return json?.messages || [];
      } catch {
        return [];
      }
    },

    /**
     * Create new thread
     */
    create: async function (
      workspaceSlug: string,
      data: Partial<Thread>
    ): Promise<Thread | null> {
      try {
        const res = await fetch(`${fullApiUrl()}/workspace/${workspaceSlug}/thread/new`, {
          method: "POST",
          headers: baseHeaders(),
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to create thread");
        const json = await res.json();
        return json?.thread || null;
      } catch {
        return null;
      }
    },

    /**
     * Update thread
     */
    update: async function (
      workspaceSlug: string,
      threadSlug: string,
      data: Partial<Thread>
    ): Promise<Thread | null> {
      try {
        const res = await fetch(
          `${fullApiUrl()}/workspace/${workspaceSlug}/thread/${threadSlug}`,
          {
            method: "POST",
            headers: baseHeaders(),
            body: JSON.stringify(data),
          }
        );
        if (!res.ok) throw new Error("Failed to update thread");
        const json = await res.json();
        return json?.thread || null;
      } catch {
        return null;
      }
    },

    /**
     * Delete thread
     */
    delete: async function (
      workspaceSlug: string,
      threadSlug: string
    ): Promise<boolean> {
      try {
        const res = await fetch(
          `${fullApiUrl()}/workspace/${workspaceSlug}/thread/${threadSlug}`,
          { method: "DELETE", headers: baseHeaders() }
        );
        return res.ok;
      } catch {
        return false;
      }
    },
  },

  /**
   * Send message to thread
   */
  sendMessage: async function (
    workspaceSlug: string,
    threadSlug: string,
    message: string,
    onStream?: (chunk: string) => void
  ): Promise<string> {
    try {
      const res = await fetch(
        `${fullApiUrl()}/workspace/${workspaceSlug}/thread/${threadSlug}/chat`,
        {
          method: "POST",
          headers: baseHeaders(),
          body: JSON.stringify({ message }),
        }
      );
      if (!res.ok) throw new Error("Failed to send message");
      const json = await res.json();
      return json?.response || "";
    } catch (e) {
      console.error("Error sending message:", e);
      return "";
    }
  },

  /**
   * Modify embeddings (add/remove documents)
   */
  modifyEmbeddings: async function (
    slug: string,
    data: { adds: string[]; deletes: string[] }
  ): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${fullApiUrl()}/workspace/${slug}/modify-embeddings`, {
        method: "POST",
        headers: baseHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to modify embeddings");
      return { success: true };
    } catch {
      return { success: false };
    }
  },
};

export default Workspace;
