// SPDX-License-Identifier: MIT
import useThreads from "./useThreads";

/**
 * Looks up a single thread by slug within a workspace's threads.
 * Reuses the SWR cache from `useThreads` so no extra request is fired.
 *
 * @param {string} workspaceSlug
 * @param {string} threadSlug
 * @returns {{
 *   thread: object | null,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useThread(workspaceSlug, threadSlug) {
  const { threads, isLoading, error, mutate } = useThreads(workspaceSlug);
  const thread = threads.find((t) => t.slug === threadSlug) || null;

  return {
    thread,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
