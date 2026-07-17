// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

/**
 * SWR cache key for the custom application name.
 */
export const CUSTOM_APP_NAME_KEY = "system/custom-app-name";

/**
 * Fetches the custom application name with caching and
 * stale-while-revalidate. Replaces the common
 * `useEffect(() => { System.fetchCustomAppName().then(...) }, [])` pattern.
 *
 * @returns {{
 *   appName: string,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useCustomAppName() {
  const { data, error, isLoading, mutate } = useSWR(CUSTOM_APP_NAME_KEY, () =>
    System.fetchCustomAppName(),
    { errorRetryCount: 3, errorRetryInterval: 2000 },
  );

  return {
    appName: data?.appName || "",
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
