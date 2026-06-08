// SPDX-License-Identifier: MIT
import useSWR from "swr";
import ScheduledJobs from "@/models/scheduledJobs";

export const SCHEDULED_JOB_KEY = "scheduled-job";

export default function useScheduledJob(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? [SCHEDULED_JOB_KEY, id] : null,
    () => ScheduledJobs.get(id),
    { revalidateOnFocus: false }
  );

  return {
    job: data?.job ?? null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
