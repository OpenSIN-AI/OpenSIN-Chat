// SPDX-License-Identifier: MIT
const { TokenManager } = require("../../../utils/helpers/tiktoken");

// Use the real js-tiktoken module — it's installed and works correctly.
// We test against real BPE token counts, not mocked values.

describe("TokenManager", () => {
  beforeEach(() => {
    TokenManager.instance = null;
    TokenManager.currentModel = null;
  });

  describe("constructor", () => {
    test("creates instance for gpt-3.5-turbo", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.model).toBe("gpt-3.5-turbo");
      expect(tm.encoderName).toBe("cl100k_base");
    });

    test("creates instance for gpt-4", () => {
      const tm = new TokenManager("gpt-4");
      expect(tm.model).toBe("gpt-4");
    });

    test("falls back to cl100k_base for unknown model", () => {
      const tm = new TokenManager("unknown-model");
      expect(tm.encoderName).toBe("cl100k_base");
    });

    test("defaults to gpt-3.5-turbo when no model specified", () => {
      const tm = new TokenManager();
      expect(tm.model).toBe("gpt-3.5-turbo");
    });

    test("returns same instance for same model (singleton)", () => {
      const tm1 = new TokenManager("gpt-3.5-turbo");
      const tm2 = new TokenManager("gpt-3.5-turbo");
      expect(tm2).toBe(tm1);
    });

    test("creates new instance when model changes", () => {
      const tm1 = new TokenManager("gpt-3.5-turbo");
      const tm2 = new TokenManager("gpt-4");
      expect(tm2).not.toBe(tm1);
    });
  });

  describe("tokensFromString", () => {
    test("returns token array for a string", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const tokens = tm.tokensFromString("hello");
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
    });

    test("returns empty array for empty string", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.tokensFromString("")).toEqual([]);
    });

    test("returns empty array for default (undefined)", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.tokensFromString()).toEqual([]);
    });

    test("converts non-string input to string", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const tokens = tm.tokensFromString(123);
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
    });

    test("returns empty array on encode error", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      tm.encoder.encode = jest.fn(() => {
        throw new Error("encode failed");
      });
      expect(tm.tokensFromString("test")).toEqual([]);
    });
  });

  describe("bytesFromTokens", () => {
    test("decodes tokens back to bytes", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const tokens = tm.tokensFromString("hello world");
      const result = tm.bytesFromTokens(tokens);
      expect(typeof result).toBe("string");
    });

    test("returns empty string for empty array", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.bytesFromTokens([])).toBe("");
    });

    test("returns empty string for default (undefined)", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.bytesFromTokens()).toBe("");
    });
  });

  describe("countFromString", () => {
    test("counts tokens in a string", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const count = tm.countFromString("hello world");
      expect(count).toBeGreaterThan(0);
    });

    test("returns 0 for empty string", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.countFromString("")).toBe(0);
    });

    test("returns 0 for default (undefined)", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.countFromString()).toBe(0);
    });

    test("longer text has more tokens than shorter text", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const short = tm.countFromString("hi");
      const long = tm.countFromString("This is a much longer sentence with many words.");
      expect(long).toBeGreaterThan(short);
    });
  });

  describe("statsFrom", () => {
    test("counts tokens for a string input", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const count = tm.statsFrom("hello world");
      expect(count).toBeGreaterThan(0);
    });

    test("estimates tokens for array of message objects", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const messages = [{ content: "hello" }, { content: "world" }];
      const count = tm.statsFrom(messages);
      // Should be: 2 * 3 + tokens(hello) + tokens(world) + 5
      expect(count).toBeGreaterThan(2 * 3 + 5);
    });

    test("handles messages with null/undefined content", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const messages = [{ content: null }, { content: "hi" }, {}];
      const count = tm.statsFrom(messages);
      // 3 * 3 + 0 + tokens(hi) + 0 + 5
      expect(count).toBeGreaterThan(3 * 3 + 5);
    });

    test("handles empty array", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.statsFrom([])).toBe(0 * 3 + 0 + 5);
    });

    test("throws for unsupported input type", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(() => tm.statsFrom(42)).toThrow("Not a supported");
    });

    test("throws for null input", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(() => tm.statsFrom(null)).toThrow("Not a supported");
    });

    test("throws for object input", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(() => tm.statsFrom({})).toThrow("Not a supported");
    });

    test("array input has more tokens than string input for same text", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const strCount = tm.statsFrom("hello world");
      const arrCount = tm.statsFrom([{ content: "hello world" }]);
      // Array adds per-message factor (1 * 3) + 5
      expect(arrCount).toBeGreaterThan(strCount);
    });
  });
});
