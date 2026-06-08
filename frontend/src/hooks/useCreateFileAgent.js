// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";

/**
 * SWR cache key for create-file agent disabled skills.
 */
export const CREATE_FILE_AGENT_KEY = "create-file-agent";

/**
 * Fetches create-file agent disabled skills with caching.
 *
 * @returns {{
 *   disabledSkills: string[],
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useCreateFileAgent() {
  const { data, error, isLoading, mutate } = useSWR(
    CREATE_FILE_AGENT_KEY,
    async () => {
      const res = await Admin.systemPreferencesByFields([
        "disabled_create_files_skills",
      ]);
      return res?.settings?.disabled_create_files_skills ?? [];
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
