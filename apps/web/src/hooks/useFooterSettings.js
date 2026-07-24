// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";
import { safeJsonParse } from "@/utils/request";

export const FOOTER_SETTINGS_KEY = "system/footer-settings";

const DEFAULT_FOOTER_ICONS = Array(3).fill(null);

export default function useFooterSettings() {
  const { data, error, isLoading, mutate } = useSWR(
    FOOTER_SETTINGS_KEY,
    async () => {
      const { settings } = await Admin.systemPreferencesByFields([
        "footer_data",
      ]);
      const footerData = settings?.footer_data;
      if (footerData) {
        return safeJsonParse(footerData, []);
      }
      return [];
    },
  );

  const footerIcons = data
    ? data.length > 0
      ? data
      : DEFAULT_FOOTER_ICONS
    : DEFAULT_FOOTER_ICONS;

  return {
    footerIcons,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
