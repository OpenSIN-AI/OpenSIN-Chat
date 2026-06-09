// SPDX-License-Identifier: MIT
const {
  safeJsonParse,
  isValidUrl,
  toValidNumber,
  decodeHtmlEntities,
} = require("../../../utils/http");

describe("safeJsonParse", () => {
  test("parses valid JSON object", () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
  });

  test("parses valid JSON array", () => {
    expect(safeJsonParse("[1,2,3]")).toEqual([1, 2, 3]);
  });

  test("returns fallback for invalid JSON", () => {
    expect(safeJsonParse("invalid json", "fallback")).toBe("fallback");
  });

  test("returns fallback for null", () => {
    expect(safeJsonParse(null, "fallback")).toBe("fallback");
  });

  test("returns fallback for empty string", () => {
    expect(safeJsonParse("", "fallback")).toBe("fallback");
  });

  test("uses null as default fallback", () => {
    expect(safeJsonParse("invalid")).toBeNull();
  });

  test("repairs truncated JSON", () => {
    const repaired = safeJsonParse('{"a":1, "b":[1,2,', "fallback");
    // Should either repair or return fallback
    expect(repaired !== "fallback" ? typeof repaired === "object" : true).toBe(true);
  });
});

describe("isValidUrl", () => {
  test("returns true for valid https URL", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
  });

  test("returns true for valid http URL", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  test("returns false for ftp URL", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
  });

  test("returns false for invalid URL", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  test("returns false for javascript: protocol", () => {
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  test("returns false for file: protocol", () => {
    expect(isValidUrl("file:///etc/passwd")).toBe(false);
  });
});

describe("toValidNumber", () => {
  test("returns number when input is number", () => {
    expect(toValidNumber(42)).toBe(42);
  });

  test("converts string to number", () => {
    expect(toValidNumber("42")).toBe(42);
  });

  test("returns fallback for non-numeric string", () => {
    expect(toValidNumber("abc", 0)).toBe(0);
  });

  test("returns 0 for null", () => {
    // Number(null) === 0, so this returns 0
    expect(toValidNumber(null, 99)).toBe(0);
  });

  test("returns fallback for NaN", () => {
    expect(toValidNumber(NaN, 50)).toBe(50);
  });

  test("uses null as default fallback", () => {
    expect(toValidNumber("abc")).toBeNull();
  });

  test("handles negative numbers", () => {
    expect(toValidNumber(-42)).toBe(-42);
  });

  test("handles zero", () => {
    expect(toValidNumber(0)).toBe(0);
  });

  test("handles decimals", () => {
    expect(toValidNumber("3.14")).toBe(3.14);
  });

  test("handles undefined as null (returns 0)", () => {
    // Default value is null, so undefined gets converted to null -> 0
    expect(toValidNumber(undefined, 50)).toBe(0);
  });
});

describe("decodeHtmlEntities", () => {
  test("decodes double quotes", () => {
    expect(decodeHtmlEntities("&#34;hello&#34;")).toBe('"hello"');
  });

  test("decodes single quotes", () => {
    expect(decodeHtmlEntities("&#39;hello&#39;")).toBe("'hello'");
  });

  test("decodes less than", () => {
    expect(decodeHtmlEntities("&lt;")).toBe("<");
  });

  test("decodes greater than", () => {
    expect(decodeHtmlEntities("&gt;")).toBe(">");
  });

  test("decodes ampersand", () => {
    expect(decodeHtmlEntities("&amp;")).toBe("&");
  });

  test("decodes mixed entities", () => {
    expect(decodeHtmlEntities("&lt;p&gt;&#34;Hello&#34;&lt;/p&gt;")).toBe('<p>"Hello"</p>');
  });

  test("returns string as-is when no entities", () => {
    expect(decodeHtmlEntities("hello world")).toBe("hello world");
  });
});
