// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

export const SLASH_COMMAND_PRESETS_KEY = "system/slash-command-presets";

export default function useSlashCommandPresets() {
  const { data, error, isLoading, mutate } = useSWR(
    SLASH_COMMAND_PRESETS_KEY,
    () => System.getSlashCommandPresets(),
    {
      revalidateOnFocus: false,
    },
  );

  return {
    presets: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
