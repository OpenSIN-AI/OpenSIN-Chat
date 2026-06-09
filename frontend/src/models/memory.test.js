// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Memory from "./memory";

vi.mock("@/utils/constants", () => ({ API_BASE: "/api" }));
vi.mock("@/utils/request", () => ({
  baseHeaders: () => ({ "Content-Type": "application/json" }),
}));

describe("Memory", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("forWorkspace", () => {
    it("sends GET to /api/workspaces/:slug/memories and returns memories", async () => {
      const memories = {
        global: [{ id: 1, scope: "global", content: "g1" }],
        workspace: [{ id: 2, scope: "workspace", content: "w1" }],
      };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ memories }),
      });

      const result = await Memory.forWorkspace("my-workspace");
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/workspaces/my-workspace/memories", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(memories);
    });

    it("returns empty arrays when response has no memories field", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await Memory.forWorkspace("ws");
      expect(result).toEqual({ global: [], workspace: [] });
    });

    it("returns empty arrays on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fail"));

      const result = await Memory.forWorkspace("ws");
      expect(result).toEqual({ global: [], workspace: [] });
    });
  });

  describe("create", () => {
    it("sends POST with content and scope to /api/workspaces/:slug/memories", async () => {
      const mem = { id: 3, content: "new", scope: "workspace" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ memory: mem }),
      });

      const result = await Memory.create("ws", { content: "new", scope: "workspace" });
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/workspaces/ws/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "new", scope: "workspace" }),
      });
      expect(result).toEqual({ memory: mem });
    });

    it("defaults scope to workspace when not provided", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ memory: { id: 4 } }),
      });

      await Memory.create("ws", { content: "test" });
      const call = globalThis.fetch.mock.calls[0];
      expect(JSON.parse(call[1].body)).toEqual({ content: "test", scope: "workspace" });
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("oops"));

      const result = await Memory.create("ws", { content: "x" });
      expect(result).toEqual({ memory: null, error: "oops" });
    });
  });

  describe("update", () => {
    it("sends PUT with content to /api/memories/:id", async () => {
      const mem = { id: 5, content: "updated" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ memory: mem }),
      });

      const result = await Memory.update(5, { content: "updated" });
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/memories/5", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "updated" }),
      });
      expect(result).toEqual({ memory: mem });
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("err"));

      const result = await Memory.update(5, { content: "x" });
      expect(result).toEqual({ memory: null, error: "err" });
    });
  });

  describe("delete", () => {
    it("sends DELETE to /api/memories/:id", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await Memory.delete(6);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/memories/6", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual({ success: true });
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("gone"));

      const result = await Memory.delete(6);
      expect(result).toEqual({ success: false, error: "gone" });
    });
  });

  describe("promoteToGlobal", () => {
    it("sends POST to /api/memories/:id/promote", async () => {
      const mem = { id: 7, scope: "global" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ memory: mem }),
      });

      const result = await Memory.promoteToGlobal(7);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/memories/7/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual({ memory: mem });
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("nope"));

      const result = await Memory.promoteToGlobal(7);
      expect(result).toEqual({ memory: null, error: "nope" });
    });
  });

  describe("demoteToWorkspace", () => {
    it("sends POST to /api/memories/:id/demote/:slug", async () => {
      const mem = { id: 8, scope: "workspace" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ memory: mem }),
      });

      const result = await Memory.demoteToWorkspace(8, "my-ws");
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/memories/8/demote/my-ws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual({ memory: mem });
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fail"));

      const result = await Memory.demoteToWorkspace(8, "ws");
      expect(result).toEqual({ memory: null, error: "fail" });
    });
  });
});
