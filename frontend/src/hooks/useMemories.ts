// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Memory from "@/models/memory";

export const MEMORIES_KEY = "memories/workspace";

export interface Memory {
  id: string;
  content: string;
  createdAt: string;
  workspaceId?: string;
}

interface MemoriesData {
  global: Memory[];
  workspace: Memory[];
}

const EMPTY_MEMORIES: MemoriesData = { global: [], workspace: [] };

export default function useMemories(slug: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? [MEMORIES_KEY, slug] : null,
    () => Memory.forWorkspace(slug),
    {
      revalidateOnFocus: false,
    },
  );

  return {
    memories: data ?? EMPTY_MEMORIES,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
