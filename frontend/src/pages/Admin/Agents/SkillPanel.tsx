// SPDX-License-Identifier: MIT
// Docs: SkillPanel.doc.md
import { Robot } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import FlowPanel from "./AgentFlows/FlowPanel";
import ImportedSkillConfig from "./Imported/ImportedSkillConfig";
import ServerPanel from "./MCPServers/ServerPanel";

type SkillPanelProps = {
  selectedSkill: any;
  selectedFlow: any;
  selectedMcpServer: any;
  SelectedSkillComponent: any;
  agentSkills: any[];
  disabledAgentSkills: any[];
  defaultSkills: Record<string, any>;
  configurableSkills: Record<string, any>;
  appIntegrationSkills: Record<string, any>;
  settings: any;
  toggleDefaultSkill: (skill: any) => void;
  toggleAgentSkill: (skill: any) => void;
  toggleFlow: (flow: any) => void;
  toggleMCP: (server: any) => void;
  activeFlowIds: string[];
  handleFlowDelete: (flow: any) => void;
  handleMCPServerDelete: (server: any) => void;
  handleMCPToolToggle: (server: any, tool: any) => void;
  setImportedSkills: React.Dispatch<React.SetStateAction<any[]>>;
};

export function SkillPanel({
  selectedSkill,
  selectedFlow,
  selectedMcpServer,
  SelectedSkillComponent,
  agentSkills,
  disabledAgentSkills,
  defaultSkills,
  configurableSkills,
  appIntegrationSkills,
  settings,
  toggleDefaultSkill,
  toggleAgentSkill,
  toggleFlow,
  toggleMCP,
  activeFlowIds,
  handleFlowDelete,
  handleMCPServerDelete,
  handleMCPToolToggle,
  setImportedSkills,
}: SkillPanelProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="flex-[2] flex flex-col gap-y-[18px] mt-10">
      <div className="bg-theme-bg-secondary text-white rounded-xl flex-1 p-4 overflow-y-scroll overflow-x-visible no-scroll">
        {SelectedSkillComponent ? (
          <>
            {selectedMcpServer ? (
              <ServerPanel
                server={selectedMcpServer}
                toggleServer={toggleMCP}
                onDelete={handleMCPServerDelete}
                onToggleTool={handleMCPToolToggle}
              />
            ) : selectedFlow ? (
              <FlowPanel
                flow={selectedFlow}
                toggleFlow={toggleFlow}
                enabled={activeFlowIds.includes(selectedFlow.uuid)}
                onDelete={handleFlowDelete}
              />
            ) : selectedSkill?.imported ? (
              <ImportedSkillConfig
                key={selectedSkill.hubId}
                selectedSkill={selectedSkill}
                setImportedSkills={setImportedSkills}
              />
            ) : (
              <>
                {defaultSkills?.[selectedSkill] ? (
                  <SelectedSkillComponent
                    skill={defaultSkills[selectedSkill]?.skill}
                    settings={settings}
                    toggleSkill={toggleDefaultSkill}
                    enabled={
                      !disabledAgentSkills.includes(
                        defaultSkills[selectedSkill]?.skill,
                      )
                    }
                    {...defaultSkills[selectedSkill]}
                  />
                ) : configurableSkills?.[selectedSkill] ? (
                  <SelectedSkillComponent
                    skill={configurableSkills[selectedSkill]?.skill}
                    settings={settings}
                    toggleSkill={toggleAgentSkill}
                    enabled={agentSkills.includes(
                      configurableSkills[selectedSkill]?.skill,
                    )}
                    {...configurableSkills[selectedSkill]}
                  />
                ) : (
                  <SelectedSkillComponent
                    skill={appIntegrationSkills[selectedSkill]?.skill}
                    settings={settings}
                    toggleSkill={toggleAgentSkill}
                    enabled={agentSkills.includes(
                      appIntegrationSkills[selectedSkill]?.skill,
                    )}
                    {...appIntegrationSkills[selectedSkill]}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-theme-text-secondary">
            <Robot size={40} />
            <p className="font-medium">{t("common.selectAgentSkillFlowMcp")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
