// SPDX-License-Identifier: MIT
// Docs: AgentSidebarLists.doc.md
import { Robot } from "@phosphor-icons/react/dist/csr/Robot";
import { Plug } from "@phosphor-icons/react/dist/csr/Plug";
import { Package } from "@phosphor-icons/react/dist/csr/Package";
import { FlowArrow } from "@phosphor-icons/react/dist/csr/FlowArrow";
import { Hammer } from "@phosphor-icons/react/dist/csr/Hammer";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import AgentFlowsList from "./AgentFlows";
import { MCPServersList, MCPServerHeader } from "./MCPServers";
import AgentList from "./AgentList";
import ImportedSkillList from "./Imported/SkillList";
import { useTranslation } from "react-i18next";

type AgentSidebarListsProps = {
  defaultSkills?: Record<string, any>;
  configurableSkills?: Record<string, any>;
  appIntegrationSkills?: Record<string, any>;
  importedSkills?: any[];
  agentFlows?: any[];
  mcpServers?: any[];
  selectedSkill?: string;
  selectedFlow?: any;
  selectedMcpServer?: any;
  activeFlowIds?: string[];
  disabledAgentSkills?: string[];
  agentSkills?: string[];
  handleDefaultClick?: (skill: any) => void;
  handleSkillClick?: (skill: any) => void;
  handleFlowClick?: (flow: any) => void;
  handleMCPClick?: (server: any) => void;
  setMcpServers?: (servers: any[]) => void;
  setSelectedMcpServer?: (server: any) => void;
};

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
}: AgentSidebarListsProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <div className="text-theme-text-primary flex items-center gap-x-2">
        <Robot size={24} />
        <p className="text-lg font-medium">
          {t("agentSidebarLists.agentSkills")}
        </p>
      </div>
      <AgentList
        skills={defaultSkills}
        selectedSkill={selectedSkill}
        handleClick={handleDefaultClick}
        activeSkills={Object.keys(defaultSkills || {}).filter(
          (skill) => !(disabledAgentSkills || []).includes(skill),
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
        <p className="text-lg font-medium">
          {t("agentSidebarLists.appIntegrations")}
        </p>
      </div>
      <AgentList
        skills={appIntegrationSkills}
        selectedSkill={selectedSkill}
        handleClick={handleSkillClick}
        activeSkills={agentSkills}
      />

      <div className="text-theme-text-primary flex items-center gap-x-2 mt-4">
        <Plug size={24} />
        <p className="text-lg font-medium">
          {t("agentSidebarLists.customSkills")}
        </p>
      </div>
      <ImportedSkillList
        skills={importedSkills}
        selectedSkill={selectedSkill}
        handleClick={handleSkillClick}
      />

      <div className="text-theme-text-primary flex items-center justify-between gap-x-2 mt-4">
        <div className="flex items-center gap-x-2">
          <FlowArrow size={24} />
          <p className="text-lg font-medium">
            {t("agentSidebarLists.agentFlows")}
          </p>
        </div>
        {(agentFlows || []).length === 0 ? (
          <Link
            to={paths.agents.builder()}
            className="text-cta-button flex items-center gap-x-1 hover:underline"
          >
            <Hammer size={16} />
            <p className="text-sm">{t("agentSidebarLists.createFlow")}</p>
          </Link>
        ) : (
          <Link
            to={paths.agents.builder()}
            className="text-theme-text-secondary hover:text-cta-button flex items-center gap-x-1"
          >
            <Hammer size={16} />
            <p className="text-sm">{t("agentSidebarLists.openBuilder")}</p>
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
        {({ loadingMcpServers }: { loadingMcpServers: boolean }) => {
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
