// SPDX-License-Identifier: MIT
// Docs: AgentSkillPanel.doc.md
import { Robot } from "@phosphor-icons/react/dist/csr/Robot";
import { useTranslation } from "react-i18next";
import ImportedSkillConfig from "./Imported/ImportedSkillConfig";
import FlowPanel from "./AgentFlows/FlowPanel";
import ServerPanel from "./MCPServers/ServerPanel";

type AgentSkillPanelProps = {
  selectedMcpServer?: any;
  selectedFlow?: any;
  selectedSkill?: string;
  defaultSkills?: Record<string, any>;
  configurableSkills?: Record<string, any>;
  appIntegrationSkills?: Record<string, any>;
  toggleMCP?: (server: any) => void;
  handleMCPServerDelete?: (server: any) => void;
  handleMCPToolToggle?: (server: any, tool: any) => void;
  toggleFlow?: (flow: any) => void;
  activeFlowIds?: string[];
  handleFlowDelete?: (flow: any) => void;
  setImportedSkills?: React.Dispatch<React.SetStateAction<any[]>>;
  disabledAgentSkills?: string[];
  toggleDefaultSkill?: (skill: any) => void;
  settings?: any;
  setHasChanges?: (value: boolean) => void;
  hasChanges?: boolean;
  toggleAgentSkill?: (skill: any) => void;
  agentSkills?: string[];
};

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
}: AgentSkillPanelProps): JSX.Element {
  const { t } = useTranslation();
  const noop = () => {};
  const skillKey = selectedSkill ?? "";
  if (selectedMcpServer) {
    return (
      <ServerPanel
        server={selectedMcpServer}
        toggleServer={toggleMCP ?? noop}
        onDelete={handleMCPServerDelete ?? noop}
        onToggleTool={handleMCPToolToggle ?? noop}
      />
    );
  }

  if (selectedFlow) {
    return (
      <FlowPanel
        flow={selectedFlow}
        toggleFlow={toggleFlow ?? noop}
        enabled={activeFlowIds?.includes(selectedFlow.uuid) ?? false}
        onDelete={handleFlowDelete ?? noop}
      />
    );
  }

  if (selectedSkill && (selectedSkill as any)?.imported) {
    return (
      <ImportedSkillConfig
        key={(selectedSkill as any).hubId}
        selectedSkill={selectedSkill}
        setImportedSkills={setImportedSkills ?? (() => {})}
      />
    );
  }

  const SelectedSkillComponent =
    defaultSkills?.[skillKey]?.component ||
    configurableSkills?.[skillKey]?.component ||
    appIntegrationSkills?.[skillKey]?.component ||
    null;

  if (!SelectedSkillComponent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-theme-text-secondary">
        <Robot size={40} />
        <p className="font-medium">{t("common.selectAgentSkillFlowMcp")}</p>
      </div>
    );
  }

  if (defaultSkills?.[skillKey]) {
    return (
      <SelectedSkillComponent
        skill={defaultSkills[skillKey]?.skill}
        settings={settings}
        toggleSkill={toggleDefaultSkill}
        enabled={
          !disabledAgentSkills?.includes(defaultSkills[skillKey]?.skill)
        }
        setHasChanges={setHasChanges}
        {...defaultSkills[skillKey]}
      />
    );
  }

  if (configurableSkills?.[skillKey]) {
    return (
      <SelectedSkillComponent
        skill={configurableSkills[skillKey]?.skill}
        settings={settings}
        toggleSkill={toggleAgentSkill}
        enabled={agentSkills?.includes(
          configurableSkills[skillKey]?.skill,
        )}
        setHasChanges={setHasChanges}
        hasChanges={hasChanges}
        {...configurableSkills[skillKey]}
      />
    );
  }

  return (
    <SelectedSkillComponent
      skill={appIntegrationSkills?.[skillKey]?.skill}
      settings={settings}
      toggleSkill={toggleAgentSkill}
      enabled={agentSkills?.includes(
        appIntegrationSkills?.[skillKey]?.skill,
      )}
      setHasChanges={setHasChanges}
      hasChanges={hasChanges}
      {...appIntegrationSkills?.[skillKey]}
    />
  );
}
