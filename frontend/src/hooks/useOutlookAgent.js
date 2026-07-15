// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";
import System from "@/models/system";
import OutlookAgent from "@/models/outlookAgent";

/**
 * SWR cache key for Outlook agent configuration.
 */
export const OUTLOOK_AGENT_KEY = "outlook-agent";

/**
 * Fetches Outlook agent status and preferences with caching.
 *
 * @returns {{
 *   disabledSkills: string[],
 *   isMultiUserMode: boolean,
 *   isAuthenticated: boolean,
 *   config: Record<string, any> | null,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useOutlookAgent() {
  const { data, error, isLoading, mutate } = useSWR(
    OUTLOOK_AGENT_KEY,
    async () => {
      const [prefsRes, settingsRes, statusRes] = await Promise.all([
        Admin.systemPreferencesByFields(["disabled_outlook_skills"]),
        System.keys(),
        OutlookAgent.getStatus(),
      ]);
      return {
        disabledSkills: prefsRes?.settings?.disabled_outlook_skills ?? [],
        isMultiUserMode: settingsRes?.MultiUserMode ?? false,
        isAuthenticated: statusRes?.isAuthenticated ?? false,
        config: statusRes?.config || null,
      };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  return {
    disabledSkills: data?.disabledSkills ?? [],
    isMultiUserMode: data?.isMultiUserMode ?? false,
    isAuthenticated: data?.isAuthenticated ?? false,
    config: data?.config ?? null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
