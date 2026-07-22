// SPDX-License-Identifier: MIT

import type { CodeRunnerDefinition } from "./types";

const DEFAULT_CAPABILITIES = {
  readFiles: true,
  writeFiles: true,
  executeCommands: true,
  useGit: true,
  createCommits: true,
  createPullRequests: false,
  runTests: true,
  parallelAgents: false,
};

export const CODE_RUNNER_CATALOG: CodeRunnerDefinition[] = [
  {
    id: "codex-cli",
    name: "Codex CLI",
    description: "OpenAI Coding-Agent für lokale Repositories",
    transport: "local-cli",
    executable: "codex",
    capabilities: { ...DEFAULT_CAPABILITIES, createPullRequests: true },
  },
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Anthropic Coding-Agent für lokale Repositories",
    transport: "local-cli",
    executable: "claude",
    capabilities: { ...DEFAULT_CAPABILITIES },
  },
  {
    id: "opencode",
    name: "OpenCode",
    description: "Offener terminalbasierter Coding-Agent",
    transport: "local-cli",
    executable: "opencode",
    capabilities: { ...DEFAULT_CAPABILITIES },
  },
  {
    id: "mimo-code",
    name: "Mimo Code",
    description: "Mimo-basierter Coding-Agent",
    transport: "local-cli",
    executable: "mimo",
    capabilities: { ...DEFAULT_CAPABILITIES },
  },
  {
    id: "orca",
    name: "Orca",
    description: "Orchestrierung mehrerer spezialisierter Coding-Agenten",
    transport: "api",
    capabilities: { ...DEFAULT_CAPABILITIES, createPullRequests: true, parallelAgents: true },
  },
  {
    id: "custom-cli",
    name: "Eigene CLI",
    description: "Beliebigen kompatiblen lokalen Agenten anbinden",
    transport: "local-cli",
    capabilities: { ...DEFAULT_CAPABILITIES },
  },
];
