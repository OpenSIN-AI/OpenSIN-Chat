// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";

/**
 * SWR cache key for the selected agent web-search provider.
 */
export const AGENT_SEARCH_PROVIDER_KEY = "agent-search-provider";

/**
 * Fetches the currently configured web-search provider with caching.
 *
 * @returns {{
 *   provider: string,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useAgentSearchProvider() {
  const { data, error, isLoading, mutate } = useSWR(
    AGENT_SEARCH_PROVIDER_KEY,
    async () => {
      const res = await Admin.systemPreferencesByFields([
        "agent_search_provider",
      ]);
      return res?.settings?.agent_search_provider ?? "duckduckgo-engine";
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  return {
    provider: data ?? "duckduckgo-engine",
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
