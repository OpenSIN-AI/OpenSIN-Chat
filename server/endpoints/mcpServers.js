// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const crypto = require("node:crypto");
const { reqBody } = require("../utils/http");
const MCPCompatibilityLayer = require("../utils/MCP");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { validatedRequest } = require("../utils/middleware/validatedRequest");

function mcpServersEndpoints(app) {
  if (!app) return;

  app.get(
    "/mcp-servers/force-reload",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (_request, response) => {
      try {
        const mcp = new MCPCompatibilityLayer();
        await mcp.reloadMCPServers();
        return response.status(200).json({
          success: true,
          error: null,
          servers: await mcp.servers(),
        });
      } catch (error) {
        const id = crypto.randomUUID();
        // eslint-disable-next-line no-console
        consoleLogger.error(`[mcpServers force-reload error id=${id}]`, error);
        return response.status(500).json({
          success: false,
          error: "Internal error",
          id,
          servers: [],
        });
      }
    },
  );

  app.get(
    "/mcp-servers/list",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (_request, response) => {
      try {
        const servers = await new MCPCompatibilityLayer().servers();
        return response.status(200).json({
          success: true,
          servers,
        });
      } catch (error) {
        const id = crypto.randomUUID();
        // eslint-disable-next-line no-console
        consoleLogger.error(`[mcpServers list error id=${id}]`, error);
        return response.status(500).json({
          success: false,
          error: "Internal error",
          id,
        });
      }
    },
  );

  app.post(
    "/mcp-servers/toggle",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { name } = reqBody(request);
        if (!name || typeof name !== "string") {
          return response
            .status(400)
            .json({ success: false, error: "Server name is required." });
        }
        const result = await new MCPCompatibilityLayer().toggleServerStatus(
          name,
        );
        return response.status(200).json({
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        const id = crypto.randomUUID();
        // eslint-disable-next-line no-console
        consoleLogger.error(`[mcpServers toggle error id=${id}]`, error);
        return response.status(500).json({
          success: false,
          error: "Internal error",
          id,
        });
      }
    },
  );

  app.post(
    "/mcp-servers/delete",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { name } = reqBody(request);
        if (!name || typeof name !== "string") {
          return response
            .status(400)
            .json({ success: false, error: "Server name is required." });
        }
        const result = await new MCPCompatibilityLayer().deleteServer(name);
        return response.status(200).json({
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        const id = crypto.randomUUID();
        // eslint-disable-next-line no-console
        consoleLogger.error(`[mcpServers delete error id=${id}]`, error);
        return response.status(500).json({
          success: false,
          error: "Internal error",
          id,
        });
      }
    },
  );

  app.post(
    "/mcp-servers/toggle-tool",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { serverName, toolName, enabled } = reqBody(request);
        if (!serverName || typeof serverName !== "string") {
          return response
            .status(400)
            .json({ success: false, error: "Server name is required." });
        }
        if (!toolName || typeof toolName !== "string") {
          return response
            .status(400)
            .json({ success: false, error: "Tool name is required." });
        }
        const result = await new MCPCompatibilityLayer().toggleToolSuppression(
          serverName,
          toolName,
          Boolean(enabled),
        );
        return response.status(200).json({
          success: result.success,
          error: result.error,
          suppressedTools: result.suppressedTools,
        });
      } catch (error) {
        const id = crypto.randomUUID();
        // eslint-disable-next-line no-console
        consoleLogger.error(`[mcpServers toggle-tool error id=${id}]`, error);
        return response.status(500).json({
          success: false,
          error: "Internal error",
          id,
          suppressedTools: [],
        });
      }
    },
  );
}

module.exports = { mcpServersEndpoints };
