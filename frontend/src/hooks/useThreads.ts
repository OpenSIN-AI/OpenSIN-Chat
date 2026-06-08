// SPDX-License-Identifier: MIT
import useSWR, { mutate as globalMutate } from "swr";
import Workspace from "@/models/workspace";

/**
 * Builds the SWR cache key for a workspace's threads.
 * Returns `null` when no slug is provided so SWR skips the request.
 *
 * @param {string} workspaceSlug
 * @returns {[string, string] | null}
 */
export const threadsKey: any = (workspaceSlug) =>
  workspaceSlug ? ["threads", workspaceSlug] : null;

/**
 * Invalidates the threads cache for a given workspace.
 * Useful after mutations (create/delete/rename/drag-drop).
 *
 * @param {string} workspaceSlug
 * @returns {Promise<any>}
 */
export function invalidateThreads(workspaceSlug) {
  return globalMutate(threadsKey(workspaceSlug));
}

/**
 * Fetches the threads for a workspace with caching and revalidation.
 *
 * @param {string} workspaceSlug
 * @returns {{
 *   threads: Array<object>,
 *   folders: Array<object>,
 *   defaultThreadHasChats: boolean,
 *   defaultThreadChatCount: number,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useThreads(workspaceSlug) {
  const { data, error, isLoading, mutate } = useSWR(
    threadsKey(workspaceSlug),
    () => Workspace.threads.all(workspaceSlug),
  );

  const threads = data?.threads || data || [];
  const folders = data?.folders || [];
  const defaultThreadChatCount = data?.defaultThreadChatCount || 0;
  const defaultThreadHasChats = defaultThreadChatCount > 0;

  return {
    threads,
    folders,
    defaultThreadHasChats,
    defaultThreadChatCount,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
