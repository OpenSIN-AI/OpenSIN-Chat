// SPDX-License-Identifier: MIT
import useSWR from "swr";
import SystemPromptVariable from "@/models/systemPromptVariable";

export const SYSTEM_PROMPT_VARIABLES_KEY = "system/prompt-variables";

export default function useSystemPromptVariables() {
  const { data, error, isLoading, mutate } = useSWR(
    SYSTEM_PROMPT_VARIABLES_KEY,
    () => SystemPromptVariable.getAll(),
  );

  return {
    variables: data?.variables ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
