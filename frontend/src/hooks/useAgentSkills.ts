// SPDX-License-Identifier: MIT
import useSWR from "swr";
import Admin from "@/models/admin";
import System from "@/models/system";
import AgentFlows from "@/models/agentFlows";

/**
 * SWR cache key for agent skills state (defaults, configurable, imported, flows).
 * Exported so mutations can revalidate via `mutate(AGENT_SKILLS_KEY)`.
 */
export const AGENT_SKILLS_KEY = "agent-skills";

/**
 * Fetches agent skill configuration with caching and de-duplication.
 * Used by the ToolsMenu AgentSkills tab.
 *
 * @returns {{
 *   disabledDefaults: string[],
 *   enabledConfigurable: string[],
 *   importedSkills: object[],
 *   flows: object[],
 *   fileSystemAgentAvailable: boolean,
 *   isMultiUser: boolean,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useAgentSkills() {
  const { data, error, isLoading, mutate } = useSWR(
    AGENT_SKILLS_KEY,
    async () => {
      const [prefs, flowsRes, fsAgentAvailable, multiUserMode] =
        await Promise.all([
          Admin.systemPreferencesByFields([
            "disabled_agent_skills",
            "default_agent_skills",
            "imported_agent_skills",
          ]),
          AgentFlows.listFlows(),
          System.isFileSystemAgentAvailable(),
          System.isMultiUserMode(),
        ]);

      return {
        disabledDefaults: prefs?.settings?.disabled_agent_skills ?? [],
        enabledConfigurable: prefs?.settings?.default_agent_skills ?? [],
        importedSkills: prefs?.settings?.imported_agent_skills ?? [],
        flows: flowsRes?.flows ?? [],
        fileSystemAgentAvailable: fsAgentAvailable,
        isMultiUser: !!multiUserMode,
      };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  return {
    disabledDefaults: data?.disabledDefaults ?? [],
    enabledConfigurable: data?.enabledConfigurable ?? [],
    importedSkills: data?.importedSkills ?? [],
    flows: data?.flows ?? [],
    fileSystemAgentAvailable: data?.fileSystemAgentAvailable ?? false,
    isMultiUser: data?.isMultiUser ?? false,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
