// SPDX-License-Identifier: MIT
// Docs: AgentBody.doc.md
import { Robot, CaretLeft } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import AgentSkillSettings from "./AgentSkillSettings";
import AgentSidebarLists from "./AgentSidebarLists";
import AgentSkillPanel from "./AgentSkillPanel";

type AgentBodyProps = {
  agents: any;
  isMobile: boolean;
};

export default function AgentBody({ agents, isMobile }: AgentBodyProps): JSX.Element {
  const { t } = useTranslation();
  const {
    formEl,
    hasChanges,
    setHasChanges,
    settings,
    selectedSkill,
    setSelectedSkill,
    selectedFlow,
    showSkillModal,
    setShowSkillModal,
    agentSkills,
    importedSkills,
    setImportedSkills,
    disabledAgentSkills,
    agentFlows,
    activeFlowIds,
    mcpServers,
    setMcpServers,
    selectedMcpServer,
    setSelectedMcpServer,
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
  } = agents;

  const skillPanelProps = {
    selectedMcpServer,
    selectedFlow,
    selectedSkill,
    defaultSkills,
    configurableSkills,
    appIntegrationSkills,
    toggleMCP,
    handleMCPServerDelete,
    handleMCPToolToggle,
    toggleFlow,
    activeFlowIds,
    handleFlowDelete,
    setImportedSkills,
    disabledAgentSkills,
    toggleDefaultSkill,
    settings,
    setHasChanges,
    hasChanges,
    toggleAgentSkill,
    agentSkills,
  };

  const sidebarProps = {
    defaultSkills,
    configurableSkills,
    appIntegrationSkills,
    importedSkills,
    setImportedSkills,
    agentFlows,
    mcpServers,
    selectedSkill,
    selectedFlow,
    selectedMcpServer,
    activeFlowIds,
    disabledAgentSkills,
    agentSkills,
    handleFlowClick,
    handleMCPClick,
    setMcpServers,
    setSelectedMcpServer,
  };

  if (isMobile) {
    return (
      <form
        onSubmit={handleSubmit}
        onChange={() => !selectedFlow && setHasChanges(true)}
        ref={formEl}
        className="flex flex-col w-full p-4 mt-10"
      >
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

        <div
          hidden={showSkillModal}
          className="flex flex-col gap-y-[18px] overflow-y-scroll no-scroll"
        >
          <AgentSidebarLists
            {...sidebarProps}
            handleDefaultClick={handleDefaultSkillClick}
            handleSkillClick={handleSkillClick}
          />
          <input
            type="hidden"
            name="system::active_agent_flows"
            id="active_agent_flows"
            value={activeFlowIds.join(",")}
          />
        </div>

        {showSkillModal && (
          <div className="fixed top-0 left-0 w-full h-full bg-sidebar z-30">
            <div className="flex flex-col h-full">
              <div className="flex items-center p-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSkillModal(false);
                    setSelectedSkill("");
                  }}
                  className="text-white/60 hover:text-white transition-colors duration-200"
                >
                  <div className="flex items-center text-sky-400">
                    <CaretLeft size={24} />
                    <div>{t("common.back")}</div>
                  </div>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-theme-bg-secondary text-white rounded-xl p-4 overflow-y-scroll overflow-x-visible no-scroll">
                  <AgentSkillPanel {...skillPanelProps} />
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onChange={(e: any) => {
        if (IGNORE_CHANGE_SETTINGS.includes(e.target.name)) return;
        if (!selectedSkill?.imported && !selectedFlow) setHasChanges(true);
      }}
      ref={formEl}
      className="flex-1 flex gap-x-6 p-4 mt-10"
    >
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

      <div className="flex flex-col min-w-[360px] h-[calc(100vh-90px)]">
        <div className="flex-none flex justify-between items-center mb-4">
          <div className="text-theme-text-primary flex items-center gap-x-2">
            <Robot size={24} />
            <p className="text-lg font-medium">{t("common.agentSkills")}</p>
          </div>
          <AgentSkillSettings />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-4">
          <div className="space-y-4">
            <AgentSidebarLists
              {...sidebarProps}
              handleDefaultClick={handleSkillClick}
              handleSkillClick={handleSkillClick}
            />
          </div>
        </div>
      </div>

      <div className="flex-[2] flex flex-col gap-y-[18px] mt-10">
        <div className="bg-theme-bg-secondary text-white rounded-xl flex-1 p-4 overflow-y-scroll overflow-x-visible no-scroll">
          <AgentSkillPanel {...skillPanelProps} />
        </div>
      </div>
    </form>
  );
}