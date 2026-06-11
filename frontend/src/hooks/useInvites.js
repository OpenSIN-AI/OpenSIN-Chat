// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";

/**
 * SWR cache key for the admin invites list.
 * Exported so mutations (create/disable) can invalidate the cache via
 * `mutate(INVITES_KEY)`.
 */
export const INVITES_KEY = "admin/invites";

/**
 * Fetches all invites with caching, request de-duplication and
 * stale-while-revalidate. Replaces the common
 * `useEffect(() => { Admin.invites().then(setInvites) }, [])` pattern.
 *
 * @returns {{
 *   invites: Array<object>,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useInvites() {
  const { data, error, isLoading, mutate } = useSWR(INVITES_KEY, () =>
    Admin.invites(),
  );

  return {
    invites: data || [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
