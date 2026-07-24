// SPDX-License-Identifier: MIT
/* eslint-env jest */
// Tests for server/utils/MCP/index.js — MCPCompatibilityLayer (Issue #387)
//
// The MCPCompatibilityLayer extends MCPHypervisor. We mock the hypervisor
// parent so we can isolate the compatibility-layer logic (plugin conversion,
// server listing, toggle/delete, result serialization, tool suppression)
// without booting real MCP child processes.

// --- Mock the hypervisor parent class ---
// We replace the entire hypervisor module with a stub class that provides
// the properties/methods the child class relies on, so the child's
// constructor and methods can be exercised in isolation.
const mockBootMCPServers = jest.fn().mockResolvedValue(undefined);
const mockGetSuppressedTools = jest.fn().mockReturnValue([]);
const mockUpdateSuppressedTools = jest.fn().mockReturnValue({
  success: true,
  error: null,
  suppressedTools: [],
});
const mockPruneMCPServer = jest.fn().mockReturnValue(true);
const mockStartMCPServer = jest.fn().mockResolvedValue({
  success: true,
  error: null,
});
const mockRemoveMCPServerFromConfig = jest.fn().mockReturnValue(true);

jest.mock("../../utils/MCP/hypervisor", () => {
  return class MockHypervisor {
    static _instance = null;
    mcps = {};
    mcpLoadingResults = {};
    mcpServerConfigs = [];
    log = jest.fn();

    constructor() {
      if (MockHypervisor._instance) return MockHypervisor._instance;
      MockHypervisor._instance = this;
    }

    async bootMCPServers() {
      return mockBootMCPServers();
    }

    getSuppressedTools(serverName) {
      return mockGetSuppressedTools(serverName);
    }

    updateSuppressedTools(serverName, toolName, enabled) {
      return mockUpdateSuppressedTools(serverName, toolName, enabled);
    }

    pruneMCPServer(name) {
      return mockPruneMCPServer(name);
    }

    async startMCPServer(name) {
      return mockStartMCPServer(name);
    }

    removeMCPServerFromConfig(name) {
      return mockRemoveMCPServerFromConfig(name);
    }
  };
});

const MCPCompatibilityLayer = require("../../utils/MCP");

// Helper: create a fresh instance with a mock MCP client in this.mcps
function createInstanceWithMockMcp(name, mcpClient = {}) {
  // Reset singleton
  MCPCompatibilityLayer._instance = null;
  const MockHypervisor = require("../../utils/MCP/hypervisor");
  MockHypervisor._instance = null;
  const instance = new MCPCompatibilityLayer();
  instance.mcps[name] = {
    listTools: jest.fn().mockResolvedValue({ tools: [] }),
    ping: jest.fn().mockResolvedValue(true),
    callTool: jest.fn().mockResolvedValue({ content: "ok" }),
    close: jest.fn(),
    transport: { _process: { pid: 12345 } },
    ...mcpClient,
  };
  return instance;
}

beforeEach(() => {
  jest.clearAllMocks();
  MCPCompatibilityLayer._instance = null;
  const MockHypervisor = require("../../utils/MCP/hypervisor");
  MockHypervisor._instance = null;
});

describe("MCPCompatibilityLayer — singleton pattern", () => {
  it("returns the same instance on subsequent construction", () => {
    const a = new MCPCompatibilityLayer();
    const b = new MCPCompatibilityLayer();
    expect(a).toBe(b);
  });
});

describe("MCPCompatibilityLayer — activeMCPServers", () => {
  it("boots MCP servers and returns @@mcp_{name} flow names", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcps = { "docker-mcp": {}, "fs-mcp": {} };

    const result = await instance.activeMCPServers();

    expect(mockBootMCPServers).toHaveBeenCalled();
    expect(result).toEqual(["@@mcp_docker-mcp", "@@mcp_fs-mcp"]);
  });

  it("returns empty array when no MCP servers are loaded", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcps = {};

    const result = await instance.activeMCPServers();
    expect(result).toEqual([]);
  });
});

describe("MCPCompatibilityLayer — convertServerToolsToPlugins", () => {
  it("returns null when the server name is not found in this.mcps", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcps = {};
    const result = await instance.convertServerToolsToPlugins("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null when listTools throws an error", async () => {
    const instance = createInstanceWithMockMcp("my-server", {
      listTools: jest.fn().mockRejectedValue(new Error("connection refused")),
    });
    const result = await instance.convertServerToolsToPlugins("my-server");
    expect(result).toBeNull();
    expect(instance.log).toHaveBeenCalledWith(
      expect.stringContaining("Failed to list tools"),
      expect.any(Error),
    );
  });

  it("returns null when tools array is empty", async () => {
    const instance = createInstanceWithMockMcp("my-server", {
      listTools: jest.fn().mockResolvedValue({ tools: [] }),
    });
    const result = await instance.convertServerToolsToPlugins("my-server");
    expect(result).toBeNull();
  });

  it("returns null when tools is undefined", async () => {
    const instance = createInstanceWithMockMcp("my-server", {
      listTools: jest.fn().mockResolvedValue({}),
    });
    const result = await instance.convertServerToolsToPlugins("my-server");
    expect(result).toBeNull();
  });

  it("converts tools to plugin configurations with name and description", async () => {
    const tools = [
      { name: "list-containers", description: "List Docker containers", inputSchema: { type: "object", properties: {} } },
      { name: "run-container", description: "Run a container", inputSchema: { type: "object", properties: {} } },
    ];
    const instance = createInstanceWithMockMcp("docker-mcp", {
      listTools: jest.fn().mockResolvedValue({ tools }),
    });

    const plugins = await instance.convertServerToolsToPlugins("docker-mcp");

    expect(plugins).toHaveLength(2);
    expect(plugins[0]).toHaveProperty("name", "docker-mcp-list-containers");
    expect(plugins[0]).toHaveProperty("description", "List Docker containers");
    expect(plugins[0]).toHaveProperty("plugin");
    expect(typeof plugins[0].plugin).toBe("function");
    expect(plugins[0].toolName).toBe("docker-mcp:list-containers");
    expect(plugins[1].toolName).toBe("docker-mcp:run-container");
  });

  it("filters out suppressed tools", async () => {
    const tools = [
      { name: "tool-a", description: "A", inputSchema: { type: "object", properties: {} } },
      { name: "tool-b", description: "B", inputSchema: { type: "object", properties: {} } },
      { name: "tool-c", description: "C", inputSchema: { type: "object", properties: {} } },
    ];
    mockGetSuppressedTools.mockReturnValue(["tool-b"]);
    const instance = createInstanceWithMockMcp("my-server", {
      listTools: jest.fn().mockResolvedValue({ tools }),
    });

    const plugins = await instance.convertServerToolsToPlugins("my-server");

    expect(plugins).toHaveLength(2);
    expect(plugins.map((p) => p.toolName)).toEqual([
      "my-server:tool-a",
      "my-server:tool-c",
    ]);
  });

  it("returns null when all tools are suppressed", async () => {
    const tools = [
      { name: "tool-a", description: "A", inputSchema: {} },
    ];
    mockGetSuppressedTools.mockReturnValue(["tool-a"]);
    const instance = createInstanceWithMockMcp("my-server", {
      listTools: jest.fn().mockResolvedValue({ tools }),
    });

    const result = await instance.convertServerToolsToPlugins("my-server");
    expect(result).toBeNull();
  });

  it("plugin setup registers a function that calls the MCP server's callTool", async () => {
    const mockCallTool = jest.fn().mockResolvedValue({ content: "result" });
    const tools = [
      { name: "exec", description: "Execute", inputSchema: { type: "object", properties: {} } },
    ];
    const instance = createInstanceWithMockMcp("my-server", {
      listTools: jest.fn().mockResolvedValue({ tools }),
      callTool: mockCallTool,
    });

    const plugins = await instance.convertServerToolsToPlugins("my-server");

    // The plugin is {name, description, plugin: fn()} — plugin() returns {name, setup}
    const pluginObj = plugins[0].plugin();
    expect(pluginObj).toHaveProperty("name", "my-server-exec");
    expect(typeof pluginObj.setup).toBe("function");

    const mockAibitat = {
      function: jest.fn(),
      handlerProps: { log: jest.fn() },
      introspect: jest.fn(),
    };
    pluginObj.setup(mockAibitat);

    expect(mockAibitat.function).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "my-server-exec",
        isMCPTool: true,
        handler: expect.any(Function),
      }),
    );

    // Now invoke the registered handler
    const registered = mockAibitat.function.mock.calls[0][0];
    const handlerResult = await registered.handler({ arg: "value" });
    expect(mockCallTool).toHaveBeenCalledWith({
      name: "exec",
      arguments: { arg: "value" },
    });
    expect(handlerResult).toContain("mcp_tool_output");
  });
});

describe("MCPCompatibilityLayer — servers", () => {
  it("returns server list with running status and tools for online servers", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcps = {
      "online-server": {
        ping: jest.fn().mockResolvedValue(true),
        listTools: jest.fn().mockResolvedValue({
          tools: [
            { name: "tool1", description: "T1", inputSchema: {} },
            { name: "handle_mcp_connection_mcp_internal", description: "internal", inputSchema: {} },
          ],
        }),
        transport: { process: { pid: 999 } },
      },
    };
    instance.mcpLoadingResults = {
      "online-server": { status: "success", message: "ok" },
    };
    instance.mcpServerConfigs = [
      { name: "online-server", server: { command: "npx" } },
    ];

    const servers = await instance.servers();

    expect(servers).toHaveLength(1);
    expect(servers[0].name).toBe("online-server");
    expect(servers[0].running).toBe(true);
    // internal tool filtered out
    expect(servers[0].tools).toHaveLength(1);
    expect(servers[0].tools[0].name).toBe("tool1");
    expect(servers[0].process.pid).toBe(999);
    expect(servers[0].error).toBeNull();
  });

  it("returns failed server info from mcpLoadingResults", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcps = {};
    instance.mcpLoadingResults = {
      "failed-server": { status: "failed", message: "spawn error" },
    };
    instance.mcpServerConfigs = [
      { name: "failed-server", server: { command: "docker" } },
    ];

    const servers = await instance.servers();

    expect(servers).toHaveLength(1);
    expect(servers[0].name).toBe("failed-server");
    expect(servers[0].running).toBe(false);
    expect(servers[0].tools).toEqual([]);
    expect(servers[0].error).toBe("spawn error");
  });

  it("removes servers from mcps and mcpLoadingResults when mcp client is missing", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcps = {}; // no mcp client for "ghost-server"
    instance.mcpLoadingResults = {
      "ghost-server": { status: "success", message: "ok" },
    };
    instance.mcpServerConfigs = [];

    const servers = await instance.servers();

    expect(servers).toEqual([]);
    expect(instance.mcpLoadingResults["ghost-server"]).toBeUndefined();
    expect(instance.mcps["ghost-server"]).toBeUndefined();
  });

  it("returns empty tools for offline servers (ping fails)", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcps = {
      "offline-server": {
        ping: jest.fn().mockResolvedValue(false),
        listTools: jest.fn(),
        transport: {},
      },
    };
    instance.mcpLoadingResults = {
      "offline-server": { status: "success", message: "ok" },
    };
    instance.mcpServerConfigs = [
      { name: "offline-server", server: {} },
    ];

    const servers = await instance.servers();

    expect(servers[0].running).toBe(false);
    expect(servers[0].tools).toEqual([]);
    expect(instance.mcps["offline-server"].listTools).not.toHaveBeenCalled();
  });
});

describe("MCPCompatibilityLayer — toggleServerStatus", () => {
  it("returns error when server is not found in config", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcpServerConfigs = [];

    const result = await instance.toggleServerStatus("unknown");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in config file");
  });

  it("stops a running server via pruneMCPServer", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcpServerConfigs = [{ name: "my-server", server: {} }];
    instance.mcps = {
      "my-server": { ping: jest.fn().mockResolvedValue(true) },
    };

    const result = await instance.toggleServerStatus("my-server");
    expect(mockPruneMCPServer).toHaveBeenCalledWith("my-server");
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it("starts a stopped server via startMCPServer", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcpServerConfigs = [{ name: "my-server", server: {} }];
    instance.mcps = {}; // not running
    mockStartMCPServer.mockResolvedValue({ success: true, error: null });

    const result = await instance.toggleServerStatus("my-server");
    expect(mockStartMCPServer).toHaveBeenCalledWith("my-server");
    expect(result.success).toBe(true);
  });

  it("returns failure when pruneMCPServer returns false", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcpServerConfigs = [{ name: "my-server", server: {} }];
    instance.mcps = {
      "my-server": { ping: jest.fn().mockResolvedValue(true) },
    };
    mockPruneMCPServer.mockReturnValue(false);

    const result = await instance.toggleServerStatus("my-server");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to kill");
  });
});

describe("MCPCompatibilityLayer — deleteServer", () => {
  it("returns error when server is not found in config", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcpServerConfigs = [];

    const result = await instance.deleteServer("unknown");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in config file");
  });

  it("prunes running server and removes from config", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcpServerConfigs = [{ name: "my-server", server: {} }];
    instance.mcps = {
      "my-server": { ping: jest.fn().mockResolvedValue(true) },
    };
    instance.mcpLoadingResults = { "my-server": { status: "success" } };

    const result = await instance.deleteServer("my-server");

    expect(mockPruneMCPServer).toHaveBeenCalledWith("my-server");
    expect(mockRemoveMCPServerFromConfig).toHaveBeenCalledWith("my-server");
    expect(instance.mcps["my-server"]).toBeUndefined();
    expect(instance.mcpLoadingResults["my-server"]).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });

  it("removes from config even when server is not running", async () => {
    const instance = new MCPCompatibilityLayer();
    instance.mcpServerConfigs = [{ name: "my-server", server: {} }];
    instance.mcps = {}; // not running

    const result = await instance.deleteServer("my-server");

    expect(mockPruneMCPServer).not.toHaveBeenCalled();
    expect(mockRemoveMCPServerFromConfig).toHaveBeenCalledWith("my-server");
    expect(result.success).toBe(true);
  });
});

describe("MCPCompatibilityLayer — returnMCPResult (static)", () => {
  it("returns string representation for non-object values", () => {
    expect(MCPCompatibilityLayer.returnMCPResult(42)).toBe("42");
    expect(MCPCompatibilityLayer.returnMCPResult("hello")).toBe("hello");
    expect(MCPCompatibilityLayer.returnMCPResult(true)).toBe("true");
  });

  it("returns 'null' for null input", () => {
    expect(MCPCompatibilityLayer.returnMCPResult(null)).toBe("null");
  });

  it("serializes plain objects to JSON", () => {
    const result = MCPCompatibilityLayer.returnMCPResult({ a: 1, b: "test" });
    expect(JSON.parse(result)).toEqual({ a: 1, b: "test" });
  });

  it("serializes bigint values as strings", () => {
    const obj = { count: BigInt(123456) };
    const result = MCPCompatibilityLayer.returnMCPResult(obj);
    expect(JSON.parse(result)).toEqual({ count: "123456" });
  });

  it("handles circular references by replacing with [Circular]", () => {
    const obj = { a: 1 };
    obj.self = obj;
    const result = MCPCompatibilityLayer.returnMCPResult(obj);
    const parsed = JSON.parse(result);
    expect(parsed.a).toBe(1);
    expect(parsed.self).toBe("[Circular]");
  });
});

describe("MCPCompatibilityLayer — toggleToolSuppression", () => {
  it("delegates to updateSuppressedTools with correct args", async () => {
    const instance = new MCPCompatibilityLayer();
    mockUpdateSuppressedTools.mockReturnValue({
      success: true,
      error: null,
      suppressedTools: ["tool-b"],
    });

    const result = await instance.toggleToolSuppression("my-server", "tool-b", false);

    expect(mockUpdateSuppressedTools).toHaveBeenCalledWith("my-server", "tool-b", false);
    expect(result.success).toBe(true);
    expect(result.suppressedTools).toEqual(["tool-b"]);
  });

  it("passes through error from updateSuppressedTools", async () => {
    const instance = new MCPCompatibilityLayer();
    mockUpdateSuppressedTools.mockReturnValue({
      success: false,
      error: "Server not found",
      suppressedTools: [],
    });

    const result = await instance.toggleToolSuppression("unknown", "tool-a", true);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Server not found");
  });
});
