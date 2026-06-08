// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

/**
 * SWR cache key for the global system settings (`System.keys()`).
 * Exported so other modules can revalidate after a settings update.
 */
export const SYSTEM_SETTINGS_KEY = "system/settings";

/**
 * A generalized hook that fetches system settings.
 *
 * Backed by SWR for cache de-duplication and stale-while-revalidate: multiple
 * components calling this hook now share a single in-flight request instead of
 * each firing their own `System.keys()` call.
 *
 * The public shape (`{ settings, loading, refresh }`) is preserved so existing
 * consumers continue to work without changes.
 *
 * @returns {{ settings: Object, loading: boolean, refresh: () => Promise<any> }}
 */
export default function useSystemSettings() {
  const { data, isLoading, mutate } = useSWR(SYSTEM_SETTINGS_KEY, () =>
    System.keys(),
  );

  return {
    settings: data || {},
    loading: isLoading,
    refresh: mutate,
  };
}
