// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";

export const EMBEDDING_TEXT_SPLITTER_KEY = "admin/embedding-text-splitter";

export default function useEmbeddingTextSplitterPreference() {
  const { data, error, isLoading, mutate } = useSWR(
    EMBEDDING_TEXT_SPLITTER_KEY,
    async () => {
      const res = await Admin.systemPreferencesByFields([
        "text_splitter_chunk_size",
        "text_splitter_chunk_overlap",
        "max_embed_chunk_size",
      ]);
      return res?.settings ?? {};
    },
  );

  return {
    settings: data ?? {},
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
