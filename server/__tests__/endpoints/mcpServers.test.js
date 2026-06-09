// SPDX-License-Identifier: MIT
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  isSingleUserMode: (_req, _res, next) => next(),
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { all: "<all>", admin: "admin", manager: "manager", default: "default" },
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("../../utils/http", () => ({
  reqBody: (req) => req.body,
}));

const mockReload = jest.fn();
const mockServers = jest.fn();
const mockToggleStatus = jest.fn();
const mockDeleteServer = jest.fn();
const mockToggleTool = jest.fn();

jest.mock("../../utils/MCP", () => {
  function MCPCompatibilityLayer() {
    return {
      reloadMCPServers: (...a) => mockReload(...a),
      servers: (...a) => mockServers(...a),
      toggleServerStatus: (...a) => mockToggleStatus(...a),
      deleteServer: (...a) => mockDeleteServer(...a),
      toggleToolSuppression: (...a) => mockToggleTool(...a),
    };
  }
  return MCPCompatibilityLayer;
});

const { createMockApp } = require("../helpers/mockExpressApp");
const { mcpServersEndpoints } = require("../../endpoints/mcpServers");

function buildApp() {
  const harness = createMockApp();
  mcpServersEndpoints(harness.app);
  return harness;
}

describe("MCP Servers endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("GET /mcp-servers/force-reload", () => {
    it("reloads and returns server list", async () => {
      mockReload.mockResolvedValue(undefined);
      mockServers.mockResolvedValue([{ name: "srv1" }]);
      const { call } = buildApp();
      const res = await call("get", "/mcp-servers/force-reload");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.servers).toEqual([{ name: "srv1" }]);
    });

    it("returns 500 on reload error", async () => {
      mockReload.mockRejectedValue(new Error("reload fail"));
      const { call } = buildApp();
      const res = await call("get", "/mcp-servers/force-reload");
      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("reload fail");
    });
  });

  describe("GET /mcp-servers/list", () => {
    it("returns the server list", async () => {
      mockServers.mockResolvedValue([{ name: "a" }, { name: "b" }]);
      const { call } = buildApp();
      const res = await call("get", "/mcp-servers/list");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.servers).toHaveLength(2);
    });

    it("returns 500 on error", async () => {
      mockServers.mockRejectedValue(new Error("list fail"));
      const { call } = buildApp();
      const res = await call("get", "/mcp-servers/list");
      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /mcp-servers/toggle", () => {
    it("toggles server status successfully", async () => {
      mockToggleStatus.mockResolvedValue({ success: true, error: null });
      const { call } = buildApp();
      const res = await call("post", "/mcp-servers/toggle", {
        body: { name: "my-server" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockToggleStatus).toHaveBeenCalledWith("my-server");
    });

    it("returns toggle failure from model", async () => {
      mockToggleStatus.mockResolvedValue({ success: false, error: "not found" });
      const { call } = buildApp();
      const res = await call("post", "/mcp-servers/toggle", {
        body: { name: "missing" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("not found");
    });

    it("returns 500 on exception", async () => {
      mockToggleStatus.mockRejectedValue(new Error("toggle fail"));
      const { call } = buildApp();
      const res = await call("post", "/mcp-servers/toggle", {
        body: { name: "my-server" },
      });
      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /mcp-servers/delete", () => {
    it("deletes a server successfully", async () => {
      mockDeleteServer.mockResolvedValue({ success: true, error: null });
      const { call } = buildApp();
      const res = await call("post", "/mcp-servers/delete", {
        body: { name: "old-server" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDeleteServer).toHaveBeenCalledWith("old-server");
    });

    it("returns delete failure from model", async () => {
      mockDeleteServer.mockResolvedValue({ success: false, error: "in use" });
      const { call } = buildApp();
      const res = await call("post", "/mcp-servers/delete", {
        body: { name: "in-use" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(false);
    });

    it("returns 500 on exception", async () => {
      mockDeleteServer.mockRejectedValue(new Error("delete fail"));
      const { call } = buildApp();
      const res = await call("post", "/mcp-servers/delete", {
        body: { name: "my-server" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /mcp-servers/toggle-tool", () => {
    it("toggles tool suppression successfully", async () => {
      mockToggleTool.mockResolvedValue({
        success: true,
        error: null,
        suppressedTools: ["tool1"],
      });
      const { call } = buildApp();
      const res = await call("post", "/mcp-servers/toggle-tool", {
        body: { serverName: "srv", toolName: "tool1", enabled: false },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.suppressedTools).toEqual(["tool1"]);
      expect(mockToggleTool).toHaveBeenCalledWith("srv", "tool1", false);
    });

    it("returns 500 on exception", async () => {
      mockToggleTool.mockRejectedValue(new Error("tool fail"));
      const { call } = buildApp();
      const res = await call("post", "/mcp-servers/toggle-tool", {
        body: { serverName: "srv", toolName: "tool1", enabled: true },
      });
      expect(res.statusCode).toBe(500);
      expect(res.body.suppressedTools).toEqual([]);
    });
  });
});
