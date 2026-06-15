// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import type { ComponentType } from "react";
import SystemPrompt from "./SystemPrompt";
import SlashCommand from "./SlashCommand";
import UnknownItem from "./Unknown";
import AgentSkill from "./AgentSkill";
import AgentFlow from "./AgentFlow";

const HubItemComponent: Record<string, ComponentType<any>> = {
  "agent-skill": AgentSkill,
  "system-prompt": SystemPrompt,
  "slash-command": SlashCommand,
  "agent-flow": AgentFlow,
  unknown: UnknownItem,
};

export default HubItemComponent;
