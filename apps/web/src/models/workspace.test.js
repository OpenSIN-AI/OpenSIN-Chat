// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Workspace from "@/models/workspace";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Workspace", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe("static properties", () => {
    it("workspaceOrderStorageKey is a string", () => {
      expect(typeof Workspace.workspaceOrderStorageKey).toBe("string");
      expect(Workspace.workspaceOrderStorageKey).toBe(
        "opensin-workspace-order",
      );
    });

    it("maxContextWindowLimit is 0.8", () => {
      expect(Workspace.maxContextWindowLimit).toBe(0.8);
    });
  });

  describe("new", () => {
    it("sends POST to /workspace/new", async () => {
      const ws = { slug: "test-ws", name: "Test" };
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ workspace: ws, message: "created" }));

      await Workspace.new({ name: "Test" });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/workspace/new"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("returns { workspace, message } on success", async () => {
      const ws = { slug: "test-ws", name: "Test" };
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ workspace: ws, message: "created" }));

      const result = await Workspace.new({ name: "Test" });
      expect(result).toEqual({ workspace: ws, message: "created" });
    });

    it("returns { workspace: null, message } on error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await Workspace.new({ name: "Test" });
      expect(result.workspace).toBeNull();
      expect(result.message).toBe("Network error");
    });
  });

  describe("update", () => {
    it("sends POST to /workspace/{slug}/update", async () => {
      const ws = { slug: "my-ws", name: "Updated" };
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ workspace: ws, message: "updated" }));

      await Workspace.update("my-ws", { name: "Updated" });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/workspace/my-ws/update"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("returns { workspace, message } on success", async () => {
      const ws = { slug: "my-ws", name: "Updated" };
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ workspace: ws, message: "updated" }));

      const result = await Workspace.update("my-ws", { name: "Updated" });
      expect(result).toEqual({ workspace: ws, message: "updated" });
    });

    it("returns { workspace: null, message } on error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await Workspace.update("my-ws", { name: "Updated" });
      expect(result.workspace).toBeNull();
      expect(result.message).toBe("Network error");
    });
  });
});
