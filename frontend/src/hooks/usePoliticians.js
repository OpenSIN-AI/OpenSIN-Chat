// SPDX-License-Identifier: MIT
import useSWR from "swr";
import { API_BASE } from "@/utils/constants";
import { swrFetcher } from "@/utils/swrFetcher";

const POLITICIANS_KEY = `${API_BASE}/utils/bundestag/politicians?limit=8`;

export function usePoliticians() {
  const { data, error, isLoading, mutate } = useSWR(
    POLITICIANS_KEY,
    swrFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );
  return {
    politicians: data?.data || [],
    loading: isLoading,
    error: error?.message || null,
    refresh: () => mutate(),
  };
}

export default usePoliticians;
