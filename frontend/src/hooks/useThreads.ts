// SPDX-License-Identifier: MIT
import useSWR, { mutate as globalMutate } from "swr";
import Workspace from "@/models/workspace";

export interface ThreadItem {
  id?: number;
  slug: string | null;
  name: string;
  lastUpdatedAt?: string | null;
  createdAt?: string | null;
  folder_id?: number | null;
  deleted?: boolean;
  virtual?: boolean;
}

export interface FolderItem {
  id: number;
  name: string;
}

export interface ThreadsResponse {
  threads?: ThreadItem[];
  folders?: FolderItem[];
  defaultThreadChatCount?: number;
}

/**
 * Builds the SWR cache key for a workspace's threads.
 * Returns `null` when no slug is provided so SWR skips the request.
 */
export const threadsKey = (workspaceSlug: string | null | undefined) =>
  workspaceSlug ? (["threads", workspaceSlug] as [string, string]) : null;

/**
 * Invalidates the threads cache for a given workspace.
 * Useful after mutations (create/delete/rename/drag-drop).
 */
export function invalidateThreads(workspaceSlug: string) {
  return globalMutate(threadsKey(workspaceSlug));
}

/**
 * Fetches the threads for a workspace with caching and revalidation.
 */
export default function useThreads(workspaceSlug: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ThreadsResponse>(
    threadsKey(workspaceSlug),
    () => Workspace.threads.all(workspaceSlug),
    {
      keepPreviousData: true,
      dedupingInterval: 30_000,
      revalidateIfStale: false,
    },
  );

  const threads: ThreadItem[] = Array.isArray(data?.threads)
    ? data.threads
    : Array.isArray(data)
      ? (data as unknown as ThreadItem[])
      : [];
  const folders: FolderItem[] = data?.folders || [];
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
