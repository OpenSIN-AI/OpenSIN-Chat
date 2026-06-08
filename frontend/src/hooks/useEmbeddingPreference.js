// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

export const EMBEDDING_PREFERENCE_KEY = "system/embedding-preference";

export default function useEmbeddingPreference() {
  const { data, error, isLoading, mutate } = useSWR(
    EMBEDDING_PREFERENCE_KEY,
    () => System.keys(),
  );

  return {
    settings: data ?? null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
