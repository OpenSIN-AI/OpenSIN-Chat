// SPDX-License-Identifier: MIT
import useSWR, { type KeyedMutator } from "swr";
import ModelRouter from "@/models/modelRouter";

// Stable SWR cache key. Kept as "model-routers/all" so existing cache entries
// and any external `mutate` calls keep resolving to the same key.
export const MODEL_ROUTERS_KEY = "model-routers/all";

export interface UseModelRoutersResult {
  routers: unknown[];
  isLoading: boolean;
  error: unknown;
  refresh: KeyedMutator<unknown[]>;
  mutate: KeyedMutator<unknown[]>;
}

export default function useModelRouters(): UseModelRoutersResult {
  const { data, error, isLoading, mutate } = useSWR<unknown[]>(
    MODEL_ROUTERS_KEY,
    () => ModelRouter.getAll(),
    { revalidateOnFocus: false },
  );

  return {
    routers: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
