// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";

/**
 * SWR cache key for custom site settings (page title + favicon).
 */
export const CUSTOM_SITE_SETTINGS_KEY = "admin/custom-site-settings";

/**
 * Fetches the custom page title and favicon URL from the admin preferences
 * endpoint, backed by SWR for caching and request de-duplication.
 *
 * @returns {{
 *   title: string | null,
 *   faviconUrl: string | null,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>
 * }}
 */
export default function useCustomSiteSettings() {
  const { data, error, isLoading, mutate } = useSWR(
    CUSTOM_SITE_SETTINGS_KEY,
    async () => {
      const { settings } = await Admin.systemPreferencesByFields([
        "meta_page_title",
        "meta_page_favicon",
      ]);
      return {
        title: settings?.meta_page_title ?? null,
        faviconUrl: settings?.meta_page_favicon ?? null,
      };
    },
    { revalidateOnFocus: false },
  );

  return {
    title: data?.title ?? null,
    faviconUrl: data?.faviconUrl ?? null,
    isLoading,
    error,
    refresh: mutate,
  };
}
