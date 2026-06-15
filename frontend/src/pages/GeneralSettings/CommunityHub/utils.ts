// SPDX-License-Identifier: MIT
// Docs: utils.doc.md
type ReadableType =
  | "agentSkills"
  | "agentSkill"
  | "systemPrompts"
  | "systemPrompt"
  | "slashCommands"
  | "slashCommand"
  | "agentFlows"
  | "agentFlow";

/**
 * Convert a type to a readable string for the community hub.
 */
export function readableType(type: ReadableType): string {
  switch (type) {
    case "agentSkills":
    case "agentSkill":
      return "Agent Skills";
    case "systemPrompt":
    case "systemPrompts":
      return "System Prompts";
    case "slashCommand":
    case "slashCommands":
      return "Slash Commands";
    case "agentFlows":
    case "agentFlow":
      return "Agent Flows";
  }
}

type PathType =
  | "agentSkill"
  | "agentSkills"
  | "systemPrompt"
  | "systemPrompts"
  | "slashCommand"
  | "slashCommands"
  | "agentFlow"
  | "agentFlows";

/**
 * Convert a type to a path for the community hub.
 */
export function typeToPath(type: PathType): string {
  switch (type) {
    case "agentSkill":
    case "agentSkills":
      return "agent-skills";
    case "systemPrompt":
    case "systemPrompts":
      return "system-prompts";
    case "slashCommand":
    case "slashCommands":
      return "slash-commands";
    case "agentFlow":
    case "agentFlows":
      return "agent-flows";
  }
}