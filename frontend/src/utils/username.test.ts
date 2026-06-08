// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import {
  USERNAME_REGEX,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "./username";

// Mirrors the documented validation contract: 2-32 chars, must start with a
// lowercase letter, may contain [a-z0-9._@-]. These tests lock that behaviour
// so an accidental regex change in the auth flow is caught early.
const isValid = (name: any): any =>
  USERNAME_REGEX.test(name) &&
  name.length >= USERNAME_MIN_LENGTH &&
  name.length <= USERNAME_MAX_LENGTH;

describe("USERNAME_REGEX", () => {
  it("accepts valid usernames", () => {
    expect(isValid("ab")).toBe(true);
    expect(isValid("john_doe")).toBe(true);
    expect(isValid("user.name-1")).toBe(true);
    expect(isValid("a@b.c")).toBe(true);
  });

  it("rejects usernames that do not start with a lowercase letter", () => {
    expect(isValid("1abc")).toBe(false);
    expect(isValid("_abc")).toBe(false);
    expect(isValid("Abc")).toBe(false);
  });

  it("rejects disallowed characters", () => {
    expect(isValid("john doe")).toBe(false);
    expect(isValid("john!")).toBe(false);
    expect(isValid("josé")).toBe(false);
  });

  it("enforces the length bounds", () => {
    expect(isValid("a")).toBe(false); // too short
    expect(isValid("a" + "b".repeat(31))).toBe(true); // exactly 32
    expect(isValid("a" + "b".repeat(32))).toBe(false); // 33, too long
  });
});

describe("USERNAME_PATTERN", () => {
  it("is the regex body without anchors for HTML5 pattern attributes", () => {
    expect(USERNAME_PATTERN).toBe("[a-z][a-z0-9._@-]*");
    expect(USERNAME_REGEX.source).toBe(`^${USERNAME_PATTERN}$`);
  });
});
