// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { tokenizeInlineCitations } from "./inline-citations";

describe("tokenizeInlineCitations", () => {
  it("extracts citations", () => {
    expect(tokenizeInlineCitations("Text.[[1]] Mehr.[[2]][[3]]")).toEqual([
      { type: "text", value: "Text." },
      { type: "citation", value: "[[1]]", sourceIndex: 0 },
      { type: "text", value: " Mehr." },
      { type: "citation", value: "[[2]]", sourceIndex: 1 },
      { type: "citation", value: "[[3]]", sourceIndex: 2 },
    ]);
  });

  it("returns plain text when no citations", () => {
    expect(tokenizeInlineCitations("Just plain text.")).toEqual([
      { type: "text", value: "Just plain text." },
    ]);
  });

  it("handles empty string", () => {
    expect(tokenizeInlineCitations("")).toEqual([]);
  });
});
