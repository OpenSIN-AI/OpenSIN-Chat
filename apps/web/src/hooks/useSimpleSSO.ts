// SPDX-License-Identifier: MIT
import useSystemSettings from "@/hooks/useSystemSettings";

/**
 * Returns Simple SSO configuration derived from the system settings.
 *
 * Delegates to `useSystemSettings` (already SWR-backed) instead of issuing
 * a separate `System.keys()` call, so multiple callers share a single cached
 * response and avoid redundant network requests.
 *
 * @returns {{
 *   loading: boolean,
 *   ssoConfig: {
 *     enabled: boolean,
 *     noLogin: boolean,
 *     noLoginRedirect: string | null
 *   }
 * }}
 */
export default function useSimpleSSO() {
  const { settings, loading } = useSystemSettings();
  return {
    loading,
    ssoConfig: {
      enabled: settings?.SimpleSSOEnabled ?? false,
      noLogin: settings?.SimpleSSONoLogin ?? false,
      noLoginRedirect: settings?.SimpleSSONoLoginRedirect ?? null,
    },
  };
}
