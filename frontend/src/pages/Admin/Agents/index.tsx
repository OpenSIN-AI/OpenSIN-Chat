// SPDX-License-Identifier: MIT
import React, { Suspense, useMemo, useState } from "react";
const FlowPanel = React.lazy(() => import("./AgentFlows/FlowPanel"));
const ServerPanel = React.lazy(() => import("./MCPServers/ServerPanel"));
const ImportedSkillConfig = React.lazy(
  () => import("./Imported/ImportedSkillConfig"),
);
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
  const [selectedFlow, setSelectedFlow] = useState<any>(null);
  const [selectedMcpServer, setSelectedMcpServer] = useState<any>(null);
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
      const filterByMode = ([_, config]: [string, any]) => {
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
    setSelectedSkill("");
    setSelectedFlow(null);
    setSelectedMcpServer(null);
  };

  const handleSkillClick = (skill: string) => {
    clearSelections();
    setSelectedSkill(skill);
    if (isMobile) setShowSkillModal(true);
  };

  const handleFlowClick = (flow: any) => {
    clearSelections();
    setSelectedFlow(flow);
    if (isMobile) setShowSkillModal(true);
  };

  const handleMCPClick = (server: any) => {
    clearSelections();
    setSelectedMcpServer(server);
    if (isMobile) setShowSkillModal(true);
  };

  const handleFlowDelete = (flowId: string) => {
    setSelectedFlow(null);
    setAgentFlows((prev) => prev.filter((flow: any) => flow.uuid !== flowId));
  };

  const handleMCPServerDelete = (serverName: string) => {
    setSelectedMcpServer(null);
    setMcpServers((prev) =>
      prev.filter((server: any) => server.name !== serverName),
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
      prev.map((server: any) => {
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

    setSelectedMcpServer((prev: any) => {
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
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] w-full flex justify-center items-center"
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
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => handleSubmitForm(e),
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

interface FormProps {
  [key: string]: any;
}

function MobileForm(props: FormProps) {
  return (
    <form
      onSubmit={props.handleSubmit}
      onChange={() => !props.selectedFlow && props.setHasChanges(true)}
      ref={props.formEl}
      className="flex flex-col w-full p-4 mt-10"
    >
      <HiddenInputs {...props} />
      <SkillsNavigation {...props} />
    </form>
  );
}

function DesktopForm(props: FormProps) {
  const { selectedSkill, selectedFlow, selectedMcpServer } = props;
  let SelectedSkillComponent: any = null;

  if (selectedFlow) {
    SelectedSkillComponent = FlowPanel;
  } else if (selectedMcpServer) {
    SelectedSkillComponent = ServerPanel;
  } else if (selectedSkill?.imported) {
    SelectedSkillComponent = ImportedSkillConfig;
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
      onChange={(e: React.ChangeEvent<HTMLFormElement>) => {
        if (props.IGNORE_CHANGE_SETTINGS.includes(e.target.name)) return;
        if (!selectedSkill?.imported && !selectedFlow)
          props.setHasChanges(true);
      }}
      ref={props.formEl}
      className="flex-1 flex gap-x-6 p-4 mt-10"
    >
      <HiddenInputs {...props} />
      <SkillsNavigation {...props} />
      <Suspense fallback={<FullScreenLoader />}>
        <SkillPanel {...({ SelectedSkillComponent, ...props } as any)} />
      </Suspense>
    </form>
  );
}

function HiddenInputs({
  agentSkills,
  disabledAgentSkills,
  activeFlowIds,
}: any) {
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

interface SkillLayoutProps {
  children: React.ReactNode;
  hasChanges: boolean;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  handleCancel: () => void;
}

function SkillLayout({
  children,
  hasChanges,
  handleSubmit,
  handleCancel,
}: SkillLayoutProps) {
  return (
    <div
      id="workspace-agent-settings-container"
      className="w-screen h-screen overflow-hidden bg-theme-bg-container flex md:mt-0 mt-6"
    >
      <Sidebar />
      <div
        style={{ "--content-height": isMobile ? "100%" : "calc(100% - 32px)" }}
        className="h-[var(--content-height)] relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] w-full flex"
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
