// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

/**
 * SWR cache key for the support email.
 */
export const SUPPORT_EMAIL_KEY = "system/support-email";

/**
 * Fetches the support email with caching and stale-while-revalidate.
 * Replaces the common
 * `useEffect(() => { System.fetchSupportEmail().then(...) }, [])` pattern.
 *
 * @returns {{
 *   email: string,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useSupportEmail() {
  const { data, error, isLoading, mutate } = useSWR(
    SUPPORT_EMAIL_KEY,
    () => System.fetchSupportEmail(),
  );

  return {
    email: data?.email || "",
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
