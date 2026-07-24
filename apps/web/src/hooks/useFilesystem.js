// SPDX-License-Identifier: MIT
import useSWR from "swr";
import { swrFetcher } from "@/utils/swrFetcher";

// swrFetcher prepends API_BASE for relative keys, so this must NOT include it
// (otherwise the URL becomes `/api/api/utils/filesystem` → 404 → SPA index.html).
const FILESYSTEM_KEY = "/utils/filesystem";

export function useFilesystem() {
  const { data, error, isLoading, mutate } = useSWR(
    FILESYSTEM_KEY,
    swrFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );
  return {
    data,
    loading: isLoading,
    error: error?.message || null,
    refresh: () => mutate(),
  };
}

export default useFilesystem;
