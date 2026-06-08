// SPDX-License-Identifier: MIT
import { Robot, Plug, Package, FlowArrow, Hammer } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import AgentFlowsList from "./AgentFlows";
import { MCPServersList, MCPServerHeader } from "./MCPServers";
import AgentList from "./AgentList";
import ImportedSkillList from "./Imported/SkillList";

export default function AgentSidebarLists({
  defaultSkills,
  configurableSkills,
  appIntegrationSkills,
  importedSkills,
  agentFlows,
  mcpServers,
  selectedSkill,
  selectedFlow,
  selectedMcpServer,
  activeFlowIds,
  disabledAgentSkills,
  agentSkills,
  handleDefaultClick,
  handleSkillClick,
  handleFlowClick,
  handleMCPClick,
  setMcpServers,
  setSelectedMcpServer,
}) {
  return (
    <>
      <div className="text-theme-text-primary flex items-center gap-x-2">
        <Robot size={24} />
        <p className="text-lg font-medium">Agent Skills</p>
      </div>
      <AgentList
        skills={defaultSkills}
        selectedSkill={selectedSkill}
        handleClick={handleDefaultClick}
        activeSkills={Object.keys(defaultSkills).filter(
          (skill) => !disabledAgentSkills.includes(skill),
        )}
      />
      <AgentList
        skills={configurableSkills}
        selectedSkill={selectedSkill}
        handleClick={handleDefaultClick}
        activeSkills={agentSkills}
      />

      <div className="text-theme-text-primary flex items-center gap-x-2 mt-6">
        <Package size={24} />
        <p className="text-lg font-medium">App Integrations</p>
      </div>
      <AgentList
        skills={appIntegrationSkills}
        selectedSkill={selectedSkill}
        handleClick={handleSkillClick}
        activeSkills={agentSkills}
      />

      <div className="text-theme-text-primary flex items-center gap-x-2 mt-4">
        <Plug size={24} />
        <p className="text-lg font-medium">Custom Skills</p>
      </div>
      <ImportedSkillList
        skills={importedSkills}
        selectedSkill={selectedSkill}
        handleClick={handleSkillClick}
      />

      <div className="text-theme-text-primary flex items-center justify-between gap-x-2 mt-4">
        <div className="flex items-center gap-x-2">
          <FlowArrow size={24} />
          <p className="text-lg font-medium">Agent Flows</p>
        </div>
        {agentFlows.length === 0 ? (
          <Link
            to={paths.agents.builder()}
            className="text-cta-button flex items-center gap-x-1 hover:underline"
          >
            <Hammer size={16} />
            <p className="text-sm">Create Flow</p>
          </Link>
        ) : (
          <Link
            to={paths.agents.builder()}
            className="text-theme-text-secondary hover:text-cta-button flex items-center gap-x-1"
          >
            <Hammer size={16} />
            <p className="text-sm">Open Builder</p>
          </Link>
        )}
      </div>
      <AgentFlowsList
        flows={agentFlows}
        selectedFlow={selectedFlow}
        handleClick={handleFlowClick}
        activeFlowIds={activeFlowIds}
      />

      <MCPServerHeader
        setMcpServers={setMcpServers}
        setSelectedMcpServer={setSelectedMcpServer}
      >
        {({ loadingMcpServers }) => {
          return (
            <MCPServersList
              isLoading={loadingMcpServers}
              servers={mcpServers}
              selectedServer={selectedMcpServer}
              handleClick={handleMCPClick}
            />
          );
        }}
      </MCPServerHeader>
    </>
  );
}
