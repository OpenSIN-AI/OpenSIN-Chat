// SPDX-License-Identifier: MIT
import useSWR from "swr";
import { API_BASE } from "@/utils/constants";
import { swrFetcher } from "@/utils/swrFetcher";

const FILESYSTEM_KEY = `${API_BASE}/utils/filesystem`;

export function useFilesystem() {
  const { data, error, isLoading, mutate } = useSWR(FILESYSTEM_KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });
  return {
    data,
    loading: isLoading,
    error: error?.message || null,
    refresh: () => mutate(),
  };
}

export default useFilesystem;
