// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Workspace from "@/models/workspace";

/**
 * Builds the SWR cache key for a single workspace lookup by slug.
 * Returns `null` when no slug is provided so SWR skips the request entirely
 * (conditional fetching).
 *
 * @param {string} slug
 * @returns {[string, string] | null}
 */
export const workspaceKey = (slug) => (slug ? ["workspace", slug] : null);

/**
 * Fetches a single workspace by slug with caching, de-duplication and
 * stale-while-revalidate. Replaces the
 * `useEffect(() => { Workspace.bySlug(slug).then(setWorkspace) }, [slug])`
 * pattern scattered across the workspace settings/chat components.
 *
 * @param {string} slug - Workspace slug. Falsy values disable the fetch.
 * @returns {{
 *   workspace: object | null,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useWorkspaceBySlug(slug) {
  const { data, error, isLoading, mutate } = useSWR(workspaceKey(slug), () =>
    Workspace.bySlug(slug),
  );

  return {
    workspace: data || null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
