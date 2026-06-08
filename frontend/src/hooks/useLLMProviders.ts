// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

/**
 * SWR cache key for the LLM provider config (model lists, defaults).
 * Exported so other hooks and the LLM selector can revalidate via mutate().
 *
 * @type {string}
 */
export const llmProvidersKey = "system/llm-providers";

/**
 * Fetches the available LLM providers and their default/custom model lists
 * with caching, de-duplication and stale-while-revalidate.
 *
 * Replaces the manual `useEffect + useState + loading flag` pattern in
 * `useGetProvidersModels.js` and the LLMSelector components.
 *
 * Note: System.keys() currently returns the setup-complete flag and not
 * the full provider list, so we wrap keys() here and the LLM provider list
 * is populated by the calling code (LLMSelector) using the existing
 * WORKSPACE_LLM_PROVIDERS constant. Future work: add a dedicated provider
 * list endpoint.
 *
 * @returns {{
 *   keys: object | null,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useLLMProviders() {
  const { data, error, isLoading, mutate } = useSWR(
    llmProvidersKey,
    () => System.keys(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    },
  );

  return {
    keys: data || null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
