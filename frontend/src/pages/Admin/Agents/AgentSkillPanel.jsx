// SPDX-License-Identifier: MIT
import { Robot } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import ImportedSkillConfig from "./Imported/ImportedSkillConfig";
import FlowPanel from "./AgentFlows/FlowPanel";
import ServerPanel from "./MCPServers/ServerPanel";

export default function AgentSkillPanel({
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
}) {
  const { t } = useTranslation();
  if (selectedMcpServer) {
    return (
      <ServerPanel
        server={selectedMcpServer}
        toggleServer={toggleMCP}
        onDelete={handleMCPServerDelete}
        onToggleTool={handleMCPToolToggle}
      />
    );
  }

  if (selectedFlow) {
    return (
      <FlowPanel
        flow={selectedFlow}
        toggleFlow={toggleFlow}
        enabled={activeFlowIds.includes(selectedFlow.uuid)}
        onDelete={handleFlowDelete}
      />
    );
  }

  if (selectedSkill?.imported) {
    return (
      <ImportedSkillConfig
        key={selectedSkill.hubId}
        selectedSkill={selectedSkill}
        setImportedSkills={setImportedSkills}
      />
    );
  }

  const SelectedSkillComponent =
    defaultSkills?.[selectedSkill]?.component ||
    configurableSkills?.[selectedSkill]?.component ||
    appIntegrationSkills?.[selectedSkill]?.component ||
    null;

  if (!SelectedSkillComponent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-theme-text-secondary">
        <Robot size={40} />
        <p className="font-medium">{t("common.selectAgentSkillFlowMcp")}</p>
      </div>
    );
  }

  if (defaultSkills?.[selectedSkill]) {
    return (
      <SelectedSkillComponent
        skill={defaultSkills[selectedSkill]?.skill}
        settings={settings}
        toggleSkill={toggleDefaultSkill}
        enabled={
          !disabledAgentSkills.includes(defaultSkills[selectedSkill]?.skill)
        }
        setHasChanges={setHasChanges}
        {...defaultSkills[selectedSkill]}
      />
    );
  }

  if (configurableSkills?.[selectedSkill]) {
    return (
      <SelectedSkillComponent
        skill={configurableSkills[selectedSkill]?.skill}
        settings={settings}
        toggleSkill={toggleAgentSkill}
        enabled={agentSkills.includes(configurableSkills[selectedSkill]?.skill)}
        setHasChanges={setHasChanges}
        hasChanges={hasChanges}
        {...configurableSkills[selectedSkill]}
      />
    );
  }

  return (
    <SelectedSkillComponent
      skill={appIntegrationSkills[selectedSkill]?.skill}
      settings={settings}
      toggleSkill={toggleAgentSkill}
      enabled={agentSkills.includes(appIntegrationSkills[selectedSkill]?.skill)}
      setHasChanges={setHasChanges}
      hasChanges={hasChanges}
      {...appIntegrationSkills[selectedSkill]}
    />
  );
}
