// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("AgentFlows model", () => {
  let originalFetch;
  let originalEnv;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalEnv = { ...import.meta.env };
    vi.stubEnv("VITE_API_BASE", "/api");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.assign(import.meta.env, originalEnv);
    vi.clearAllMocks();
    vi.resetModules();
  });

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  describe("saveFlow", () => {
    it("saves new flow without uuid", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({
        success: true,
        flow: { name: "Test Flow", config: { steps: [] }, uuid: "new-uuid" }
      }));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.saveFlow("Test Flow", { steps: [] });
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/agent-flows/save",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Test Flow", config: { steps: [] }, uuid: null }),
        })
      );
    });

    it("saves flow with uuid for update", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({
        success: true,
        flow: { name: "Updated Flow", config: { steps: [] }, uuid: "existing-uuid" }
      }));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.saveFlow("Updated Flow", { steps: [] }, "existing-uuid");
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/agent-flows/save",
        expect.objectContaining({
          body: JSON.stringify({ name: "Updated Flow", config: { steps: [] }, uuid: "existing-uuid" }),
        })
      );
    });

    it("returns error on failed save", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: "Validation failed" }, 400));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.saveFlow("Test", {});
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to save flow");
    });

    it("returns error on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.saveFlow("Test", {});
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("listFlows", () => {
    it("returns list of flows on success", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({
        success: true,
        flows: [
          { name: "Flow 1", uuid: "1", description: "Desc 1", steps: [] },
          { name: "Flow 2", uuid: "2", description: "Desc 2", steps: [] },
        ]
      }));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.listFlows();
      expect(result.success).toBe(true);
      expect(result.flows).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledWith("/api/agent-flows/list", expect.any(Object));
    });

    it("returns empty array on error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.listFlows();
      expect(result.success).toBe(false);
      expect(result.flows).toEqual([]);
    });
  });

  describe("getFlow", () => {
    it("returns flow by uuid", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({
        success: true,
        flow: { name: "Test Flow", config: { steps: [] }, uuid: "test-uuid" }
      }));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.getFlow("test-uuid");
      expect(result.success).toBe(true);
      expect(result.flow.name).toBe("Test Flow");
      expect(global.fetch).toHaveBeenCalledWith("/api/agent-flows/test-uuid", expect.any(Object));
    });

    it("returns error on failed get", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: "Not found" }, 404));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.getFlow("invalid");
      expect(result.success).toBe(false);
      expect(result.flow).toBeNull();
    });

    it("returns error on network failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.getFlow("test-uuid");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("deleteFlow", () => {
    it("deletes flow by uuid", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.deleteFlow("test-uuid");
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith("/api/agent-flows/test-uuid", expect.objectContaining({ method: "DELETE" }));
    });

    it("returns error on failed delete", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ error: "Failed" }, 500));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.deleteFlow("test-uuid");
      expect(result.success).toBe(false);
    });
  });

  describe("toggleFlow", () => {
    it("toggles flow active status", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({
        success: true,
        flow: { name: "Test", active: true }
      }));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.toggleFlow("test-uuid", true);
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/agent-flows/test-uuid/toggle",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ active: true }),
        })
      );
    });

    it("returns error on failed toggle", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const { default: AgentFlows } = await import("./agentFlows");
      const result = await AgentFlows.toggleFlow("test-uuid", true);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });
});
