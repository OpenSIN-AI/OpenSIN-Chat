// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

export const CACHE_KEY = "document_processor_online";

export default function useDocumentProcessorOnline() {
  const { data, error, isLoading, mutate } = useSWR(
    CACHE_KEY,
    () => System.checkDocumentProcessorOnline(),
    { revalidateOnFocus: false },
  );
  return {
    isOnline: data ?? false,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
