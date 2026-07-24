// SPDX-License-Identifier: MIT
const { camelCase } = require("../../../utils/helpers/camelcase");

describe("camelCase", () => {
  describe("basic conversions", () => {
    test("converts single word to PascalCase by default", () => {
      expect(camelCase("foo")).toBe("Foo");
    });

    test("converts space-separated words", () => {
      expect(camelCase("foo bar")).toBe("FooBar");
    });

    test("converts hyphen-separated words", () => {
      expect(camelCase("foo-bar")).toBe("FooBar");
    });

    test("converts underscore-separated words", () => {
      expect(camelCase("foo_bar")).toBe("FooBar");
    });

    test("converts dot-separated words", () => {
      expect(camelCase("foo.bar")).toBe("FooBar");
    });
  });

  describe("options", () => {
    test("converts to camelCase when pascalCase is false", () => {
      expect(camelCase("foo bar", { pascalCase: false })).toBe("fooBar");
    });

    test("preserves consecutive uppercase when option is true", () => {
      expect(camelCase("foo-BAR", { preserveConsecutiveUppercase: true })).toBe("FooBAR");
    });
  });

  describe("input types", () => {
    test("accepts string array input", () => {
      expect(camelCase(["foo", "bar", "baz"])).toBe("FooBarBaz");
    });

    test("trims whitespace from array elements", () => {
      expect(camelCase(["  foo  ", "  bar  "])).toBe("FooBar");
    });

    test("filters empty array elements", () => {
      expect(camelCase(["foo", "", "  ", "bar"])).toBe("FooBar");
    });

    test("trims string input", () => {
      expect(camelCase("  foo  ")).toBe("Foo");
    });
  });

  describe("edge cases", () => {
    test("returns empty string for empty input", () => {
      expect(camelCase("")).toBe("");
    });

    test("returns empty string for whitespace-only input", () => {
      expect(camelCase("   ")).toBe("");
    });

    test("returns empty string for separator-only input", () => {
      expect(camelCase("_-_")).toBe("");
    });

    test("returns empty string for empty array", () => {
      expect(camelCase([])).toBe("");
    });

    test("handles single character", () => {
      expect(camelCase("a")).toBe("A");
    });

    test("handles single separator", () => {
      expect(camelCase("_")).toBe("");
    });

    test("handles already-camelCase", () => {
      expect(camelCase("fooBarBaz")).toBe("FooBarBaz");
    });

    test("handles PascalCase", () => {
      expect(camelCase("FooBarBaz")).toBe("FooBarBaz");
    });

    test("handles numbers", () => {
      expect(camelCase("foo123bar")).toBe("Foo123Bar");
    });

    test("handles consecutive uppercase", () => {
      expect(camelCase("FOOBar")).toBe("FooBar");
    });
  });

  describe("errors", () => {
    test("throws TypeError for non-string/non-array input", () => {
      expect(() => camelCase(123)).toThrow(TypeError);
      expect(() => camelCase({})).toThrow(TypeError);
      expect(() => camelCase(null)).toThrow(TypeError);
    });
  });

  describe("locale option", () => {
    test("uses locale false for toLowerCase", () => {
      expect(camelCase("FOO", { locale: false, pascalCase: false })).toBe("foo");
    });
  });
});
