// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

export const VECTOR_COUNT_KEY = "system/vector-count";

export default function useVectorCount(slug) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? [VECTOR_COUNT_KEY, slug] : null,
    () => System.totalIndexes(slug),
  );

  return {
    vectorCount: data ?? null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
