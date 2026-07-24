// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";

/**
 * SWR cache key for filesystem agent disabled skills.
 */
export const FILE_SYSTEM_AGENT_KEY = "file-system-agent";

/**
 * Fetches filesystem agent disabled skills with caching.
 *
 * @returns {{
 *   disabledSkills: string[],
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useFileSystemAgent() {
  const { data, error, isLoading, mutate } = useSWR(
    FILE_SYSTEM_AGENT_KEY,
    async () => {
      const res = await Admin.systemPreferencesByFields([
        "disabled_filesystem_skills",
      ]);
      return res?.settings?.disabled_filesystem_skills ?? [];
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  return {
    disabledSkills: data ?? [],
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
