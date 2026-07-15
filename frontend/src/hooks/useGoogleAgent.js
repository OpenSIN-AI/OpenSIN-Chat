// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";
import System from "@/models/system";
import GoogleAgentSkills from "@/models/googleAgentSkills";

/**
 * SWR cache key for Gmail agent configuration.
 */
export const GMAIL_AGENT_KEY = "gmail-agent";

/**
 * SWR cache key for Google Calendar agent configuration.
 */
export const GOOGLE_CALENDAR_AGENT_KEY = "google-calendar-agent";

/**
 * Fetches Gmail agent status and preferences with caching.
 *
 * @returns {{
 *   disabledSkills: string[],
 *   isMultiUserMode: boolean,
 *   config: Record<string, any> | null,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export function useGmailAgent() {
  const { data, error, isLoading, mutate } = useSWR(
    GMAIL_AGENT_KEY,
    async () => {
      const [prefsRes, settingsRes, statusRes] = await Promise.all([
        Admin.systemPreferencesByFields(["disabled_gmail_skills"]),
        System.keys(),
        GoogleAgentSkills.gmail.getStatus(),
      ]);
      return {
        disabledSkills: prefsRes?.settings?.disabled_gmail_skills ?? [],
        isMultiUserMode: settingsRes?.MultiUserMode ?? false,
        config:
          statusRes?.success && statusRes.config ? statusRes.config : null,
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
    config: data?.config ?? null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}

/**
 * Fetches Google Calendar agent status and preferences with caching.
 *
 * @returns {{
 *   disabledSkills: string[],
 *   isMultiUserMode: boolean,
 *   config: Record<string, any> | null,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export function useGoogleCalendarAgent() {
  const { data, error, isLoading, mutate } = useSWR(
    GOOGLE_CALENDAR_AGENT_KEY,
    async () => {
      const [prefsRes, settingsRes, statusRes] = await Promise.all([
        Admin.systemPreferencesByFields(["disabled_google_calendar_skills"]),
        System.keys(),
        GoogleAgentSkills.calendar.getStatus(),
      ]);
      return {
        disabledSkills:
          prefsRes?.settings?.disabled_google_calendar_skills ?? [],
        isMultiUserMode: settingsRes?.MultiUserMode ?? false,
        config:
          statusRes?.success && statusRes.config ? statusRes.config : null,
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
    config: data?.config ?? null,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
