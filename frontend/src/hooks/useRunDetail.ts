// SPDX-License-Identifier: MIT
import useSWR from "swr";
import ScheduledJobs from "@/models/scheduledJobs";

export const RUN_DETAIL_KEY = "run-detail";

export default function useRunDetail(runId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    runId ? [RUN_DETAIL_KEY, runId] : null,
    () => ScheduledJobs.getRun(runId),
    { revalidateOnFocus: false, refreshInterval: 3000 },
  );

  return {
    run: data?.run ?? null,
    job: data?.job ?? null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
