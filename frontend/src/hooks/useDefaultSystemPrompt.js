// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

export const DEFAULT_SYSTEM_PROMPT_KEY = "system/default-system-prompt";

export default function useDefaultSystemPrompt() {
  const { data, error, isLoading, mutate } = useSWR(
    DEFAULT_SYSTEM_PROMPT_KEY,
    () => System.fetchDefaultSystemPrompt(),
  );

  return {
    defaultSystemPrompt: data?.defaultSystemPrompt ?? "",
    saneDefaultSystemPrompt: data?.saneDefaultSystemPrompt ?? "",
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
