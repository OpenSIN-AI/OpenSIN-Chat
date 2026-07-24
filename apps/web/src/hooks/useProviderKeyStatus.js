// SPDX-License-Identifier: MIT
import useSWR from "swr";
import ProviderStatus from "@/models/providerStatus";

/**
 * SWR-backed provider key/fallback status with manual refresh.
 * Returns `refresh` so the UI can re-check after env changes
 * without a full page reload.
 */
export default function useProviderKeyStatus() {
  const { data, error, isLoading, mutate } = useSWR(
    "provider-key-status",
    () => ProviderStatus.status(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    },
  );

  return {
    providers: data?.providers ?? [],
    paths: data?.paths ?? null,
    checkedAt: data?.checkedAt ?? null,
    error: data?.error || error?.message || null,
    isLoading,
    refresh: () => mutate(),
  };
}
