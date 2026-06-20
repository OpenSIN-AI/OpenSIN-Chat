// SPDX-License-Identifier: MIT
import useSWR from "swr";
import { swrFetcher } from "@/utils/swrFetcher";

const POLITICIANS_KEY = "/utils/bundestag/politicians?limit=8";

export function usePoliticians() {
  const { data, error, isLoading, mutate } = useSWR(
    POLITICIANS_KEY,
    swrFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );
  // The server returns HTTP 200 with an `error` field when the upstream
  // API (Abgeordnetenwatch) is unavailable. SWR treats 200 as success,
  // so we need to surface the body-level error to the UI.
  const bodyError = data?.error || null;
  return {
    politicians: data?.data || [],
    loading: isLoading,
    error: error?.message || bodyError,
    refresh: () => mutate(),
  };
}

export default usePoliticians;
