// SPDX-License-Identifier: MIT
// Purpose: React hook for managing agent settings, skills, flows, and MCP servers on the Admin Agents page.
// Docs: useAgents.doc.md
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
} from "./skills";
import AgentFlows from "@/models/agentFlows";

interface AgentSettings {
  [key: string]: any;
  preferences?: { [key: string]: any };
  MultiUserMode?: boolean;
}

interface AgentFlow {
  uuid: string;
  active: boolean;
  [key: string]: any;
}

interface MCPServer {
  name: string;
  running: boolean;
  [key: string]: any;
}

interface UseAgentsReturn {
  t: (key: string, options?: any) => string;
  formEl: React.RefObject<HTMLFormElement | null>;
  hasChanges: boolean;
  setHasChanges: (value: boolean) => void;
  settings: AgentSettings;
  selectedSkill: string;
  setSelectedSkill: (skill: string) => void;
  loading: boolean;
  showSkillModal: boolean;
  setShowSkillModal: (show: boolean) => void;
  agentSkills: string[];
  setAgentSkills: (skills: string[]) => void;
  importedSkills: any[];
  setImportedSkills: (skills: any[]) => void;
  disabledAgentSkills: string[];
  setDisabledAgentSkills: (skills: string[]) => void;
  agentFlows: AgentFlow[];
  setAgentFlows: (flows: AgentFlow[]) => void;
  selectedFlow: AgentFlow | null;
  setSelectedFlow: (flow: AgentFlow | null) => void;
  activeFlowIds: string[];
  setActiveFlowIds: (ids: string[]) => void;
  mcpServers: MCPServer[];
  setMcpServers: (servers: MCPServer[]) => void;
  selectedMcpServer: MCPServer | null;
  setSelectedMcpServer: (server: MCPServer | null) => void;
  fileSystemAgentAvailable: boolean;
  setFileSystemAgentAvailable: (available: boolean) => void;
  createFilesAgentAvailable: boolean;
  setCreateFilesAgentAvailable: (available: boolean) => void;
  defaultSkills: any;
  configurableSkills: any;
  appIntegrationSkills: any;
  toggleDefaultSkill: (skillName: string) => void;
  toggleAgentSkill: (skillName: string) => void;
  toggleFlow: (flowId: string) => void;
  toggleMCP: (serverName: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDefaultSkillClick: (skill: any) => void;
  handleSkillClick: (skill: any) => void;
  handleFlowClick: (flow: any) => void;
  handleMCPClick: (server: any) => void;
  handleFlowDelete: (flowId: string) => void;
  handleMCPServerDelete: (serverName: string) => void;
  handleMCPToolToggle: (
    serverName: string,
    toolName: string,
    enabled: boolean,
  ) => Promise<void>;
  IGNORE_CHANGE_SETTINGS: string[];
}

export const IGNORE_CHANGE_SETTINGS = [
  "agentSkillRerankerEnabled",
  "agentSkillRerankerTopN",
  "agentSkillMaxToolCalls",
  "agentClarifyingQuestionsEnabled",
  "agentClarifyingQuestionsMaxPerTurn",
];

export function useAgents(): UseAgentsReturn {
  const { t } = useTranslation();
  const formEl = useRef<HTMLFormElement | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>({});
  const [selectedSkill, setSelectedSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSkillModal, setShowSkillModal] = useState(false);

  const [agentSkills, setAgentSkills] = useState<string[]>([]);
  const [importedSkills, setImportedSkills] = useState<any[]>([]);
  const [disabledAgentSkills, setDisabledAgentSkills] = useState<string[]>([]);

  const [agentFlows, setAgentFlows] = useState<AgentFlow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<AgentFlow | null>(null);
  const [activeFlowIds, setActiveFlowIds] = useState<string[]>([]);

  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [selectedMcpServer, setSelectedMcpServer] = useState<MCPServer | null>(
    null,
  );

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
  const filterSkillsByMode = ([_, skillConfig]: [string, any]) => {
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
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
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
        const { flows = [] } = flowsRes as { flows?: AgentFlow[] };
        setSettings({ ..._settings, preferences: _preferences.settings });
        setAgentSkills(_preferences.settings?.default_agent_skills ?? []);
        setDisabledAgentSkills(
          _preferences.settings?.disabled_agent_skills ?? [],
        );
        setImportedSkills(_preferences.settings?.imported_agent_skills ?? []);
        setActiveFlowIds(flows.filter((f) => f.active).map((f) => f.uuid));
        setAgentFlows(flows);
        setFileSystemAgentAvailable(fsAgentAvailable);
        setCreateFilesAgentAvailable(createFilesAvailable);
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to fetch agent settings:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleDefaultSkill = (skillName: string) => {
    setDisabledAgentSkills((prev) => {
      const updatedSkills = prev.includes(skillName)
        ? prev.filter((name) => name !== skillName)
        : [...prev, skillName];
      return updatedSkills;
    });
    // Side effects must run outside the updater function: React StrictMode
    // invokes updaters twice to detect impure updaters.
    setHasChanges(true);
  };

  const toggleAgentSkill = (skillName: string) => {
    setAgentSkills((prev) => {
      const updatedSkills = prev.includes(skillName)
        ? prev.filter((name) => name !== skillName)
        : [...prev, skillName];
      return updatedSkills;
    });
    setHasChanges(true);
  };

  const toggleFlow = (flowId: string) => {
    setActiveFlowIds((prev) => {
      const updatedFlows = prev.includes(flowId)
        ? prev.filter((id) => id !== flowId)
        : [...prev, flowId];
      return updatedFlows;
    });
  };

  const toggleMCP = (serverName: string) => {
    setMcpServers((prev) => {
      return prev.map((server) => {
        if (server.name !== serverName) return server;
        return { ...server, running: !server.running };
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data: {
      workspace: { [key: string]: any };
      system: { [key: string]: any };
      env: { [key: string]: any };
    } = {
      workspace: {},
      system: {},
      env: {},
    };

    const form = new FormData(formEl.current ?? undefined);
    for (const [key, value] of form.entries()) {
      if (key.startsWith("system::")) {
        const [, label] = key.split("system::");
        data.system[label] = String(value);
        continue;
      }

      if (key.startsWith("env::")) {
        const [, label] = key.split("env::");
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
      setSettings({ ..._settings, preferences: _preferences.settings });
      setAgentSkills(_preferences.settings?.default_agent_skills ?? []);
      setDisabledAgentSkills(
        _preferences.settings?.disabled_agent_skills ?? [],
      );
      setImportedSkills(_preferences.settings?.imported_agent_skills ?? []);
      showToast(t("agentConfig.preferencesSaved"), "success", {
        clear: true,
      });
    } else {
      showToast(t("agentConfig.preferencesSaveFailed"), "error", {
        clear: true,
      });
    }

    setHasChanges(false);
  };

  const handleDefaultSkillClick = (skill: any) => {
    setSelectedFlow(null);
    setSelectedMcpServer(null);
    setSelectedSkill(skill);
    if (isMobile) setShowSkillModal(true);
  };

  const handleSkillClick = (skill: any) => {
    setSelectedFlow(null);
    setSelectedMcpServer(null);
    setSelectedSkill(skill);
    if (isMobile) setShowSkillModal(true);
  };

  const handleFlowClick = (flow: any) => {
    setSelectedSkill(null);
    setSelectedMcpServer(null);
    setSelectedFlow(flow);
    if (isMobile) setShowSkillModal(true);
  };

  const handleMCPClick = (server: any) => {
    setSelectedSkill(null);
    setSelectedFlow(null);
    setSelectedMcpServer(server);
    if (isMobile) setShowSkillModal(true);
  };

  const handleFlowDelete = (flowId: string) => {
    setSelectedFlow(null);
    setActiveFlowIds((prev) => prev.filter((id) => id !== flowId));
    setAgentFlows((prev) => prev.filter((flow) => flow.uuid !== flowId));
  };

  const handleMCPServerDelete = (serverName: string) => {
    setSelectedMcpServer(null);
    setMcpServers((prev) =>
      prev.filter((server) => server.name !== serverName),
    );
  };

  const handleMCPToolToggle = async (
    serverName: string,
    toolName: string,
    enabled: boolean,
  ) => {
    const { success, error, suppressedTools } = await MCPServers.toggleTool(
      serverName,
      toolName,
      enabled,
    );

    if (!success) {
      showToast(error || t("agentConfig.toggleToolFailed"), "error", {
        clear: true,
      });
      return;
    }

    setMcpServers((prev) =>
      prev.map((server) => {
        if (server.name !== serverName) return server;
        return {
          ...server,
          config: {
            ...server.config,
            opensin: {
              ...server.config?.opensin,
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
          opensin: {
            ...prev.config?.opensin,
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

export default useAgents;
