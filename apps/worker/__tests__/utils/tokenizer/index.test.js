// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

const mockEncode = jest.fn();

jest.mock("js-tiktoken", () => ({
  getEncoding: jest.fn(() => ({ encode: mockEncode })),
}), { virtual: true });

const { tokenizeString } = require("../../../utils/tokenizer");

describe("TikTokenTokenizer / tokenizeString", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the encoder token count for a short string", () => {
    mockEncode.mockReturnValueOnce([1, 2, 3, 4, 5]);
    expect(tokenizeString("hello world")).toBe(5);
    expect(mockEncode).toHaveBeenCalledWith("hello world");
  });

  it("returns the encoder token count for an empty string", () => {
    mockEncode.mockReturnValueOnce([]);
    expect(tokenizeString("")).toBe(0);
  });

  it("falls back to length / DIVISOR estimate when input is too long", () => {
    const longStr = "a".repeat(1024 * 10);
    const result = tokenizeString(longStr);
    expect(result).toBe(Math.ceil(longStr.length / 8));
    expect(mockEncode).not.toHaveBeenCalled();
  });

  it("falls back to estimate when encoder throws", () => {
    mockEncode.mockImplementation(() => {
      throw new Error("encoding error");
    });
    const result = tokenizeString("short string");
    expect(result).toBe(Math.ceil("short string".length / 8));
  });

  it("returns 0 when encoder throws and input is falsy", () => {
    mockEncode.mockImplementation(() => {
      throw new Error("encoding error");
    });
    const result = tokenizeString(undefined);
    expect(result).toBe(0);
  });

  it("returns token count for a string just under the too-long threshold", () => {
    const justUnder = "a".repeat(Math.floor(1024 * 10 / 2) - 1);
    mockEncode.mockReturnValueOnce([1, 2, 3]);
    expect(tokenizeString(justUnder)).toBe(3);
    expect(mockEncode).toHaveBeenCalledWith(justUnder);
  });
});
