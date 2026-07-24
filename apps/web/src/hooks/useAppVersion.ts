// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

export const APP_VERSION_KEY = "system/app-version";

export default function useAppVersion() {
  const { data, error, isLoading, mutate } = useSWR(
    APP_VERSION_KEY,
    () => System.fetchAppVersion(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  );

  return {
    version: data ?? null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
