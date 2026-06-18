// SPDX-License-Identifier: MIT
import { useState, useEffect, useRef } from "react";
import Admin from "@/models/admin";
import System from "@/models/system";
import AgentFlows from "@/models/agentFlows";
import showToast from "@/utils/toast";
import { castToType } from "@/utils/types";

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
  const formEl = useRef(null);

  // Load initial settings
  useEffect(() => {
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

        const { flows = [] } = flowsRes;
        setSettings({ ..._settings, preferences: _preferences.settings });
        setAgentSkills(_preferences.settings?.default_agent_skills ?? []);
        setDisabledAgentSkills(
          _preferences.settings?.disabled_agent_skills ?? [],
        );
        setImportedSkills(_preferences.settings?.imported_agent_skills ?? []);
        setActiveFlowIds(
          (flows as any).filter((f) => f.active).map((f) => f.uuid),
        );
        setAgentFlows(flows);
        setFileSystemAgentAvailable(fsAgentAvailable);
        setCreateFilesAgentAvailable(createFilesAvailable);
      } catch (e) {
        console.error("Failed to load agent form settings:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  // Prevent page unload with unsaved changes
  useEffect(() => {
    const handleBeforeUnload: any = (event) => {
      if (hasChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const toggleDefaultSkill: any = (skillName) => {
    setDisabledAgentSkills((prev) => {
      const updatedSkills = prev.includes(skillName)
        ? (prev as any).filter((name) => name !== skillName)
        : [...prev, skillName];
      setHasChanges(true);
      return updatedSkills;
    });
  };

  const toggleAgentSkill: any = (skillName) => {
    setAgentSkills((prev) => {
      const updatedSkills = prev.includes(skillName)
        ? (prev as any).filter((name) => name !== skillName)
        : [...prev, skillName];
      setHasChanges(true);
      return updatedSkills;
    });
  };

  const toggleFlow: any = (flowId) => {
    setActiveFlowIds((prev) => {
      const updated = prev.includes(flowId)
        ? (prev as any).filter((id) => id !== flowId)
        : [...prev, flowId];
      return updated;
    });
  };

  const toggleMCP: any = (serverName) => {
    setMcpServers((prev) => {
      return (prev as any).map((server) => {
        if (server.name !== serverName) return server;
        return { ...server, running: !server.running };
      });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      workspace: {},
      system: {},
      env: {},
    };

    const form = new FormData(formEl.current);
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
      data.workspace[key] = castToType(key, value);
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
        setSettings({ ..._settings, preferences: _preferences.settings });
        setAgentSkills(_preferences.settings?.default_agent_skills ?? []);
        setDisabledAgentSkills(
          _preferences.settings?.disabled_agent_skills ?? [],
        );
        setImportedSkills(_preferences.settings?.imported_agent_skills ?? []);
        showToast(`Agent preferences saved successfully.`, "success", {
          clear: true,
        });
      } else {
        showToast(`Agent preferences failed to save.`, "error", {
          clear: true,
        });
      }
    } catch (e) {
      console.error("Failed to save agent preferences:", e);
      showToast(`Agent preferences failed to save.`, "error", { clear: true });
    }

    setHasChanges(false);
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
