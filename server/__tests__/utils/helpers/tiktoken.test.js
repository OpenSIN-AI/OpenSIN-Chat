// SPDX-License-Identifier: MIT
const { TokenManager } = require("../../../utils/helpers/tiktoken");

// Mock js-tiktoken to avoid loading the real encoder in tests
jest.mock("js-tiktoken", () => {
  const mockEncoder = {
    encode: jest.fn((str) => {
      // Simple mock: return one "token" per character
      return Array.from(str).map((_, i) => i);
    }),
    decode: jest.fn((tokens) => {
      // Mock: reconstruct a string from token count
      return "x".repeat(tokens.length);
    }),
  };
  return {
    getEncodingNameForModel: jest.fn((model) => {
      if (model === "gpt-3.5-turbo") return "cl100k_base";
      if (model === "gpt-4") return "cl100k_base";
      if (model === "gpt-4o") return "o200k_base";
      throw new Error("Unknown model");
    }),
    getEncoding: jest.fn(() => mockEncoder),
  };
});

describe("TokenManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton state
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
      expect(tm.encoderName).toBe("cl100k_base");
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
      expect(tm2.model).toBe("gpt-4");
    });
  });

  describe("tokensFromString", () => {
    test("returns token array for a string", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const tokens = tm.tokensFromString("hello");
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(5); // one per char in mock
    });

    test("returns empty array for empty string", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const tokens = tm.tokensFromString("");
      expect(tokens).toEqual([]);
    });

    test("returns empty array for default (undefined)", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const tokens = tm.tokensFromString();
      expect(tokens).toEqual([]);
    });

    test("converts non-string input to string", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const tokens = tm.tokensFromString(123);
      expect(Array.isArray(tokens)).toBe(true);
    });

    test("returns empty array on encode error", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      tm.encoder.encode = jest.fn(() => {
        throw new Error("encode failed");
      });
      const tokens = tm.tokensFromString("test");
      expect(tokens).toEqual([]);
    });
  });

  describe("bytesFromTokens", () => {
    test("decodes tokens back to bytes", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const result = tm.bytesFromTokens([1, 2, 3]);
      expect(typeof result).toBe("string");
      expect(result.length).toBe(3); // mock returns "x" per token
    });

    test("returns empty string for empty array", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const result = tm.bytesFromTokens([]);
      expect(result).toBe("");
    });

    test("returns empty string for default (undefined)", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const result = tm.bytesFromTokens();
      expect(result).toBe("");
    });
  });

  describe("countFromString", () => {
    test("counts tokens in a string", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.countFromString("hello")).toBe(5);
    });

    test("returns 0 for empty string", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.countFromString("")).toBe(0);
    });

    test("returns 0 for default (undefined)", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.countFromString()).toBe(0);
    });
  });

  describe("statsFrom", () => {
    test("counts tokens for a string input", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(tm.statsFrom("hello")).toBe(5);
    });

    test("estimates tokens for array of message objects", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const messages = [
        { content: "hello" },
        { content: "world" },
      ];
      // 2 messages * 3 per message + 5 + 5 + 5 = 21
      const count = tm.statsFrom(messages);
      expect(count).toBe(2 * 3 + 5 + 5 + 5);
    });

    test("handles messages with null/undefined content", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const messages = [
        { content: null },
        { content: "hi" },
        {},
      ];
      // 3 messages * 3 + 0 + 2 + 0 + 5 = 16
      const count = tm.statsFrom(messages);
      expect(count).toBe(3 * 3 + 0 + 2 + 0 + 5);
    });

    test("handles empty array", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      const count = tm.statsFrom([]);
      expect(count).toBe(0 * 3 + 0 + 5);
    });

    test("throws for unsupported input type", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(() => tm.statsFrom(42)).toThrow("Not a supported tokenized format");
    });

    test("throws for null input", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(() => tm.statsFrom(null)).toThrow("Not a supported");
    });

    test("throws for object input", () => {
      const tm = new TokenManager("gpt-3.5-turbo");
      expect(() => tm.statsFrom({})).toThrow("Not a supported");
    });
  });
});
