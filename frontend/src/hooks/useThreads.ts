// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Workspace from "@/models/workspace";

/**
 * Builds the SWR cache key for a workspace's threads.
 * Returns `null` when no slug is provided so SWR skips the request.
 *
 * @param {string} workspaceSlug
 * @returns {[string, string] | null}
 */
export const threadsKey = (workspaceSlug: any): any =>
  workspaceSlug ? ["threads", workspaceSlug] : null;

/**
 * Fetches the threads for a workspace with caching and revalidation.
 *
 * @param {string} workspaceSlug
 * @returns {{
 *   threads: Array<object>,
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

  return {
    threads: data?.threads || data || [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
