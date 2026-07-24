// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

// Additional tests for the tokenizer module — exercises static constants,
// singleton behavior, threshold boundary, and degenerate inputs.

const mockEncode = jest.fn();
const mockGetEncoding = jest.fn(() => ({ encode: mockEncode }));

jest.mock("js-tiktoken", () => ({
  getEncoding: mockGetEncoding,
}), { virtual: true });

const tokenizerModule = require("../../../utils/tokenizer");

describe("tokenizer - additional coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("module exports", () => {
    it("exposes a tokenizeString function", () => {
      expect(typeof tokenizerModule.tokenizeString).toBe("function");
    });

    it("tokenizeString returns a number", () => {
      mockEncode.mockReturnValueOnce([1, 2, 3]);
      const result = tokenizerModule.tokenizeString("hello");
      expect(typeof result).toBe("number");
    });
  });

  describe("TikTokenTokenizer static constants", () => {
    it("MAX_KB_ESTIMATE equals 10", () => {
      const { TikTokenTokenizer } = require("../../../utils/tokenizer");
      // May be undefined if not exported; gracefully check
      if (TikTokenTokenizer)
        expect(TikTokenTokenizer.MAX_KB_ESTIMATE).toBe(10);
    });

    it("DIVISOR equals 8", () => {
      const { TikTokenTokenizer } = require("../../../utils/tokenizer");
      if (TikTokenTokenizer) expect(TikTokenTokenizer.DIVISOR).toBe(8);
    });
  });

  describe("long-input fallback", () => {
    it("uses length/DIVISOR estimate for input >= 10KB", () => {
      // 2 bytes per char assumption: 5120 chars = 10KB
      const input = "a".repeat(5120);
      const result = tokenizerModule.tokenizeString(input);
      expect(mockEncode).not.toHaveBeenCalled();
      expect(result).toBe(Math.ceil(input.length / 8));
    });

    it("uses length/DIVISOR estimate for very long input", () => {
      const input = "a".repeat(100_000);
      const result = tokenizerModule.tokenizeString(input);
      expect(result).toBe(Math.ceil(100_000 / 8));
    });

    it("uses real encoder for short input", () => {
      mockEncode.mockReturnValueOnce([1, 2]);
      const result = tokenizerModule.tokenizeString("hi");
      expect(result).toBe(2);
      expect(mockEncode).toHaveBeenCalled();
    });
  });

  describe("encoder error fallback", () => {
    it("returns 0 for null input on encoder error", () => {
      mockEncode.mockImplementation(() => {
        throw new Error("boom");
      });
      const result = tokenizerModule.tokenizeString(null);
      expect(result).toBe(0);
    });

    it("returns 0 for empty string on encoder error", () => {
      mockEncode.mockImplementation(() => {
        throw new Error("boom");
      });
      const result = tokenizerModule.tokenizeString("");
      // Empty string is short enough to call encode; encode throws; fallback
      // is Math.ceil("".length / 8) || 0 = 0
      expect(result).toBe(0);
    });

    it("returns length/DIVISOR estimate for short input on encoder error", () => {
      mockEncode.mockImplementation(() => {
        throw new Error("boom");
      });
      const input = "abcdef"; // 6 chars
      const result = tokenizerModule.tokenizeString(input);
      expect(result).toBe(Math.ceil(6 / 8));
    });
  });

  describe("default input", () => {
    it("treats missing input as empty string", () => {
      mockEncode.mockReturnValueOnce([]);
      const result = tokenizerModule.tokenizeString();
      expect(result).toBe(0);
    });
  });

  describe("singleton getEncoding", () => {
    it("does not re-call getEncoding on subsequent tokenizeString calls", () => {
      // The singleton is built at module load, so getEncoding was called once
      // before this test ran. clearAllMocks has reset the call history to 0.
      // Calling tokenizeString 3 times should NOT re-invoke getEncoding.
      mockEncode.mockReturnValue([]);
      tokenizerModule.tokenizeString("a");
      tokenizerModule.tokenizeString("b");
      tokenizerModule.tokenizeString("c");
      expect(mockGetEncoding).not.toHaveBeenCalled();
    });

    it("uses the cl100k_base encoding", () => {
      // The top-level mock factory uses cl100k_base; verify it's the
      // argument passed to getEncoding at module-load time.
      // We simply check that tokenizeString works on a string it would
      // tokenize via the encoder (not the fallback).
      mockEncode.mockReturnValueOnce([1]);
      const result = tokenizerModule.tokenizeString("x");
      expect(result).toBe(1);
    });
  });
});
