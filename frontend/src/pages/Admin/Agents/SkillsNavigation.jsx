// SPDX-License-Identifier: MIT
import { Robot } from "@phosphor-icons/react";
import AgentSkillSettings from "./AgentSkillSettings";
import SkillList from "./SkillList";
import ImportedSkillList from "./Imported/SkillList";
import { MCPServersList, MCPServerHeader } from "./MCPServers";
import AgentFlowsList from "./AgentFlows";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import { Hammer, Package, Plug, FlowArrow } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

export function SkillsNavigation(props) {
  const { t } = useTranslation();
  const {
    defaultSkills,
    configurableSkills,
    appIntegrationSkills,
    importedSkills,
    selectedSkill,
    selectedFlow,
    agentSkills,
    disabledAgentSkills,
    handleSkillClick,
    handleFlowClick,
    handleMCPClick,
    agentFlows,
    activeFlowIds,
    mcpServers,
    setMcpServers,
    selectedMcpServer,
    setSelectedMcpServer,
  } = props;

  return (
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
          <SkillList
            skills={defaultSkills}
            selectedSkill={selectedSkill}
            handleClick={handleSkillClick}
            activeSkills={Object.keys(defaultSkills).filter(
              (skill) => !disabledAgentSkills.includes(skill),
            )}
          />
          <SkillList
            skills={configurableSkills}
            selectedSkill={selectedSkill}
            handleClick={handleSkillClick}
            activeSkills={agentSkills}
          />

          <div className="text-theme-text-primary flex items-center gap-x-2 mt-6">
            <Package size={24} />
            <p className="text-lg font-medium">{t("common.appIntegrations")}</p>
          </div>
          <SkillList
            skills={appIntegrationSkills}
            selectedSkill={selectedSkill}
            handleClick={handleSkillClick}
            activeSkills={agentSkills}
          />

          <div className="text-theme-text-primary flex items-center gap-x-2 mt-4">
            <Plug size={24} />
            <p className="text-lg font-medium">{t("common.customSkills")}</p>
          </div>
          <ImportedSkillList
            skills={importedSkills}
            selectedSkill={selectedSkill}
            handleClick={handleSkillClick}
          />

          <div className="text-theme-text-primary flex items-center justify-between gap-x-2 mt-4">
            <div className="flex items-center gap-x-2">
              <FlowArrow size={24} />
              <p className="text-lg font-medium">{t("common.agentFlows")}</p>
            </div>
            {agentFlows.length === 0 ? (
              <Link
                to={paths.agents.builder()}
                className="text-cta-button flex items-center gap-x-1 hover:underline"
              >
                <Hammer size={16} />
                <p className="text-sm">{t("common.createFlow")}</p>
              </Link>
            ) : (
              <Link
                to={paths.agents.builder()}
                className="text-theme-text-secondary hover:text-cta-button flex items-center gap-x-1"
              >
                <Hammer size={16} />
                <p className="text-sm">{t("common.openBuilder")}</p>
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
            {({ loadingMcpServers }) => (
              <MCPServersList
                isLoading={loadingMcpServers}
                servers={mcpServers}
                selectedServer={selectedMcpServer}
                handleClick={handleMCPClick}
              />
            )}
          </MCPServerHeader>
        </div>
      </div>
    </div>
  );
}
