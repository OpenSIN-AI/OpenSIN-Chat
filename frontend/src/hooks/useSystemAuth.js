// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

/**
 * SWR cache key for the combined auth-related system settings.
 * Exported so consumers can revalidate after updates.
 */
export const SYSTEM_AUTH_KEY = "system/auth";

/**
 * Fetches both system settings and multi-user mode status in a single
 * SWR request. Replaces the common pattern of calling
 * `System.keys()` and `System.isMultiUserMode()` separately in
 * `useEffect` blocks.
 *
 * @returns {{
 *   settings: object,
 *   multiUserMode: boolean,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useSystemAuth() {
  const { data, error, isLoading, mutate } = useSWR(
    SYSTEM_AUTH_KEY,
    async () => {
      const [settings, multiUserMode] = await Promise.all([
        System.keys(),
        System.isMultiUserMode(),
      ]);
      return { settings: settings || {}, multiUserMode: !!multiUserMode };
    },
  );

  return {
    settings: data?.settings || {},
    multiUserMode: data?.multiUserMode || false,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
