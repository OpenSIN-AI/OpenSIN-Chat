// SPDX-License-Identifier: MIT
/**
 * Agent-related domain types.
 */

export interface Agent {
  id: number;
  slug: string;
  name: string;
  workspaceId: number;
  enabled: boolean;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface AgentFlow {
  uuid: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfig {
  name: string;
  model: string;
  agentSkillRerankerEnabled?: boolean;
  agentSkillRerankerTopN?: number;
  agentSkillMaxToolCalls?: number;
  agentClarifyingQuestionsEnabled?: boolean;
  agentClarifyingQuestionsMaxPerTurn?: number;
}
