// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

export const EVENT_LOGS_KEY = "system/event-logs";

export default function useEventLogs(offset = 0) {
  const { data, error, isLoading, mutate } = useSWR(
    offset !== null && offset !== undefined
      ? [EVENT_LOGS_KEY, offset]
      : null,
    () => System.eventLogs(offset),
  );

  return {
    result: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
