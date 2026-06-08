// SPDX-License-Identifier: MIT
import useSWR from "swr";
import MobileConnection from "@/models/mobile";

export const MOBILE_CONNECTIONS_KEY = "mobile-connections";

export default function useMobileConnections() {
  const { data, error, isLoading, mutate } = useSWR(
    MOBILE_CONNECTIONS_KEY,
    () => MobileConnection.getDevices(),
    { revalidateOnFocus: false, refreshInterval: 5000 }
  );

  return {
    devices: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
