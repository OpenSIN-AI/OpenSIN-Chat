// SPDX-License-Identifier: MIT
import { useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import Workspace from "@/models/workspace";

/**
 * Builds the SWR cache key for chat history.
 * Returns `null` when no workspace slug is provided so SWR skips the request.
 *
 * @param {string} workspaceSlug
 * @param {string} [threadSlug]
 * @returns {[string, string, string] | [string, string] | null}
 */
export const chatHistoryKey = (workspaceSlug, threadSlug = null) => {
  if (!workspaceSlug) return null;
  if (threadSlug) return ["chat-history", workspaceSlug, threadSlug];
  return ["chat-history", workspaceSlug];
};

/**
 * Invalidates the chat history cache for a given workspace/thread.
 * Useful after mutations (send, edit, delete, feedback).
 *
 * @param {string} workspaceSlug
 * @param {string} [threadSlug]
 * @returns {Promise<any>}
 */
export function invalidateChatHistory(workspaceSlug, threadSlug = null) {
  return globalMutate(chatHistoryKey(workspaceSlug, threadSlug));
}

const fetchChatHistory = (workspaceSlug, threadSlug = null) =>
  threadSlug
    ? Workspace.threads.chatHistory(workspaceSlug, threadSlug)
    : Workspace.chatHistory(workspaceSlug);

export function prefetchChatHistory(workspaceSlug, threadSlug = null) {
  const key = chatHistoryKey(workspaceSlug, threadSlug);
  if (!key) return Promise.resolve();
  return globalMutate(key, fetchChatHistory(workspaceSlug, threadSlug), {
    populateCache: true,
    revalidate: false,
  });
}

/**
 * Fetches chat history for a workspace or thread with caching,
 * request de-duplication and stale-while-revalidate.
 * Replaces the common `useEffect(() => { Workspace.chatHistory(...).then(setHistory) }, [])` pattern.
 *
 * @param {string} workspaceSlug
 * @param {string} [threadSlug]
 * @returns {{
 *   history: Array<object>,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useChatHistory(workspaceSlug, threadSlug = null) {
  const { data, error, isLoading, mutate } = useSWR(
    chatHistoryKey(workspaceSlug, threadSlug),
    () => fetchChatHistory(workspaceSlug, threadSlug),
    {
      keepPreviousData: true,
      dedupingInterval: 30_000,
      revalidateIfStale: false,
    },
  );

  return {
    history: useMemo(() => data ?? [], [data]),
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
