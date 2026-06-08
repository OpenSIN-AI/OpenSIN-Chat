// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

/**
 * SWR cache key for vector database settings.
 * Exported so mutations can invalidate the cache via `mutate(VECTOR_DBS_KEY)`.
 */
export const VECTOR_DBS_KEY = "system/vectordbs";

/**
 * Fetches system settings with a focus on vector database configuration.
 * Uses caching, request de-duplication and stale-while-revalidate.
 * Replaces the common `useEffect(() => { System.keys().then(setSettings) }, [])` pattern.
 *
 * @returns {{
 *   settings: object,
 *   vectorDB: string,
 *   hasEmbeddings: boolean,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useVectorDBs() {
  const { data, error, isLoading, mutate } = useSWR(VECTOR_DBS_KEY, () =>
    System.keys(),
  );

  const settings = data || {};
  return {
    settings,
    vectorDB: settings?.VectorDB || "lancedb",
    hasEmbeddings: settings?.HasExistingEmbeddings || false,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
