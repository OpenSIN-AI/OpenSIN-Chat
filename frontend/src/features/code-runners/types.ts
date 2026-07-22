// SPDX-License-Identifier: MIT

export type CodeRunnerTransport = "local-cli" | "ssh" | "container" | "api";

export type CodeRunnerStatus = "available" | "offline" | "authentication-required" | "unsupported";

export interface CodeRunnerCapabilities {
  readFiles: boolean;
  writeFiles: boolean;
  executeCommands: boolean;
  useGit: boolean;
  createCommits: boolean;
  createPullRequests: boolean;
  runTests: boolean;
  parallelAgents: boolean;
}

export interface CodeRunnerDefinition {
  id: string;
  name: string;
  description: string;
  transport: CodeRunnerTransport;
  executable?: string;
  capabilities: CodeRunnerCapabilities;
}

export interface ConnectedCodeRunner {
  id: string;
  definitionId: string;
  name: string;
  status: CodeRunnerStatus;
  machineId?: string;
  workingDirectory?: string;
  repositorySourceId?: string;
  configuration: Record<string, unknown>;
}

export interface CodeRunnerTask {
  id: string;
  notebookSlug: string;
  runnerId: string;
  prompt: string;
  repositorySourceId?: string;
  permissions: {
    read: boolean;
    write: boolean;
    execute: boolean;
    commit: boolean;
    publish: boolean;
  };
}
