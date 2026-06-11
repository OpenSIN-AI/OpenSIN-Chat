// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import BrowserExtensionApiKey from "./browserExtensionApiKey";

vi.mock("@/utils/constants", () => ({ API_BASE: "/api" }));
vi.mock("@/utils/request", () => ({
  baseHeaders: () => ({ "Content-Type": "application/json" }),
}));

describe("BrowserExtensionApiKey", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAll", () => {
    it("sends GET request to /api/browser-extension/api-keys and returns parsed JSON", async () => {
      const data = { success: true, apiKeys: [{ id: 1, key: "abc" }] };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await BrowserExtensionApiKey.getAll();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/browser-extension/api-keys",
        { method: "GET", headers: { "Content-Type": "application/json" } },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback object on fetch error", async () => {
      const error = new Error("Network failure");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(error);
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await BrowserExtensionApiKey.getAll();
      expect(result).toEqual({
        success: false,
        error: "Network failure",
        apiKeys: [],
      });
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });
  });

  describe("generateKey", () => {
    it("sends POST request to /api/browser-extension/api-keys/new", async () => {
      const data = { success: true, apiKey: { id: 2, key: "xyz" } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await BrowserExtensionApiKey.generateKey();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/browser-extension/api-keys/new",
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      const error = new Error("Server error");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(error);
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await BrowserExtensionApiKey.generateKey();
      expect(result).toEqual({ success: false, error: "Server error" });
    });
  });

  describe("revoke", () => {
    it("sends DELETE request to /api/browser-extension/api-keys/:id", async () => {
      const data = { success: true };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await BrowserExtensionApiKey.revoke(42);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/browser-extension/api-keys/42",
        { method: "DELETE", headers: { "Content-Type": "application/json" } },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      const error = new Error("Forbidden");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(error);
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await BrowserExtensionApiKey.revoke(42);
      expect(result).toEqual({ success: false, error: "Forbidden" });
    });
  });
});
