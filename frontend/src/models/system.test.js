// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import System from "@/models/system";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("System", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe("cacheKeys", () => {
    it("contains expected cache key strings", () => {
      expect(System.cacheKeys).toHaveProperty(
        "footerIcons",
        "openafd_footer_links",
      );
      expect(System.cacheKeys).toHaveProperty(
        "supportEmail",
        "openafd_support_email",
      );
      expect(System.cacheKeys).toHaveProperty(
        "customAppName",
        "openafd_custom_app_name",
      );
      expect(System.cacheKeys).toHaveProperty(
        "canViewChatHistory",
        "openafd_can_view_chat_history",
      );
      expect(System.cacheKeys).toHaveProperty(
        "deploymentVersion",
        "openafd_deployment_version",
      );
    });
  });

  describe("ping", () => {
    it("returns true when API responds { online: true }", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ online: true }));
      const result = await System.ping();
      expect(result).toBe(true);
    });

    it("returns false when API responds { online: false }", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ online: false }));
      const result = await System.ping();
      expect(result).toBe(false);
    });

    it("returns false on network error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const result = await System.ping();
      expect(result).toBe(false);
    });
  });

  describe("totalIndexes", () => {
    it("returns vectorCount on success", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(jsonResponse({ vectorCount: 42 }));
      const result = await System.totalIndexes("my-workspace");
      expect(result).toBe(42);
    });

    it("returns 0 when response is not ok", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 500 }));
      const result = await System.totalIndexes();
      expect(result).toBe(0);
    });

    it("returns 0 on network error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const result = await System.totalIndexes();
      expect(result).toBe(0);
    });
  });

  describe("isOnboardingComplete", () => {
    it("is permanently disabled for this instance", async () => {
      const result = await System.isOnboardingComplete();
      expect(result).toBe(true);
    });
  });

  describe("keys", () => {
    it("returns results on success", async () => {
      const data = { results: { LLMProvider: "openai" } };
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(data));
      const result = await System.keys();
      expect(result).toEqual(data.results);
    });

    it("returns null when response is not ok", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 500 }));
      const result = await System.keys();
      expect(result).toBeNull();
    });

    it("returns null on network error", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const result = await System.keys();
      expect(result).toBeNull();
    });
  });
});
