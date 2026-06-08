// SPDX-License-Identifier: MIT
import { Robot, CaretRight } from "@phosphor-icons/react";
import FlowPanel from "./AgentFlows/FlowPanel";
import ImportedSkillConfig from "./Imported/ImportedSkillConfig";
import ServerPanel from "./MCPServers/ServerPanel";
import { DefaultBadge } from "./Badges/default";
import SkillList from "./SkillList";

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
}) {
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
                        defaultSkills[selectedSkill]?.skill
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
                      configurableSkills[selectedSkill]?.skill
                    )}
                    {...configurableSkills[selectedSkill]}
                  />
                ) : (
                  <SelectedSkillComponent
                    skill={appIntegrationSkills[selectedSkill]?.skill}
                    settings={settings}
                    toggleSkill={toggleAgentSkill}
                    enabled={agentSkills.includes(
                      appIntegrationSkills[selectedSkill]?.skill
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
            <p className="font-medium">
              Select an Agent Skill, Agent Flow, or MCP Server
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
