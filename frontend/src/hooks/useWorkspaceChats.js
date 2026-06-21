// SPDX-License-Identifier: MIT
import { useMemo } from "react";
import useSWR from "swr";
import Workspace from "@/models/workspace";

/**
 * SWR cache key for workspace chat data.
 * Exported so mutations can invalidate the cache via `mutate(WORKSPACE_CHATS_KEY)`.
 */
export const WORKSPACE_CHATS_KEY = (slug) =>
  slug ? ["workspace-chats", slug] : null;

/**
 * Fetches workspace chat data with caching, request de-duplication and
 * stale-while-revalidate. Replaces the common pattern of calling
 * `Workspace.bySlug()`, `Workspace.getSuggestedMessages()`, and
 * `Workspace.agentCommandAvailable()` separately in `useEffect` blocks.
 *
 * @param {string} slug - Workspace slug. Falsy values disable the fetch.
 * @returns {{
 *   workspace: object | null,
 *   suggestedMessages: Array<string>,
 *   showAgentCommand: boolean,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useWorkspaceChats(slug) {
  const { data, error, isLoading, mutate } = useSWR(
    WORKSPACE_CHATS_KEY(slug),
    async () => {
      const workspace = await Workspace.bySlug(slug);
      if (!workspace)
        return {
          workspace: null,
          suggestedMessages: [],
          showAgentCommand: false,
        };
      const [suggestedMessages, { showAgentCommand }] = await Promise.all([
        Workspace.getSuggestedMessages(slug),
        Workspace.agentCommandAvailable(slug),
      ]);
      return {
        workspace,
        suggestedMessages: suggestedMessages || [],
        showAgentCommand: !!showAgentCommand,
      };
    },
  );

  return {
    workspace: data?.workspace || null,
    suggestedMessages: useMemo(() => data?.suggestedMessages ?? [], [data]),
    showAgentCommand: data?.showAgentCommand || false,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
