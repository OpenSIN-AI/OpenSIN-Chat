// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";

export const FOOTER_ICONS_KEY = "system/footer-icons";

export default function useFooterIcons() {
  const { data, error, isLoading, mutate } = useSWR(
    FOOTER_ICONS_KEY,
    () => System.fetchCustomFooterIcons(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  );

  return {
    footerData: Array.isArray(data?.footerData) ? data.footerData : [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
