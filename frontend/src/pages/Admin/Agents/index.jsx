// SPDX-License-Identifier: MIT
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/SettingsSidebar";
import { isMobile } from "react-device-detect";
import showToast from "@/utils/toast";
import ContextualSaveBar from "@/components/ContextualSaveBar";
import { FullScreenLoader } from "@/components/Preloader";
import {
  getDefaultSkills,
  getConfigurableSkills,
  getAppIntegrationSkills,
} from "./skills.jsx";
import MCPServers from "@/models/mcpServers";
import { useAgentForm } from "@/hooks/useAgentForm";
import { SkillsNavigation } from "./SkillsNavigation";
import { SkillPanel } from "./SkillPanel";

export default function AdminAgents() {
  const { t } = useTranslation();
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedFlow, setSelectedFlow] = useState(null);
  const [selectedMcpServer, setSelectedMcpServer] = useState(null);
  const [showSkillModal, setShowSkillModal] = useState(false);

  const {
    formEl,
    hasChanges,
    setHasChanges,
    settings,
    agentSkills,
    disabledAgentSkills,
    importedSkills,
    setImportedSkills,
    agentFlows,
    setAgentFlows,
    activeFlowIds,
    mcpServers,
    setMcpServers,
    fileSystemAgentAvailable,
    createFilesAgentAvailable,
    loading,
    toggleDefaultSkill,
    toggleAgentSkill,
    toggleFlow,
    toggleMCP,
    handleSubmit: handleSubmitForm,
    IGNORE_CHANGE_SETTINGS,
  } = useAgentForm();

  const isMultiUserMode = settings?.MultiUserMode ?? false;
  const { configurableSkills, appIntegrationSkills, defaultSkills } =
    useMemo(() => {
      const filterByMode = ([_, config]) => {
        if (!config.mode) return true;
        if (config.mode.includes("singleUserOnly") && isMultiUserMode)
          return false;
        if (config.mode.includes("multiUserOnly") && !isMultiUserMode)
          return false;
        return true;
      };
      return {
        defaultSkills: getDefaultSkills(t),
        configurableSkills: Object.fromEntries(
          Object.entries(
            getConfigurableSkills(t, {
              fileSystemAgentAvailable,
              createFilesAgentAvailable,
            }),
          ).filter(filterByMode),
        ),
        appIntegrationSkills: Object.fromEntries(
          Object.entries(getAppIntegrationSkills(t)).filter(filterByMode),
        ),
      };
    }, [
      isMultiUserMode,
      fileSystemAgentAvailable,
      createFilesAgentAvailable,
      t,
    ]);

  const clearSelections = () => {
    setSelectedSkill(null);
    setSelectedFlow(null);
    setSelectedMcpServer(null);
  };

  const handleSkillClick = (skill) => {
    clearSelections();
    setSelectedSkill(skill);
    if (isMobile) setShowSkillModal(true);
  };

  const handleFlowClick = (flow) => {
    clearSelections();
    setSelectedFlow(flow);
    if (isMobile) setShowSkillModal(true);
  };

  const handleMCPClick = (server) => {
    clearSelections();
    setSelectedMcpServer(server);
    if (isMobile) setShowSkillModal(true);
  };

  const handleFlowDelete = (flowId) => {
    setSelectedFlow(null);
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
            openafd: { ...server.config?.openafd, suppressedTools },
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
          openafd: { ...prev.config?.openafd, suppressedTools },
        },
      };
    });
  };

  if (loading) {
    return (
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] w-full flex justify-center items-center"
      >
        <FullScreenLoader />
      </div>
    );
  }

  const layoutProps = {
    formEl,
    defaultSkills,
    configurableSkills,
    appIntegrationSkills,
    importedSkills,
    agentSkills,
    disabledAgentSkills,
    selectedSkill,
    handleSkillClick,
    agentFlows,
    selectedFlow,
    handleFlowClick,
    selectedMcpServer,
    handleMCPClick,
    activeFlowIds,
    mcpServers,
    setMcpServers,
    setSelectedMcpServer,
    toggleDefaultSkill,
    toggleAgentSkill,
    toggleFlow,
    toggleMCP,
    handleFlowDelete,
    handleMCPServerDelete,
    handleMCPToolToggle,
    settings,
    setImportedSkills,
    showSkillModal,
    setShowSkillModal,
    handleSubmit: (e) => handleSubmitForm(e),
    IGNORE_CHANGE_SETTINGS,
  };

  return (
    <SkillLayout
      hasChanges={hasChanges}
      handleCancel={() => setHasChanges(false)}
      handleSubmit={layoutProps.handleSubmit}
    >
      {isMobile ? (
        <MobileForm {...layoutProps} />
      ) : (
        <DesktopForm {...layoutProps} />
      )}
    </SkillLayout>
  );
}

function MobileForm(props) {
  return (
    <form
      onSubmit={props.handleSubmit}
      onChange={() =>
        !props.selectedFlow &&
        props.setImportedSkills &&
        props.toggleAgentSkill("")
      }
      ref={props.formEl}
      className="flex flex-col w-full p-4 mt-10"
    >
      <HiddenInputs {...props} />
      <SkillsNavigation {...props} />
    </form>
  );
}

function DesktopForm(props) {
  const { selectedSkill, selectedFlow, selectedMcpServer } = props;
  let SelectedSkillComponent = null;

  if (selectedFlow) {
    SelectedSkillComponent = require("./AgentFlows/FlowPanel").default;
  } else if (selectedMcpServer) {
    SelectedSkillComponent = require("./MCPServers/ServerPanel").default;
  } else if (selectedSkill?.imported) {
    SelectedSkillComponent = require("./Imported/ImportedSkillConfig").default;
  } else if (props.configurableSkills[selectedSkill]) {
    SelectedSkillComponent = props.configurableSkills[selectedSkill]?.component;
  } else if (props.appIntegrationSkills[selectedSkill]) {
    SelectedSkillComponent =
      props.appIntegrationSkills[selectedSkill]?.component;
  } else if (props.defaultSkills[selectedSkill]) {
    SelectedSkillComponent = props.defaultSkills[selectedSkill]?.component;
  }

  return (
    <form
      onSubmit={props.handleSubmit}
      onChange={(e) => {
        if (props.IGNORE_CHANGE_SETTINGS.includes(e.target.name)) return;
        if (!selectedSkill?.imported && !selectedFlow)
          props.setHasChanges(true);
      }}
      ref={props.formEl}
      className="flex-1 flex gap-x-6 p-4 mt-10"
    >
      <HiddenInputs {...props} />
      <SkillsNavigation {...props} />
      <SkillPanel SelectedSkillComponent={SelectedSkillComponent} {...props} />
    </form>
  );
}

function HiddenInputs({ agentSkills, disabledAgentSkills, activeFlowIds }) {
  return (
    <>
      <input
        name="system::default_agent_skills"
        type="hidden"
        value={agentSkills.join(",")}
      />
      <input
        name="system::disabled_agent_skills"
        type="hidden"
        value={disabledAgentSkills.join(",")}
      />
      <input
        type="hidden"
        name="system::active_agent_flows"
        id="active_agent_flows"
        value={activeFlowIds.join(",")}
      />
    </>
  );
}

function SkillLayout({ children, hasChanges, handleSubmit, handleCancel }) {
  return (
    <div
      id="workspace-agent-settings-container"
      className="w-screen h-screen overflow-hidden bg-theme-bg-container flex md:mt-0 mt-6"
    >
      <Sidebar />
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] w-full flex"
      >
        {children}
        <ContextualSaveBar
          showing={hasChanges}
          onSave={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
