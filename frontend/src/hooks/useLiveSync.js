// SPDX-License-Identifier: MIT
import useSWR from "swr";
import LiveDocumentSync from "@/models/experimental/liveSync";

export const LIVE_SYNC_QUEUES_KEY = "experimental/live-sync/queues";

export default function useLiveSync() {
  const { data, error, isLoading, mutate } = useSWR(
    LIVE_SYNC_QUEUES_KEY,
    () => LiveDocumentSync.queues(),
  );

  return {
    queues: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
