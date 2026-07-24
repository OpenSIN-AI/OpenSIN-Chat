// SPDX-License-Identifier: MIT
import useSWR from "swr";
import ScheduledJobs from "@/models/scheduledJobs";

export const SCHEDULED_JOBS_KEY = "scheduled-jobs";

export default function useScheduledJobs() {
  const { data, error, isLoading, mutate } = useSWR(
    SCHEDULED_JOBS_KEY,
    () => ScheduledJobs.list(),
    { revalidateOnFocus: false, refreshInterval: 5000 },
  );

  return {
    jobs: data?.jobs ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
