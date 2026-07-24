// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import MCPServers from "./mcpServers";

vi.mock("@/utils/constants", () => ({ API_BASE: "/api" }));
vi.mock("@/utils/request", () => ({
  baseHeaders: () => ({ "Content-Type": "application/json" }),
}));

describe("MCPServers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("forceReload", () => {
    it("sends GET to /api/mcp-servers/force-reload", async () => {
      const data = { success: true, servers: [{ name: "s1", running: true }] };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await MCPServers.forceReload();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/mcp-servers/force-reload",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      const err = new Error("reload fail");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(err);

      const result = await MCPServers.forceReload();
      expect(result).toEqual({
        servers: [],
        success: false,
        error: "reload fail",
      });
    });
  });

  describe("listServers", () => {
    it("sends GET to /api/mcp-servers/list", async () => {
      const data = { success: true, servers: [{ name: "s1" }] };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await MCPServers.listServers();
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/mcp-servers/list", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("list fail"));

      const result = await MCPServers.listServers();
      expect(result).toEqual({
        success: false,
        error: "list fail",
        servers: [],
      });
    });
  });

  describe("toggleServer", () => {
    it("sends POST with name in body", async () => {
      const data = { success: true };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await MCPServers.toggleServer("my-server");
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/mcp-servers/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "my-server" }),
      });
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("toggle fail"));

      const result = await MCPServers.toggleServer("my-server");
      expect(result).toEqual({ success: false, error: "toggle fail" });
    });
  });

  describe("deleteServer", () => {
    it("sends POST with name in body", async () => {
      const data = { success: true };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await MCPServers.deleteServer("old-server");
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/mcp-servers/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "old-server" }),
      });
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("delete fail"));

      const result = await MCPServers.deleteServer("old-server");
      expect(result).toEqual({ success: false, error: "delete fail" });
    });
  });

  describe("toggleTool", () => {
    it("sends POST with serverName, toolName, enabled in body", async () => {
      const data = { success: true, suppressedTools: [] };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await MCPServers.toggleTool("s1", "tool-a", true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/mcp-servers/toggle-tool",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serverName: "s1",
            toolName: "tool-a",
            enabled: true,
          }),
        },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("tool fail"));

      const result = await MCPServers.toggleTool("s1", "tool-a", false);
      expect(result).toEqual({
        success: false,
        error: "tool fail",
        suppressedTools: [],
      });
    });
  });
});
