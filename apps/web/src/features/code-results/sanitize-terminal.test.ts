// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { sanitizeTerminalOutput } from "./sanitize-terminal";

describe("sanitizeTerminalOutput", () => {
  it("removes ANSI sequences", () => {
    expect(sanitizeTerminalOutput("\u001b[31mError\u001b[0m")).toBe("Error");
  });

  it("handles undefined", () => {
    expect(sanitizeTerminalOutput(undefined)).toBe("");
  });

  it("normalizes line endings", () => {
    expect(sanitizeTerminalOutput("line1\r\nline2")).toBe("line1\nline2");
  });
});
