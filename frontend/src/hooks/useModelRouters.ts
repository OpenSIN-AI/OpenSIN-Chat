// SPDX-License-Identifier: MIT
import useSWR from "swr";
import ModelRouter from "@/models/modelRouter";

export const MODEL_ROUTERS_KEY = "model-routers";

export default function useModelRouters() {
  const { data, error, isLoading, mutate } = useSWR(
    MODEL_ROUTERS_KEY,
    () => ModelRouter.getAll(),
    { revalidateOnFocus: false }
  );

  return {
    routers: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
