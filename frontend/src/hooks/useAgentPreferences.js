// SPDX-License-Identifier: MIT
import useSWR from "swr";
import System from "@/models/system";
import Admin from "@/models/admin";
import AgentFlows from "@/models/agentFlows";

/**
 * SWR cache key for agent preferences (settings, skills, flows, availability).
 * Exported so mutations can revalidate the list via `mutate(AGENT_PREFERENCES_KEY)`.
 */
export const AGENT_PREFERENCES_KEY = "agent-preferences";

/**
 * Fetches agent-related system preferences with caching, request de-duplication
 * and stale-while-revalidate.
 *
 * @returns {{
 *   settings: object,
 *   agentSkills: string[],
 *   disabledAgentSkills: string[],
 *   importedSkills: object[],
 *   agentFlows: object[],
 *   activeFlowIds: string[],
 *   fileSystemAgentAvailable: boolean,
 *   createFilesAgentAvailable: boolean,
 *   isLoading: boolean,
 *   error: Error | undefined,
 *   refresh: () => Promise<any>,
 *   mutate: import("swr").KeyedMutator<any>
 * }}
 */
export default function useAgentPreferences() {
  const { data, error, isLoading, mutate } = useSWR(
    AGENT_PREFERENCES_KEY,
    async () => {
      const [
        _settings,
        _preferences,
        flowsRes,
        fsAgentAvailable,
        createFilesAvailable,
      ] = await Promise.all([
        System.keys(),
        Admin.systemPreferencesByFields([
          "disabled_agent_skills",
          "default_agent_skills",
          "imported_agent_skills",
          "active_agent_flows",
        ]),
        AgentFlows.listFlows(),
        System.isFileSystemAgentAvailable(),
        System.isCreateFilesAgentAvailable(),
      ]);

      const { flows = [] } = flowsRes;
      return {
        settings: { ..._settings, preferences: _preferences?.settings ?? {} },
        agentSkills: _preferences?.settings?.default_agent_skills ?? [],
        disabledAgentSkills:
          _preferences?.settings?.disabled_agent_skills ?? [],
        importedSkills: _preferences?.settings?.imported_agent_skills ?? [],
        agentFlows: flows,
        activeFlowIds: flows.filter((f) => f.active).map((f) => f.uuid),
        fileSystemAgentAvailable: fsAgentAvailable,
        createFilesAgentAvailable: createFilesAvailable,
      };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  return {
    settings: data?.settings ?? {},
    agentSkills: data?.agentSkills ?? [],
    disabledAgentSkills: data?.disabledAgentSkills ?? [],
    importedSkills: data?.importedSkills ?? [],
    agentFlows: data?.agentFlows ?? [],
    activeFlowIds: data?.activeFlowIds ?? [],
    fileSystemAgentAvailable: data?.fileSystemAgentAvailable ?? false,
    createFilesAgentAvailable: data?.createFilesAgentAvailable ?? false,
    isLoading,
    error,
    refresh: mutate,
    mutate,
  };
}
