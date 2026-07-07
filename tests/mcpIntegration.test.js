// SPDX-License-Identifier: MIT
// Purpose: Unit tests for MCP integration — connection, tool discovery, error paths (#387)
// Docs: tests/mcpIntegration.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the MCP SDK client to avoid real network/stdio connections.
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    ping: vi.fn(() => Promise.resolve(true)),
    listTools: vi.fn(() =>
      Promise.resolve({
        tools: [
          { name: "search", description: "Search the web", inputSchema: { type: "object", properties: { query: { type: "string" } } } },
          { name: "fetch", description: "Fetch a URL", inputSchema: { type: "object", properties: { url: { type: "string" } } } },
        ],
      }),
    ),
    callTool: vi.fn(() =>
      Promise.resolve({ content: [{ type: "text", text: "result data" }] }),
    ),
    transport: { process: { pid: 12345 } },
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({
    start: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => ({
    start: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn().mockImplementation(() => ({
    start: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
  })),
}));

vi.mock("../server/utils/logger/console.js", () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../server/utils/helpers/shell", () => ({
  patchShellEnvironmentPath: vi.fn((env) => env),
}));

vi.mock("../server/utils/paths", () => ({
  getStoragePath: vi.fn((p) => `/tmp/storage/${p}`),
}));

vi.mock("../server/utils/http", () => ({
  safeJsonParse: vi.fn((str, fallback) => {
    try { return JSON.parse(str); } catch { return fallback; }
  }),
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => '{"mcpServers": {}}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
  },
}));

import { MCPCompatibilityLayer } from "../server/utils/MCP";

describe("MCPCompatibilityLayer", () => {
  let instance;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton between tests
    MCPCompatibilityLayer._instance = null;
    instance = new MCPCompatibilityLayer();
  });

  afterEach(() => {
    MCPCompatibilityLayer._instance = null;
  });

  describe("singleton pattern", () => {
    it("should return the same instance on subsequent construction", () => {
      const a = new MCPCompatibilityLayer();
      const b = new MCPCompatibilityLayer();
      expect(a).toBe(b);
    });
  });

  describe("returnMCPResult", () => {
    it("should serialize a simple object result to JSON string", () => {
      const result = { content: [{ type: "text", text: "hello" }] };
      const serialized = MCPCompatibilityLayer.returnMCPResult(result);
      expect(typeof serialized).toBe("string");
      expect(serialized).toContain("hello");
    });

    it("should handle string results directly", () => {
      const serialized = MCPCompatibilityLayer.returnMCPResult("plain text");
      expect(serialized).toBe("plain text");
    });

    it("should handle circular references without throwing", () => {
      const circular = { a: 1 };
      circular.self = circular;
      const serialized = MCPCompatibilityLayer.returnMCPResult(circular);
      expect(typeof serialized).toBe("string");
      expect(serialized).toContain("[Circular]");
    });

    it("should serialize bigint values as strings", () => {
      const result = { count: BigInt(42) };
      const serialized = MCPCompatibilityLayer.returnMCPResult(result);
      expect(serialized).toContain("42");
    });
  });

  describe("activeMCPServers", () => {
    it("should return empty array when no MCP servers are configured", async () => {
      instance.mcps = {};
      instance.bootMCPServers = vi.fn(() => Promise.resolve());
      const servers = await instance.activeMCPServers();
      expect(servers).toEqual([]);
    });

    it("should return @@mcp_{name} entries for each running server", async () => {
      instance.mcps = { "my-server": {}, "other-server": {} };
      instance.bootMCPServers = vi.fn(() => Promise.resolve());
      const servers = await instance.activeMCPServers();
      expect(servers).toContain("@@mcp_my-server");
      expect(servers).toContain("@@mcp_other-server");
      expect(servers).toHaveLength(2);
    });
  });

  describe("convertServerToolsToPlugins", () => {
    it("should return null when server name is not found in mcps", async () => {
      const result = await instance.convertServerToolsToPlugins("nonexistent");
      expect(result).toBeNull();
    });

    it("should return null when listTools throws", async () => {
      instance.mcps = {
        "broken-server": {
          listTools: vi.fn(() => Promise.reject(new Error("connection refused"))),
        },
      };
      const result = await instance.convertServerToolsToPlugins("broken-server");
      expect(result).toBeNull();
    });

    it("should return null when server has no tools", async () => {
      instance.mcps = {
        "empty-server": {
          listTools: vi.fn(() => Promise.resolve({ tools: [] })),
        },
      };
      const result = await instance.convertServerToolsToPlugins("empty-server");
      expect(result).toBeNull();
    });

    it("should convert tools to plugin configurations", async () => {
      instance.mcps = {
        "test-server": {
          listTools: vi.fn(() =>
            Promise.resolve({
              tools: [
                {
                  name: "search",
                  description: "Search the web",
                  inputSchema: { type: "object", properties: { query: { type: "string" } } },
                },
              ],
            }),
          ),
        },
      };
      instance.getSuppressedTools = vi.fn(() => []);

      const plugins = await instance.convertServerToolsToPlugins("test-server");
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe("test-server-search");
      expect(plugins[0].description).toBe("Search the web");
      expect(typeof plugins[0].plugin).toBe("function");
      expect(plugins[0].toolName).toBe("test-server:search");
    });

    it("should filter out suppressed tools", async () => {
      instance.mcps = {
        "test-server": {
          listTools: vi.fn(() =>
            Promise.resolve({
              tools: [
                { name: "search", description: "Search", inputSchema: { type: "object", properties: {} } },
                { name: "hidden", description: "Hidden", inputSchema: { type: "object", properties: {} } },
              ],
            }),
          ),
        },
      };
      instance.getSuppressedTools = vi.fn(() => ["hidden"]);

      const plugins = await instance.convertServerToolsToPlugins("test-server");
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe("test-server-search");
    });

    it("should return null when all tools are suppressed", async () => {
      instance.mcps = {
        "test-server": {
          listTools: vi.fn(() =>
            Promise.resolve({
              tools: [
                { name: "search", description: "Search", inputSchema: { type: "object", properties: {} } },
              ],
            }),
          ),
        },
      };
      instance.getSuppressedTools = vi.fn(() => ["search"]);

      const plugins = await instance.convertServerToolsToPlugins("test-server");
      expect(plugins).toBeNull();
    });

    it("should reject tools with empty inputSchema", async () => {
      instance.mcps = {
        "test-server": {
          listTools: vi.fn(() =>
            Promise.resolve({
              tools: [
                { name: "good", description: "Good", inputSchema: { type: "object", properties: { q: { type: "string" } } } },
                { name: "bad", description: "Bad", inputSchema: {} },
                { name: "worse", description: "Worse", inputSchema: null },
              ],
            }),
          ),
        },
      };
      instance.getSuppressedTools = vi.fn(() => []);

      const plugins = await instance.convertServerToolsToPlugins("test-server");
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe("test-server-good");
    });
  });

  describe("toggleServerStatus", () => {
    it("should return error when server is not found in config", async () => {
      instance.mcpServerConfigs = [];
      const result = await instance.toggleServerStatus("unknown");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("deleteServer", () => {
    it("should return error when server is not found in config", async () => {
      instance.mcpServerConfigs = [];
      const result = await instance.deleteServer("unknown");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should delete a configured server and remove it from config", async () => {
      instance.mcpServerConfigs = [{ name: "removable", server: { command: "npx" } }];
      instance.mcps = {};
      instance.removeMCPServerFromConfig = vi.fn();

      const result = await instance.deleteServer("removable");
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(instance.removeMCPServerFromConfig).toHaveBeenCalledWith("removable");
    });
  });

  describe("toggleToolSuppression", () => {
    it("should delegate to updateSuppressedTools", async () => {
      instance.updateSuppressedTools = vi.fn(() =>
        Promise.resolve({ success: true, error: null, suppressedTools: ["tool1"] }),
      );
      const result = await instance.toggleToolSuppression("server", "tool1", false);
      expect(instance.updateSuppressedTools).toHaveBeenCalledWith("server", "tool1", false);
      expect(result.suppressedTools).toContain("tool1");
    });
  });

  describe("servers", () => {
    it("should return empty array when no servers are loaded", async () => {
      instance.mcpLoadingResults = {};
      instance.bootMCPServers = vi.fn(() => Promise.resolve());
      const servers = await instance.servers();
      expect(servers).toEqual([]);
    });

    it("should report failed servers with error message", async () => {
      instance.mcpLoadingResults = {
        "failed-server": { status: "failed", message: "ENOENT: npx not found" },
      };
      instance.mcpServerConfigs = [{ name: "failed-server", server: { command: "npx" } }];
      instance.bootMCPServers = vi.fn(() => Promise.resolve());

      const servers = await instance.servers();
      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe("failed-server");
      expect(servers[0].running).toBe(false);
      expect(servers[0].error).toBe("ENOENT: npx not found");
      expect(servers[0].tools).toEqual([]);
    });
  });
});
