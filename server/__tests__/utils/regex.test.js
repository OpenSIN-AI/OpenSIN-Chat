// SPDX-License-Identifier: MIT
const { escapeRegExp } = require("../../utils/helpers/regex");

describe("escapeRegExp", () => {
  test("escapes all regex metacharacters", () => {
    const input = ".*+?^${}()|[]\\";
    const escaped = escapeRegExp(input);
    // The escaped string, used as a pattern, must match the literal input.
    expect(new RegExp(`^${escaped}$`).test(input)).toBe(true);
  });

  test("leaves plain text unchanged in behavior", () => {
    expect(escapeRegExp("hello")).toBe("hello");
  });

  test("neutralizes a would-be wildcard so it matches literally", () => {
    const pattern = new RegExp(escapeRegExp("a.c"));
    expect(pattern.test("a.c")).toBe(true);
    expect(pattern.test("abc")).toBe(false);
  });

  test("prevents ReDoS-style nested quantifier injection", () => {
    // Without escaping, `(a+)+` would be a catastrophic-backtracking pattern.
    const escaped = escapeRegExp("(a+)+");
    const pattern = new RegExp(`^${escaped}$`);
    expect(pattern.test("(a+)+")).toBe(true);
    expect(pattern.test("aaaa")).toBe(false);
  });

  test("returns empty string for empty input", () => {
    expect(escapeRegExp("")).toBe("");
  });

  test("coerces non-string input to string", () => {
    expect(escapeRegExp(123)).toBe("123");
  });
});
