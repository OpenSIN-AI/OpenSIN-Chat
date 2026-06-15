// SPDX-License-Identifier: MIT
import useSWR from "swr";
import ModelRouter from "@/models/modelRouter";

export const MODEL_ROUTERS_KEY = "model-routers/all";

export default function useModelRouters() {
  const { data, error, isLoading, mutate } = useSWR(MODEL_ROUTERS_KEY, () =>
    ModelRouter.getAll(),
  );

  return {
    routers: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
