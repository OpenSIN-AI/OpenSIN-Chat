// SPDX-License-Identifier: MIT
import useSWR, { type KeyedMutator } from "swr";
import ModelRouter from "@/models/modelRouter";

// Stable SWR cache key. Kept as "model-routers/all" so existing cache entries
// and any external `mutate` calls keep resolving to the same key.
export const MODEL_ROUTERS_KEY = "model-routers/all";

export interface ModelRouter {
  id: string;
  name: string;
  models?: string[];
}

export interface UseModelRoutersResult {
  routers: ModelRouter[];
  isLoading: boolean;
  error: unknown;
  refresh: KeyedMutator<ModelRouter[]>;
  mutate: KeyedMutator<ModelRouter[]>;
}

export default function useModelRouters(): UseModelRoutersResult {
  const { data, error, isLoading, mutate } = useSWR<ModelRouter[]>(
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
