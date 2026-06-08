// SPDX-License-Identifier: MIT
import { useEffect } from "react";
import useSWR from "swr";
import Workspace from "@/models/workspace";

/**
 * SWR cache key for the list of all workspaces. Exported so that mutations
 * elsewhere (create/delete/rename) can revalidate the list via
 * `mutate(WORKSPACES_KEY)` without re-declaring the string.
 */
export const WORKSPACES_KEY = "workspaces";

/**
 * Fetches all workspaces with caching, request de-duplication and
 * stale-while-revalidate. Replaces the common
 * `useEffect(() => { Workspace.all().then(setWorkspaces) }, [])` pattern.
 *
 * @param {{ ordered?: boolean }} [options] - When `ordered` is true the result
 *   is sorted using the user's locally-stored workspace order preference.
 * @returns {{
 *   workspaces: Array<object>,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useWorkspaces({ ordered = false } = {}) {
  const { data, error, isLoading, mutate } = useSWR(WORKSPACES_KEY, () =>
    Workspace.all(),
  );

  const workspaces = data || [];
  return {
    workspaces: ordered ? Workspace.orderWorkspaces(workspaces) : workspaces,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
