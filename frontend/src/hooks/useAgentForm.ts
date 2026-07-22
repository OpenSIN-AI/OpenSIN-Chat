// SPDX-License-Identifier: MIT
import { useState, useEffect, useRef } from "react";
import Admin from "@/models/admin";
import System from "@/models/system";
import AgentFlows from "@/models/agentFlows";
import showToast from "@/utils/toast";
import { castToType } from "@/utils/types";
import logger from "@/utils/logger";

const IGNORE_CHANGE_SETTINGS = [
  "agentSkillRerankerEnabled",
  "agentSkillRerankerTopN",
  "agentSkillMaxToolCalls",
  "agentClarifyingQuestionsEnabled",
  "agentClarifyingQuestionsMaxPerTurn",
];

export function useAgentForm() {
  const [hasChanges, setHasChanges] = useState(false as any);
  const [settings, setSettings] = useState({} as any);
  const [agentSkills, setAgentSkills] = useState([] as any);
  const [disabledAgentSkills, setDisabledAgentSkills] = useState([] as any);
  const [importedSkills, setImportedSkills] = useState([] as any);
  const [agentFlows, setAgentFlows] = useState([] as any);
  const [activeFlowIds, setActiveFlowIds] = useState([] as any);
  const [mcpServers, setMcpServers] = useState([] as any);
  const [fileSystemAgentAvailable, setFileSystemAgentAvailable] = useState(
    false as any,
  );
  const [createFilesAgentAvailable, setCreateFilesAgentAvailable] = useState(
    false as any,
  );
  const [loading, setLoading] = useState(true as any);
  const formEl = useRef<HTMLFormElement>(null);

  // Load initial settings
  useEffect(() => {
    let cancelled = false;
    async function fetchSettings() {
      try {
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

        if (cancelled) return;
        const { flows = [] } = flowsRes;
        const prefs = _preferences as { settings?: any };
        setSettings({
          ..._settings,
          preferences: prefs?.settings ?? {},
        });
        setAgentSkills(prefs?.settings?.default_agent_skills ?? []);
        setDisabledAgentSkills(prefs?.settings?.disabled_agent_skills ?? []);
        setImportedSkills(prefs?.settings?.imported_agent_skills ?? []);
        setActiveFlowIds(
          (flows as any).filter((f: any) => f.active).map((f: any) => f.uuid),
        );
        setAgentFlows(flows);
        setFileSystemAgentAvailable(fsAgentAvailable);
        setCreateFilesAgentAvailable(createFilesAvailable);
      } catch (e) {
        if (cancelled) return;
        logger.error("Failed to load agent form settings:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // Prevent page unload with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const toggleDefaultSkill: any = (skillName: string) => {
    setDisabledAgentSkills((prev: string[]) => {
      const updatedSkills = prev.includes(skillName)
        ? (prev as any).filter((name: string) => name !== skillName)
        : [...prev, skillName];
      return updatedSkills;
    });
    // Side effects must run outside the updater function: React StrictMode
    // invokes upders twice to detect impure updaters, which would call
    // setHasChanges twice (harmless here but violates purity contract).
    setHasChanges(true);
  };

  const toggleAgentSkill: any = (skillName: string) => {
    setAgentSkills((prev: string[]) => {
      const updatedSkills = prev.includes(skillName)
        ? (prev as any).filter((name: string) => name !== skillName)
        : [...prev, skillName];
      return updatedSkills;
    });
    setHasChanges(true);
  };

  const toggleFlow: any = (flowId: string) => {
    setActiveFlowIds((prev: string[]) => {
      const updated = prev.includes(flowId)
        ? (prev as any).filter((id: string) => id !== flowId)
        : [...prev, flowId];
      return updated;
    });
    setHasChanges(true);
  };

  const toggleMCP: any = (serverName: string) => {
    setMcpServers((prev: any[]) => {
      return (prev as any).map((server: any) => {
        if (server.name !== serverName) return server;
        return { ...server, running: !server.running };
      });
    });
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: { workspace: Record<string, any>; system: Record<string, any>; env: Record<string, any> } = {
      workspace: {},
      system: {},
      env: {},
    };

    const form = new FormData(formEl.current ?? undefined);
    for (const [key, value] of form.entries()) {
      if (key.startsWith("system::")) {
        const [_, label] = key.split("system::");
        data.system[label] = String(value);
        continue;
      }
      if (key.startsWith("env::")) {
        const [_, label] = key.split("env::");
        data.env[label] = String(value);
        continue;
      }
      data.workspace[key] = castToType(key, String(value));
    }

    try {
      const { success } = await Admin.updateSystemPreferences(data.system);
      await System.updateSystem(data.env);

      if (success) {
        const _settings = await System.keys();
        const _preferences = await Admin.systemPreferencesByFields([
          "disabled_agent_skills",
          "default_agent_skills",
          "imported_agent_skills",
        ]);
        const prefs2 = _preferences as { settings?: any };
        setSettings({
          ..._settings,
          preferences: prefs2?.settings ?? {},
        });
        setAgentSkills(prefs2?.settings?.default_agent_skills ?? []);
        setDisabledAgentSkills(prefs2?.settings?.disabled_agent_skills ?? []);
        setImportedSkills(prefs2?.settings?.imported_agent_skills ?? []);
        setHasChanges(false);
        showToast(`Agent preferences saved successfully.`, "success", {
          clear: true,
        });
      } else {
        showToast(`Agent preferences failed to save.`, "error", {
          clear: true,
        });
      }
    } catch (e) {
      logger.error("Failed to save agent preferences:", e);
      showToast(`Agent preferences failed to save.`, "error", { clear: true });
    }
  };

  return {
    formEl,
    hasChanges,
    setHasChanges,
    settings,
    agentSkills,
    setAgentSkills,
    disabledAgentSkills,
    setDisabledAgentSkills,
    importedSkills,
    setImportedSkills,
    agentFlows,
    setAgentFlows,
    activeFlowIds,
    setActiveFlowIds,
    mcpServers,
    setMcpServers,
    fileSystemAgentAvailable,
    createFilesAgentAvailable,
    loading,
    toggleDefaultSkill,
    toggleAgentSkill,
    toggleFlow,
    toggleMCP,
    handleSubmit,
    IGNORE_CHANGE_SETTINGS,
  };
}
