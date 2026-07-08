// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { safeGetItem, safeSetItem, safeRemoveItem } from "./safeStorage";

describe("safeStorage utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock to default behavior
    window.localStorage.getItem = vi.fn(() => null);
    window.localStorage.setItem = vi.fn();
    window.localStorage.removeItem = vi.fn();
  });

  describe("safeGetItem", () => {
    it("returns the value from localStorage when present", () => {
      window.localStorage.getItem = vi.fn(() => "stored-value");
      expect(safeGetItem("some-key")).toBe("stored-value");
      expect(window.localStorage.getItem).toHaveBeenCalledWith("some-key");
    });

    it("returns null when key does not exist", () => {
      window.localStorage.getItem = vi.fn(() => null);
      expect(safeGetItem("missing-key")).toBeNull();
    });

    it("returns null when localStorage throws", () => {
      window.localStorage.getItem = vi.fn(() => {
        throw new Error("SecurityError");
      });
      expect(safeGetItem("any-key")).toBeNull();
    });

    it("migrates from legacy key when new key is empty", () => {
      // First call returns null (new key), second call returns value (legacy key)
      let callCount = 0;
      window.localStorage.getItem = vi.fn((key) => {
        callCount++;
        if (callCount === 1) return null;
        return "legacy-value";
      });
      const result = safeGetItem("opensin_user");
      expect(result).toBe("legacy-value");
    });
  });

  describe("safeSetItem", () => {
    it("stores a value in localStorage", () => {
      const result = safeSetItem("key", "value");
      expect(result).toBe(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith("key", "value");
    });

    it("returns false when localStorage throws", () => {
      window.localStorage.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });
      const result = safeSetItem("key", "value");
      expect(result).toBe(false);
    });
  });

  describe("safeRemoveItem", () => {
    it("removes a key from localStorage", () => {
      safeRemoveItem("key");
      expect(window.localStorage.removeItem).toHaveBeenCalledWith("key");
    });

    it("does not throw when localStorage throws", () => {
      window.localStorage.removeItem = vi.fn(() => {
        throw new Error("SecurityError");
      });
      expect(() => safeRemoveItem("key")).not.toThrow();
    });
  });
});
