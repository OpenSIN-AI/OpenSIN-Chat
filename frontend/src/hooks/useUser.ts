// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

/**
 * SWR cache key for the currently authenticated user. Falsy when not logged
 * in so SWR skips the request entirely.
 *
 * @type {string | null}
 */
export const userKey = "system/refresh-user";

/**
 * Fetches the currently authenticated user with caching, de-duplication
 * and stale-while-revalidate. Replaces the common
 * `useEffect(() => { System.refreshUser().then(...), [authToken])` pattern
 * scattered across the auth flow.
 *
 * The hook returns the raw `{ success, user, message }` shape that the
 * backend already returns so callers can branch on `success` without losing
 * information.
 *
 * @returns {{
 *   user: object | null,
 *   success: boolean | undefined,
 *   message: string | undefined,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useUser() {
  const { data, error, isLoading, mutate } = useSWR(
    userKey,
    () => System.refreshUser(),
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    },
  );

  return {
    user: data?.user ?? null,
    success: data?.success,
    message: data?.message,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
