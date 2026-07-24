// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { truncate } from "./strings";

describe("strings utilities", () => {
  describe("truncate", () => {
    it("returns the original string when shorter than the limit", () => {
      expect(truncate("hi", 8)).toBe("hi");
    });

    it("returns the original string when exactly at the limit", () => {
      expect(truncate("12345678", 8)).toBe("12345678");
    });

    it("truncates with ellipsis when longer than the limit", () => {
      expect(truncate("hello world", 8)).toBe("hello w…");
    });

    it("uses default length of 30", () => {
      const long = "a".repeat(35);
      const result = truncate(long);
      expect(result.length).toBeLessThan(long.length);
      expect(result.endsWith("…")).toBe(true);
    });

    it("handles empty string", () => {
      expect(truncate("", 10)).toBe("");
    });

    it("handles default empty string parameter", () => {
      expect(truncate()).toBe("");
    });
  });
});
