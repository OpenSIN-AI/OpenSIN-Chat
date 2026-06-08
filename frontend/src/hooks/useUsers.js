// SPDX-License-Identifier: MIT
import { useEffect } from "react";
import useSWR from "swr";
import Admin from "@/models/admin";

/**
 * SWR cache key for the admin users list.
 * Exported so mutations (create/update/delete) can invalidate the cache via
 * `mutate(USERS_KEY)`.
 */
export const USERS_KEY = "admin/users";

/**
 * Fetches all users with caching, request de-duplication and
 * stale-while-revalidate. Replaces the common
 * `useEffect(() => { Admin.users().then(setUsers) }, [])` pattern.
 *
 * @returns {{
 *   users: Array<object>,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useUsers() {
  const { data, error, isLoading, mutate } = useSWR(USERS_KEY, () =>
    Admin.users(),
  );

  return {
    users: data || [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
