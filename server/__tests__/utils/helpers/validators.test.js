// SPDX-License-Identifier: MIT
const { validateEmail, EMAIL_REGEX } = require("../../../utils/helpers/validators");

describe("validators", () => {
  describe("EMAIL_REGEX", () => {
    test("is an instance of RegExp", () => {
      expect(EMAIL_REGEX).toBeInstanceOf(RegExp);
    });
  });

  describe("validateEmail", () => {
    test("returns a valid email unchanged", () => {
      expect(validateEmail("user@example.com")).toBe("user@example.com");
    });

    test("accepts plus addressing", () => {
      expect(validateEmail("user+tag@example.com")).toBe("user+tag@example.com");
    });

    test("accepts subdomain", () => {
      expect(validateEmail("user@mail.example.com")).toBe(
        "user@mail.example.com",
      );
    });

    test("accepts numeric domain", () => {
      expect(validateEmail("user@123.com")).toBe("user@123.com");
    });

    test("accepts single-letter local part", () => {
      expect(validateEmail("a@example.com")).toBe("a@example.com");
    });

    test("accepts uppercase email", () => {
      expect(validateEmail("USER@EXAMPLE.COM")).toBe("USER@EXAMPLE.COM");
    });

    test("throws on email without @", () => {
      expect(() => validateEmail("userexample.com")).toThrow("Invalid email");
    });

    test("throws on email without domain", () => {
      expect(() => validateEmail("user@")).toThrow("Invalid email");
    });

    test("throws on email without TLD", () => {
      expect(() => validateEmail("user@example")).toThrow("Invalid email");
    });

    test("throws on empty string", () => {
      expect(() => validateEmail("")).toThrow("Invalid email");
    });

    test("throws on single-character TLD", () => {
      expect(() => validateEmail("user@example.c")).toThrow("Invalid email");
    });

    test("throws on spaces in email", () => {
      expect(() => validateEmail("user @example.com")).toThrow("Invalid email");
    });

    test("throws on null", () => {
      expect(() => validateEmail(null)).toThrow("Invalid email");
    });

    test("throws on undefined", () => {
      expect(() => validateEmail(undefined)).toThrow("Invalid email");
    });

    test("throws on number", () => {
      expect(() => validateEmail(123)).toThrow("Invalid email");
    });

    test("throws on object", () => {
      expect(() => validateEmail({ email: "a@b.com" })).toThrow("Invalid email");
    });
  });
});
