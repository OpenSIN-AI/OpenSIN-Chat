// SPDX-License-Identifier: MIT
// Set required env vars before requiring modules
process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";

jest.mock("../../../models/systemSettings");
jest.mock("../../../utils/agents/imported", () => ({
  activeImportedPlugins: jest.fn().mockReturnValue([]),
}));
jest.mock("../../../utils/agentFlows", () => ({
  AgentFlows: {
    activeFlowPlugins: jest.fn().mockReturnValue([]),
  },
}));
jest.mock("../../../utils/MCP", () => {
  return jest.fn().mockImplementation(() => ({
    activeMCPServers: jest.fn().mockResolvedValue([]),
  }));
});
jest.mock("../../../utils/memories", () => ({
  promptWithMemories: jest.fn(({ systemPrompt }) => Promise.resolve(systemPrompt)),
}));
jest.mock("../../../utils/agents/aibitat/plugins", () => {
  const plugins = {
    memory: { name: "rag-memory" },
    docSummarizer: { name: "document-summarizer" },
    webScraping: { name: "web-scraping" },
    generateReport: { name: "generate-report" },
    deepResearch: { name: "deep-research" },
    requestUserInput: { name: "request-user-input", plugin: [{ name: "ask-user" }] },
  };
  for (const key of Object.keys(plugins)) {
    plugins[plugins[key].name] = plugins[key];
  }
  return plugins;
});

const Provider = require("../../../utils/agents/aibitat/providers/ai-provider");
const { WORKSPACE_AGENT } = require("../../../utils/agents/defaults");

describe("WORKSPACE_AGENT.getDefinition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock SystemSettings to return empty arrays for agent skills
    const { SystemSettings } = require("../../../models/systemSettings");
    SystemSettings.getValueOrFallback = jest.fn().mockResolvedValue("[]");
    // Mock Provider.systemPrompt to return a deterministic string
    // This avoids the need to mock the deeply-nested systemPromptVariables module
    jest.spyOn(Provider, "systemPrompt").mockImplementation(async ({ provider, workspace }) => {
      if (!workspace?.openAiPrompt) {
        return Provider.defaultSystemPromptForProvider(provider);
      }
      return `expanded:${workspace.openAiPrompt}`;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should use provider default system prompt when workspace has no openAiPrompt", async () => {
    const workspace = {
      id: 1,
      name: "Test Workspace",
      openAiPrompt: null,
    };
    const user = { id: 1 };
    const provider = "openai";
    const expectedPrompt = await Provider.systemPrompt({ provider, workspace, user });
    const definition = await WORKSPACE_AGENT.getDefinition(
      provider,
      workspace,
      user
    );
    expect(definition.role).toBe(expectedPrompt);
    expect(Provider.systemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ provider, workspace, user })
    );
  });

  it("should use workspace system prompt with variable expansion when openAiPrompt exists", async () => {
    const workspace = {
      id: 1,
      name: "Test Workspace",
      openAiPrompt: "You are a helpful assistant for {workspace.name}. The current user is {user.name}.",
    };
    const user = { id: 1 };
    const provider = "openai";

    const definition = await WORKSPACE_AGENT.getDefinition(
      provider,
      workspace,
      user
    );

    expect(Provider.systemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ provider, workspace, user })
    );
    expect(definition.role).toBe(
      `expanded:${workspace.openAiPrompt}`
    );
  });

  it("should handle workspace system prompt without user context", async () => {
    const workspace = {
      id: 1,
      name: "Test Workspace",
      openAiPrompt: "You are a helpful assistant. Today is {date}.",
    };
    const user = null;
    const provider = "lmstudio";

    const definition = await WORKSPACE_AGENT.getDefinition(
      provider,
      workspace,
      user
    );

    expect(Provider.systemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ provider, workspace, user })
    );
    expect(definition.role).toBe(
      `expanded:${workspace.openAiPrompt}`
    );
  });

  it("should return functions array in definition", async () => {
    const workspace = { id: 1, openAiPrompt: null };
    const provider = "openai";

    const definition = await WORKSPACE_AGENT.getDefinition(
      provider,
      workspace,
      null
    );

    expect(definition).toHaveProperty("functions");
    expect(Array.isArray(definition.functions)).toBe(true);
  });

  it("should use LMStudio specific prompt when workspace has no openAiPrompt", async () => {
    const workspace = { id: 1, openAiPrompt: null };
    const user = null;
    const provider = "lmstudio";

    Provider.systemPrompt.mockRestore();
    jest.spyOn(Provider, "systemPrompt").mockResolvedValue(
      "You are a helpful ai assistant who can assist the user and use tools available to help answer the users prompts and questions."
    );

    const definition = await WORKSPACE_AGENT.getDefinition(
      provider,
      workspace,
      null
    );

    expect(definition.role).toBe(await Provider.systemPrompt({ provider, workspace, user }));
    expect(definition.role).toContain("helpful ai assistant");
  });
});
