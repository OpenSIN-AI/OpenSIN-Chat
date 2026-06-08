// SPDX-License-Identifier: MIT
import useSWR from "swr";
import ModelRouter from "@/models/modelRouter";

export const MODEL_ROUTER_KEY = "model-router";

export default function useModelRouter(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? [MODEL_ROUTER_KEY, id] : null,
    () => ModelRouter.get(id),
    { revalidateOnFocus: false }
  );

  return {
    router: data?.router ?? null,
    isLoading,
    error: data?.error || error,
    refresh: mutate,
    mutate,
  };
}
