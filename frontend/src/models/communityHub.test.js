// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CommunityHub from "./communityHub";

vi.mock("@/utils/constants", () => ({ API_BASE: "/api" }));
vi.mock("@/utils/request", () => ({
  baseHeaders: () => ({ "Content-Type": "application/json" }),
}));

describe("CommunityHub", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetchOk(data, ok = true, statusText = "OK") {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok,
      statusText,
      json: () => Promise.resolve(data),
    });
  }

  function mockFetchError(message) {
    const err = new Error(message);
    vi.spyOn(globalThis, "fetch").mockRejectedValue(err);
    vi.spyOn(console, "error").mockImplementation(() => {});
    return err;
  }

  describe("getItemFromImportId", () => {
    it("sends POST with importId in body and returns response", async () => {
      const resp = { item: { id: "imp-1" }, error: null };
      mockFetchOk(resp);

      const result = await CommunityHub.getItemFromImportId("imp-1");
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/community-hub/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: "imp-1" }),
      });
      expect(result).toEqual(resp);
    });

    it("returns error fallback on fetch rejection", async () => {
      mockFetchError("timeout");
      const result = await CommunityHub.getItemFromImportId("imp-1");
      expect(result).toEqual({ error: "timeout", item: null });
    });
  });

  describe("applyItem", () => {
    it("sends POST with importId and options", async () => {
      const resp = { success: true, error: null };
      mockFetchOk(resp);

      const result = await CommunityHub.applyItem("imp-2", { autoApply: true });
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/community-hub/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: "imp-2", options: { autoApply: true } }),
      });
      expect(result).toEqual(resp);
    });

    it("returns error fallback when fetch throws", async () => {
      mockFetchError("apply failed");
      const result = await CommunityHub.applyItem("imp-2");
      expect(result).toEqual({ success: false, error: "apply failed" });
    });

    it("passes empty options object by default", async () => {
      mockFetchOk({ success: true });
      await CommunityHub.applyItem("imp-3");
      const call = globalThis.fetch.mock.calls[0];
      expect(JSON.parse(call[1].body)).toEqual({ importId: "imp-3", options: {} });
    });
  });

  describe("importBundleItem", () => {
    it("sends POST and returns response on success", async () => {
      const resp = { item: { id: "b-1" } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(resp),
      });

      const result = await CommunityHub.importBundleItem("b-1");
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/community-hub/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: "b-1" }),
      });
      expect(result).toEqual(resp);
    });

    it("throws on !res.ok and returns error fallback", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: () => Promise.resolve({ error: "invalid bundle" }),
      });

      const result = await CommunityHub.importBundleItem("b-2");
      expect(result).toEqual({ error: "invalid bundle", item: null });
    });

    it("falls back to statusText when response has no error field", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({}),
      });

      const result = await CommunityHub.importBundleItem("b-3");
      expect(result).toEqual({ error: "Internal Server Error", item: null });
    });

    it("returns error fallback on fetch rejection", async () => {
      mockFetchError("network");
      const result = await CommunityHub.importBundleItem("b-4");
      expect(result).toEqual({ error: "network", item: null });
    });
  });

  describe("updateSettings", () => {
    it("sends POST with data and returns success", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ connectionKey: "ck-1" }),
      });

      const result = await CommunityHub.updateSettings({ apiKey: "abc" });
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/community-hub/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "abc" }),
      });
      expect(result).toEqual({ success: true, error: null });
    });

    it("returns error when !res.ok", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "invalid key" }),
      });

      const result = await CommunityHub.updateSettings({ apiKey: "bad" });
      expect(result).toEqual({ success: false, error: "invalid key" });
    });

    it("returns generic error when response has no error field", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const result = await CommunityHub.updateSettings({});
      expect(result).toEqual({ success: false, error: "Failed to update settings" });
    });

    it("returns error on fetch rejection", async () => {
      mockFetchError("fail");
      const result = await CommunityHub.updateSettings({});
      expect(result).toEqual({ success: false, error: "fail" });
    });
  });

  describe("getSettings", () => {
    it("sends GET and returns connectionKey on success", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ connectionKey: "ck-2" }),
      });

      const result = await CommunityHub.getSettings();
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/community-hub/settings", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual({ connectionKey: "ck-2", error: null });
    });

    it("returns error when !res.ok", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "unauthorized" }),
      });

      const result = await CommunityHub.getSettings();
      expect(result).toEqual({ connectionKey: null, error: "unauthorized" });
    });

    it("returns error on fetch rejection", async () => {
      mockFetchError("conn refused");
      const result = await CommunityHub.getSettings();
      expect(result).toEqual({ connectionKey: null, error: "conn refused" });
    });
  });

  describe("fetchExploreItems", () => {
    it("sends GET and returns explore data", async () => {
      const data = { agentSkills: { items: [], hasMore: false, totalCount: 0 } };
      mockFetchOk(data);

      const result = await CommunityHub.fetchExploreItems();
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/community-hub/explore", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(data);
    });

    it("returns error fallback on fetch rejection", async () => {
      mockFetchError("explore fail");
      const result = await CommunityHub.fetchExploreItems();
      expect(result).toEqual({ success: false, error: "explore fail", result: null });
    });
  });

  describe("fetchUserItems", () => {
    it("sends GET and returns user items", async () => {
      const data = { createdByMe: { prompts: [] }, teamItems: [] };
      mockFetchOk(data);

      const result = await CommunityHub.fetchUserItems();
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/community-hub/items", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(data);
    });

    it("returns error fallback on fetch rejection", async () => {
      mockFetchError("items fail");
      const result = await CommunityHub.fetchUserItems();
      expect(result).toEqual({ success: false, error: "items fail", createdByMe: {}, teamItems: [] });
    });
  });

  describe("createSystemPrompt", () => {
    it("sends POST with data and returns success with itemId", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ item: { id: "sp-1" } }),
      });

      const payload = { name: "test", prompt: "hello", visibility: "public" };
      const result = await CommunityHub.createSystemPrompt(payload);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/community-hub/system-prompt/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(result).toEqual({ success: true, error: null, itemId: "sp-1" });
    });

    it("returns error when !res.ok", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "duplicate" }),
      });

      const result = await CommunityHub.createSystemPrompt({ name: "dup" });
      expect(result).toEqual({ success: false, error: "duplicate" });
    });

    it("returns error on fetch rejection", async () => {
      mockFetchError("create fail");
      const result = await CommunityHub.createSystemPrompt({});
      expect(result).toEqual({ success: false, error: "create fail" });
    });
  });

  describe("createAgentFlow", () => {
    it("sends POST with data and returns success with itemId", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ item: { id: "af-1" } }),
      });

      const payload = { name: "flow" };
      const result = await CommunityHub.createAgentFlow(payload);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/community-hub/agent-flow/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(result).toEqual({ success: true, error: null, itemId: "af-1" });
    });

    it("throws on !res.ok (no .catch handler in source)", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "bad flow" }),
      });

      await expect(CommunityHub.createAgentFlow({})).rejects.toThrow("bad flow");
    });

    it("throws generic error when response has no error field and !res.ok", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });

      await expect(CommunityHub.createAgentFlow({})).rejects.toThrow("Failed to create agent flow");
    });

    it("throws on fetch rejection (no .catch handler)", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("flow fail"));

      await expect(CommunityHub.createAgentFlow({})).rejects.toThrow("flow fail");
    });
  });

  describe("createSlashCommand", () => {
    it("sends POST with data and returns success with itemId", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ item: { id: "sc-1" } }),
      });

      const payload = { name: "/test", command: "/test", prompt: "do it" };
      const result = await CommunityHub.createSlashCommand(payload);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/community-hub/slash-command/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(result).toEqual({ success: true, error: null, itemId: "sc-1" });
    });

    it("returns error when !res.ok", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "exists" }),
      });

      const result = await CommunityHub.createSlashCommand({});
      expect(result).toEqual({ success: false, error: "exists" });
    });

    it("returns generic error when response has no error field", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      });

      const result = await CommunityHub.createSlashCommand({});
      expect(result).toEqual({ success: false, error: "Failed to create slash command" });
    });

    it("returns error on fetch rejection", async () => {
      mockFetchError("slash fail");
      const result = await CommunityHub.createSlashCommand({});
      expect(result).toEqual({ success: false, error: "slash fail" });
    });
  });
});
