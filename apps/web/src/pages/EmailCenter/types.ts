// SPDX-License-Identifier: MIT
export interface EmailAccount {
  id: string;
  label: string;
  email: string;
  provider: "himalaya";
  configured: boolean;
  enabled: boolean;
  isDefault: boolean;
}

export interface EmailGroup {
  id: string;
  name: string;
  description?: string;
  emails: string[];
  domains: string[];
}

export interface EmailWorkflow {
  id: number;
  name: string;
  accountIds: string[];
  groupId?: string | null;
  groupName?: string;
  groupMembers?: string[];
  instruction?: string;
  sender?: string;
  subject?: string;
  condition?: string;
  actions: string[];
  safetyMode: "notify" | "approval" | "automatic";
  cadenceLabel: string;
  toolIds?: string[];
  schedule: string;
  enabled: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  latestRun?: {
    status?: string;
    error?: string | null;
    result?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
  } | null;
}

export interface ToolCategory {
  category: string;
  name: string;
  items: Array<{
    id: string;
    name: string;
    description?: string | null;
    requiresSetup?: boolean;
  }>;
}

export interface EmailRuntime {
  provider: "himalaya";
  available: boolean;
  binaryAvailable: boolean;
  version: string;
  configPath: string;
  error: string;
}

export interface EmailBootstrap {
  runtime: EmailRuntime;
  accounts: EmailAccount[];
  groups: EmailGroup[];
  workflows: EmailWorkflow[];
  toolCategories: ToolCategory[];
  defaultAccountId: string;
}
