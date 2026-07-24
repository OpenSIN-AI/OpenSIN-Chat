// SPDX-License-Identifier: MIT
import useSWR from "swr";
import ScheduledJobs from "@/models/scheduledJobs";

export const RUN_HISTORY_KEY = "run-history";

export default function useRunHistory(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? [RUN_HISTORY_KEY, id] : null,
    () => ScheduledJobs.runs(id),
    { revalidateOnFocus: false, refreshInterval: 5000 },
  );

  return {
    runs: data?.runs ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
