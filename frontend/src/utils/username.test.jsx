// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import {
  USERNAME_REGEX,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "./username";

afterEach(() => {
  cleanup();
});

describe("utils/username – exported constants", () => {
  it("USERNAME_REGEX is a RegExp", () => {
    expect(USERNAME_REGEX).toBeInstanceOf(RegExp);
  });

  it("USERNAME_MIN_LENGTH is 2", () => {
    expect(USERNAME_MIN_LENGTH).toBe(2);
  });

  it("USERNAME_MAX_LENGTH is 32", () => {
    expect(USERNAME_MAX_LENGTH).toBe(32);
  });

  it("USERNAME_PATTERN is the regex source without ^ and $", () => {
    expect(typeof USERNAME_PATTERN).toBe("string");
    expect(USERNAME_PATTERN).toBe("[a-z][a-z0-9._@-]*");
    // Must not include anchors since it's used in an HTML5 pattern attribute.
    expect(USERNAME_PATTERN).not.toContain("^");
    expect(USERNAME_PATTERN).not.toContain("$");
  });
});

describe("utils/username – USERNAME_REGEX positive cases", () => {
  const valid = [
    "ab",
    "alice",
    "user123",
    "first.last",
    "user_name",
    "user-name",
    "user@host",
    "a.b.c.d.e",
    "a1b2c3",
    "abcdefghijklmnopqrstuvwxyz012345", // 32 chars, exactly max
  ];

  it.each(valid)("accepts %s", (name) => {
    expect(USERNAME_REGEX.test(name)).toBe(true);
  });
});

describe("utils/username – USERNAME_REGEX negative cases", () => {
  // NOTE: USERNAME_REGEX is a *character class* check only — it does NOT
  // enforce a min or max length. The min/max are enforced by the form layer
  // using USERNAME_MIN_LENGTH / USERNAME_MAX_LENGTH. The tests below cover
  // the character-class contract; the constants are tested separately above.
  const invalid = [
    "", // empty (no first letter to start)
    "Alice", // uppercase first letter
    "1abc", // starts with a digit
    "_abc", // starts with underscore (must start with lowercase letter)
    "-abc", // starts with hyphen
    ".abc", // starts with period
    "@abc", // starts with @
    "user name", // contains space
    "user!bang", // contains ! (not in allowed set)
    "user#hash", // contains #
    "user$dollar", // contains $
  ];

  it.each(invalid)("rejects %s", (name) => {
    expect(USERNAME_REGEX.test(name)).toBe(false);
  });
});

describe("utils/username – USERNAME_REGEX edge cases", () => {
  it("accepts a 1-character username (regex has no min length)", () => {
    // The regex has no min length — "a" is a valid first letter with zero
    // additional chars. The form layer enforces USERNAME_MIN_LENGTH separately.
    expect("a").toMatch(USERNAME_REGEX);
  });

  it("accepts a 2-character username", () => {
    expect("ab").toMatch(USERNAME_REGEX);
  });

  it("accepts names longer than 32 characters (no implicit length cap in regex)", () => {
    // The regex itself does NOT bound length — that's enforced by the
    // USERNAME_MIN_LENGTH / USERNAME_MAX_LENGTH constants and at the form
    // level. We document this with an explicit test.
    const long = "a".repeat(50);
    // The regex *does* match because there's no length cap in the pattern.
    // We assert this so future maintainers know the cap is enforced elsewhere.
    expect(USERNAME_REGEX.test(long)).toBe(true);
  });

  it("USERNAME_MIN_LENGTH and USERNAME_MAX_LENGTH form a valid length window", () => {
    expect(USERNAME_MIN_LENGTH).toBeLessThan(USERNAME_MAX_LENGTH);
  });
});

describe("utils/username – pattern usable in HTML5 pattern attribute", () => {
  // A minimal harness that renders an <input pattern="..."/> and verifies
  // the pattern attribute is set as expected. This mirrors how the value
  // gets used in production form components.
  function ProbeInput({ pattern }) {
    return <input data-testid="probe" pattern={pattern} aria-label="probe" />;
  }

  it("can be set as the pattern attribute on a real <input>", () => {
    render(<ProbeInput pattern={USERNAME_PATTERN} />);
    const input = screen.getByTestId("probe");
    expect(input.getAttribute("pattern")).toBe(USERNAME_PATTERN);
    // The pattern attribute is a valid CSS attribute selector match.
    expect(input.matches(`[pattern="${USERNAME_PATTERN}"]`)).toBe(true);
  });

  it("the rendered pattern is a valid HTML5 regex source for the simple cases", () => {
    // Build a real RegExp from the pattern, add the anchors back, and verify
    // it behaves the same as USERNAME_REGEX for the canonical cases.
    const re = new RegExp(`^${USERNAME_PATTERN}$`);
    expect(re.test("alice")).toBe(USERNAME_REGEX.test("alice"));
    expect(re.test("Alice")).toBe(USERNAME_REGEX.test("Alice"));
    expect(re.test("a")).toBe(USERNAME_REGEX.test("a"));
    expect(re.test("ab")).toBe(USERNAME_REGEX.test("ab"));
  });
});
