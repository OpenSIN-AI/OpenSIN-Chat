// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isMobile } from "react-device-detect";
import Admin from "@/models/admin";
import System from "@/models/system";
import MCPServers from "@/models/mcpServers";
import showToast from "@/utils/toast";
import { castToType } from "@/utils/types";
import {
  getDefaultSkills,
  getConfigurableSkills,
  getAppIntegrationSkills,
} from "./skills.jsx";
import AgentFlows from "@/models/agentFlows";

export const IGNORE_CHANGE_SETTINGS = [
  "agentSkillRerankerEnabled",
  "agentSkillRerankerTopN",
  "agentSkillMaxToolCalls",
  "agentClarifyingQuestionsEnabled",
  "agentClarifyingQuestionsMaxPerTurn",
];

export function useAgents() {
  const { t } = useTranslation();
  const formEl = useRef(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({});
  const [selectedSkill, setSelectedSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSkillModal, setShowSkillModal] = useState(false);

  const [agentSkills, setAgentSkills] = useState([]);
  const [importedSkills, setImportedSkills] = useState([]);
  const [disabledAgentSkills, setDisabledAgentSkills] = useState([]);

  const [agentFlows, setAgentFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [activeFlowIds, setActiveFlowIds] = useState([]);

  const [mcpServers, setMcpServers] = useState([]);
  const [selectedMcpServer, setSelectedMcpServer] = useState(null);

  const [fileSystemAgentAvailable, setFileSystemAgentAvailable] =
    useState(false);
  const [createFilesAgentAvailable, setCreateFilesAgentAvailable] =
    useState(false);

  const defaultSkills = getDefaultSkills(t);
  const allConfigurableSkills = getConfigurableSkills(t, {
    fileSystemAgentAvailable,
    createFilesAgentAvailable,
  });
  const allAppIntegrationSkills = getAppIntegrationSkills(t);

  const isMultiUserMode = settings?.MultiUserMode ?? false;
  const filterSkillsByMode = ([_, skillConfig]) => {
    if (!skillConfig.mode) return true;
    if (skillConfig.mode.includes("singleUserOnly") && isMultiUserMode)
      return false;
    if (skillConfig.mode.includes("multiUserOnly") && !isMultiUserMode)
      return false;
    return true;
  };
  const configurableSkills = Object.fromEntries(
    Object.entries(allConfigurableSkills).filter(filterSkillsByMode),
  );
  const appIntegrationSkills = Object.fromEntries(
    Object.entries(allAppIntegrationSkills).filter(filterSkillsByMode),
  );

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (hasChanges) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasChanges]);

  useEffect(() => {
    async function fetchSettings() {
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
      setSettings({ ..._settings, preferences: _preferences.settings } ?? {});
      setAgentSkills(_preferences.settings?.default_agent_skills ?? []);
      setDisabledAgentSkills(
        _preferences.settings?.disabled_agent_skills ?? [],
      );
      setImportedSkills(_preferences.settings?.imported_agent_skills ?? []);
      setActiveFlowIds(flows.filter((f) => f.active).map((f) => f.uuid));
      setAgentFlows(flows);
      setFileSystemAgentAvailable(fsAgentAvailable);
      setCreateFilesAgentAvailable(createFilesAvailable);
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const toggleDefaultSkill = (skillName) => {
    setDisabledAgentSkills((prev) => {
      const updatedSkills = prev.includes(skillName)
        ? prev.filter((name) => name !== skillName)
        : [...prev, skillName];
      setHasChanges(true);
      return updatedSkills;
    });
  };

  const toggleAgentSkill = (skillName) => {
    setAgentSkills((prev) => {
      const updatedSkills = prev.includes(skillName)
        ? prev.filter((name) => name !== skillName)
        : [...prev, skillName];
      setHasChanges(true);
      return updatedSkills;
    });
  };

  const toggleFlow = (flowId) => {
    setActiveFlowIds((prev) => {
      const updatedFlows = prev.includes(flowId)
        ? prev.filter((id) => id !== flowId)
        : [...prev, flowId];
      return updatedFlows;
    });
  };

  const toggleMCP = (serverName) => {
    setMcpServers((prev) => {
      return prev.map((server) => {
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
    for (var [key, value] of form.entries()) {
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

    const { success } = await Admin.updateSystemPreferences(data.system);
    await System.updateSystem(data.env);

    if (success) {
      const _settings = await System.keys();
      const _preferences = await Admin.systemPreferencesByFields([
        "disabled_agent_skills",
        "default_agent_skills",
        "imported_agent_skills",
      ]);
      setSettings({ ..._settings, preferences: _preferences.settings } ?? {});
      setAgentSkills(_preferences.settings?.default_agent_skills ?? []);
      setDisabledAgentSkills(
        _preferences.settings?.disabled_agent_skills ?? [],
      );
      setImportedSkills(_preferences.settings?.imported_agent_skills ?? []);
      showToast(`Agent preferences saved successfully.`, "success", {
        clear: true,
      });
    } else {
      showToast(`Agent preferences failed to save.`, "error", { clear: true });
    }

    setHasChanges(false);
  };

  const handleDefaultSkillClick = (skill) => {
    setSelectedFlow(null);
    setSelectedMcpServer(null);
    setSelectedSkill(skill);
    if (isMobile) setShowSkillModal(true);
  };

  const handleSkillClick = (skill) => {
    setSelectedFlow(null);
    setSelectedMcpServer(null);
    setSelectedSkill(skill);
    if (isMobile) setShowSkillModal(true);
  };

  const handleFlowClick = (flow) => {
    setSelectedSkill(null);
    setSelectedMcpServer(null);
    setSelectedFlow(flow);
    if (isMobile) setShowSkillModal(true);
  };

  const handleMCPClick = (server) => {
    setSelectedSkill(null);
    setSelectedFlow(null);
    setSelectedMcpServer(server);
    if (isMobile) setShowSkillModal(true);
  };

  const handleFlowDelete = (flowId) => {
    setSelectedFlow(null);
    setActiveFlowIds((prev) => prev.filter((id) => id !== flowId));
    setAgentFlows((prev) => prev.filter((flow) => flow.uuid !== flowId));
  };

  const handleMCPServerDelete = (serverName) => {
    setSelectedMcpServer(null);
    setMcpServers((prev) =>
      prev.filter((server) => server.name !== serverName),
    );
  };

  const handleMCPToolToggle = async (serverName, toolName, enabled) => {
    const { success, error, suppressedTools } = await MCPServers.toggleTool(
      serverName,
      toolName,
      enabled,
    );

    if (!success) {
      showToast(error || "Failed to toggle tool.", "error", { clear: true });
      return;
    }

    setMcpServers((prev) =>
      prev.map((server) => {
        if (server.name !== serverName) return server;
        return {
          ...server,
          config: {
            ...server.config,
            openafd: {
              ...server.config?.openafd,
              suppressedTools,
            },
          },
        };
      }),
    );

    setSelectedMcpServer((prev) => {
      if (!prev || prev.name !== serverName) return prev;
      return {
        ...prev,
        config: {
          ...prev.config,
          openafd: {
            ...prev.config?.openafd,
            suppressedTools,
          },
        },
      };
    });
  };

  return {
    t,
    formEl,
    hasChanges,
    setHasChanges,
    settings,
    selectedSkill,
    setSelectedSkill,
    loading,
    showSkillModal,
    setShowSkillModal,
    agentSkills,
    setAgentSkills,
    importedSkills,
    setImportedSkills,
    disabledAgentSkills,
    setDisabledAgentSkills,
    agentFlows,
    setAgentFlows,
    selectedFlow,
    setSelectedFlow,
    activeFlowIds,
    setActiveFlowIds,
    mcpServers,
    setMcpServers,
    selectedMcpServer,
    setSelectedMcpServer,
    fileSystemAgentAvailable,
    setFileSystemAgentAvailable,
    createFilesAgentAvailable,
    setCreateFilesAgentAvailable,
    defaultSkills,
    configurableSkills,
    appIntegrationSkills,
    toggleDefaultSkill,
    toggleAgentSkill,
    toggleFlow,
    toggleMCP,
    handleSubmit,
    handleDefaultSkillClick,
    handleSkillClick,
    handleFlowClick,
    handleMCPClick,
    handleFlowDelete,
    handleMCPServerDelete,
    handleMCPToolToggle,
    IGNORE_CHANGE_SETTINGS,
  };
}
