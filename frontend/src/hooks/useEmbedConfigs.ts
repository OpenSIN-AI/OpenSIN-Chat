// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Embed from "@/models/embed";

export const EMBED_CONFIGS_KEY = "embed-configs";

export default function useEmbedConfigs() {
  const { data, error, isLoading, mutate } = useSWR(
    EMBED_CONFIGS_KEY,
    () => Embed.embeds(),
    { revalidateOnFocus: false }
  );

  return {
    embeds: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
