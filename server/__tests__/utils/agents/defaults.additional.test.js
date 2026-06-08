// SPDX-License-Identifier: MIT
/* eslint-env jest */
process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";

const mockPlugins = {
  memory: { name: "rag-memory" },
  docSummarizer: { name: "document-summarizer" },
  webScraping: { name: "web-scraping" },
  filesystemAgent: {
    name: "filesystem-agent",
    plugin: [{ name: "read-file" }, { name: "write-file" }],
  },
  createFilesAgent: {
    name: "create-files-agent",
    plugin: [{ name: "create-file" }],
  },
  gmailAgent: {
    name: "gmail-agent",
    plugin: [{ name: "send-email" }, { name: "read-inbox" }],
  },
  outlookAgent: {
    name: "outlook-agent",
    plugin: [{ name: "outlook-send" }],
  },
  requestUserInput: {
    name: "request-user-input",
    plugin: [{ name: "ask-user" }],
  },
  webBrowsing: { name: "web-browsing" },
};

for (const key of Object.keys(mockPlugins)) {
  mockPlugins[mockPlugins[key].name] = mockPlugins[key];
}

jest.mock("../../../utils/agents/aibitat/plugins", () => mockPlugins);

jest.mock("../../../models/systemSettings");
jest.mock("../../../utils/agents/imported", () => ({
  activeImportedPlugins: jest.fn().mockReturnValue([]),
}));
jest.mock("../../../utils/agentFlows", () => ({
  AgentFlows: {
    activeFlowPlugins: jest.fn().mockReturnValue([]),
  },
}));
jest.mock("../../../utils/memories", () => ({
  promptWithMemories: jest.fn(({ systemPrompt }) => Promise.resolve(systemPrompt)),
}));

jest.mock("../../../utils/agents/aibitat/plugins/filesystem/lib", () => ({
  isToolAvailable: jest.fn().mockReturnValue(true),
}));
jest.mock("../../../utils/agents/aibitat/plugins/create-files/lib", () => ({
  isToolAvailable: jest.fn().mockReturnValue(true),
}));
jest.mock("../../../utils/agents/aibitat/plugins/gmail/lib", () => ({
  GmailBridge: { isToolAvailable: jest.fn().mockResolvedValue(false) },
}));
jest.mock("../../../utils/agents/aibitat/plugins/outlook/lib", () => ({
  OutlookBridge: { isToolAvailable: jest.fn().mockResolvedValue(false) },
}));

const mockActiveMCPServers = jest.fn().mockResolvedValue([]);
jest.mock("../../../utils/MCP", () => {
  const MockConstructor = jest.fn().mockImplementation(() => ({
    activeMCPServers: mockActiveMCPServers,
  }));
  MockConstructor._mockActiveMCPServers = mockActiveMCPServers;
  return MockConstructor;
});

const { SystemSettings } = require("../../../models/systemSettings");
const Provider = require("../../../utils/agents/aibitat/providers/ai-provider");
const MCPCompatibilityLayer = require("../../../utils/MCP");
const {
  USER_AGENT,
  WORKSPACE_AGENT,
  agentSkillsFromSystemSettings,
} = require("../../../utils/agents/defaults");

describe("USER_AGENT", () => {
  it("has name USER", () => {
    expect(USER_AGENT.name).toBe("USER");
  });

  it("getDefinition returns interrupt ALWAYS and monitoring role", () => {
    const def = USER_AGENT.getDefinition();
    expect(def.interrupt).toBe("ALWAYS");
    expect(def.role).toContain("human monitor");
    expect(def.role).toContain("oversee this chat");
  });

  it("getDefinition returns consistent output on multiple calls", () => {
    const a = USER_AGENT.getDefinition();
    const b = USER_AGENT.getDefinition();
    expect(a).toEqual(b);
  });
});

describe("agentSkillsFromSystemSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Provider, "systemPrompt").mockResolvedValue("mock prompt");
    SystemSettings.getValueOrFallback = jest.fn().mockResolvedValue("[]");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns default skills when nothing is disabled", async () => {
    const skills = await agentSkillsFromSystemSettings();
    expect(skills).toContain("rag-memory");
    expect(skills).toContain("document-summarizer");
    expect(skills).toContain("web-scraping");
  });

  it("excludes default skills listed in disabled_agent_skills", async () => {
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "disabled_agent_skills") return Promise.resolve('["rag-memory"]');
      return Promise.resolve("[]");
    });

    const skills = await agentSkillsFromSystemSettings();
    expect(skills).not.toContain("rag-memory");
    expect(skills).toContain("document-summarizer");
    expect(skills).toContain("web-scraping");
  });

  it("excludes all default skills when all are disabled", async () => {
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "disabled_agent_skills")
        return Promise.resolve('["rag-memory","document-summarizer","web-scraping"]');
      return Promise.resolve("[]");
    });

    const skills = await agentSkillsFromSystemSettings();
    expect(skills).not.toContain("rag-memory");
    expect(skills).not.toContain("document-summarizer");
    expect(skills).not.toContain("web-scraping");
  });

  it("includes additional skills from default_agent_skills setting", async () => {
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "default_agent_skills") return Promise.resolve('["web-browsing"]');
      return Promise.resolve("[]");
    });

    const skills = await agentSkillsFromSystemSettings();
    expect(skills).toContain("web-browsing");
  });

  it("skips skills not present in AgentPlugins", async () => {
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "default_agent_skills") return Promise.resolve('["nonexistent-skill"]');
      return Promise.resolve("[]");
    });

    const skills = await agentSkillsFromSystemSettings();
    expect(skills).not.toContain("nonexistent-skill");
  });

  it("expands sub-plugins with parent#child naming", async () => {
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "default_agent_skills") return Promise.resolve('["filesystem-agent"]');
      if (label === "disabled_filesystem_skills") return Promise.resolve("[]");
      return Promise.resolve("[]");
    });

    const skills = await agentSkillsFromSystemSettings();
    expect(skills).toContain("filesystem-agent#read-file");
    expect(skills).toContain("filesystem-agent#write-file");
  });

  it("filters sub-plugins when tool is not available", async () => {
    const fsLib = require("../../../utils/agents/aibitat/plugins/filesystem/lib");
    fsLib.isToolAvailable.mockReturnValue(false);

    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "default_agent_skills") return Promise.resolve('["filesystem-agent"]');
      if (label === "disabled_filesystem_skills") return Promise.resolve("[]");
      return Promise.resolve("[]");
    });

    const skills = await agentSkillsFromSystemSettings();
    expect(skills).not.toContain("filesystem-agent#read-file");
    expect(skills).not.toContain("filesystem-agent#write-file");

    fsLib.isToolAvailable.mockReturnValue(true);
  });

  it("filters individual disabled sub-skills", async () => {
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "default_agent_skills") return Promise.resolve('["filesystem-agent"]');
      if (label === "disabled_filesystem_skills") return Promise.resolve('["write-file"]');
      return Promise.resolve("[]");
    });

    const skills = await agentSkillsFromSystemSettings();
    expect(skills).toContain("filesystem-agent#read-file");
    expect(skills).not.toContain("filesystem-agent#write-file");
  });

  it("handles malformed JSON in settings gracefully", async () => {
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "disabled_agent_skills") return Promise.resolve("not-json");
      if (label === "default_agent_skills") return Promise.resolve("also-bad");
      return Promise.resolve("[]");
    });

    const skills = await agentSkillsFromSystemSettings();
    expect(Array.isArray(skills)).toBe(true);
  });

  it("includes single-stage plugins by name without expansion", async () => {
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "default_agent_skills") return Promise.resolve('["web-browsing"]');
      return Promise.resolve("[]");
    });

    const skills = await agentSkillsFromSystemSettings();
    expect(skills).toContain("web-browsing");
    expect(skills.some((s) => s.includes("#") && s.startsWith("web-browsing"))).toBe(false);
  });

  it("skips create-files-agent sub-plugins when tool is not available", async () => {
    const cfLib = require("../../../utils/agents/aibitat/plugins/create-files/lib");
    cfLib.isToolAvailable.mockReturnValue(false);

    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "default_agent_skills") return Promise.resolve('["create-files-agent"]');
      if (label === "disabled_create_files_skills") return Promise.resolve("[]");
      return Promise.resolve("[]");
    });

    const skills = await agentSkillsFromSystemSettings();
    expect(skills).not.toContain("create-files-agent#create-file");

    cfLib.isToolAvailable.mockReturnValue(true);
  });
});

describe("WORKSPACE_AGENT.getDefinition — clarifying questions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Provider, "systemPrompt").mockResolvedValue("base prompt");
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "agent_clarifying_questions_enabled") return Promise.resolve("false");
      return Promise.resolve("[]");
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does not append clarifying questions instructions when disabled", async () => {
    const def = await WORKSPACE_AGENT.getDefinition("openai", { id: 1 }, { id: 1 });
    expect(def.role).not.toContain("request-user-input");
    expect(def.role).not.toContain("MUST use the request-user-input tool");
  });

  it("appends clarifying questions instructions to role when enabled", async () => {
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "agent_clarifying_questions_enabled") return Promise.resolve("true");
      return Promise.resolve("[]");
    });

    const def = await WORKSPACE_AGENT.getDefinition("openai", { id: 1 }, { id: 1 });
    expect(def.role).toContain("request-user-input tool");
    expect(def.role).toContain("MUST use the request-user-input tool");
  });

  it("includes request-user-input sub-skills in functions when enabled", async () => {
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "agent_clarifying_questions_enabled") return Promise.resolve("true");
      return Promise.resolve("[]");
    });

    const def = await WORKSPACE_AGENT.getDefinition("openai", { id: 1 }, { id: 1 });
    expect(def.functions).toContain("request-user-input#ask-user");
  });

  it("excludes request-user-input sub-skills from functions when disabled", async () => {
    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "agent_clarifying_questions_enabled") return Promise.resolve("false");
      return Promise.resolve("[]");
    });

    const def = await WORKSPACE_AGENT.getDefinition("openai", { id: 1 }, { id: 1 });
    expect(def.functions).not.toContain("request-user-input#ask-user");
  });

  it("returns empty clarifying skills when enabled but plugin has no sub-plugins array", async () => {
    const originalPlugin = mockPlugins.requestUserInput.plugin;
    mockPlugins.requestUserInput.plugin = "not-an-array";

    SystemSettings.getValueOrFallback = jest.fn(({ label }) => {
      if (label === "agent_clarifying_questions_enabled") return Promise.resolve("true");
      return Promise.resolve("[]");
    });

    const def = await WORKSPACE_AGENT.getDefinition("openai", { id: 1 }, { id: 1 });
    expect(def.role).not.toContain("request-user-input tool");
    expect(def.functions).not.toContain("request-user-input#ask-user");

    mockPlugins.requestUserInput.plugin = originalPlugin;
  });
});

describe("WORKSPACE_AGENT.getDefinition — functions composition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Provider, "systemPrompt").mockResolvedValue("prompt");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("includes imported plugins in functions", async () => {
    const { activeImportedPlugins } = require("../../../utils/agents/imported");
    SystemSettings.getValueOrFallback = jest.fn().mockResolvedValue("[]");
    activeImportedPlugins.mockReturnValue(["imported-plugin-1"]);

    const def = await WORKSPACE_AGENT.getDefinition("openai", { id: 1 }, null);
    expect(def.functions).toContain("imported-plugin-1");

    activeImportedPlugins.mockReturnValue([]);
  });

  it("includes agent flow plugins in functions", async () => {
    const { AgentFlows } = require("../../../utils/agentFlows");
    SystemSettings.getValueOrFallback = jest.fn().mockResolvedValue("[]");
    AgentFlows.activeFlowPlugins.mockReturnValue(["flow-plugin-1"]);

    const def = await WORKSPACE_AGENT.getDefinition("openai", { id: 1 }, null);
    expect(def.functions).toContain("flow-plugin-1");

    AgentFlows.activeFlowPlugins.mockReturnValue([]);
  });

  it("includes MCP server plugins in functions", async () => {
    SystemSettings.getValueOrFallback = jest.fn().mockResolvedValue("[]");
    mockActiveMCPServers.mockResolvedValue(["mcp-tool-1"]);

    const def = await WORKSPACE_AGENT.getDefinition("openai", { id: 1 }, null);
    expect(def.functions).toContain("mcp-tool-1");

    mockActiveMCPServers.mockResolvedValue([]);
  });
});
