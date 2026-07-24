// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { parseNoteContent } from "./NoteEditor";

describe("parseNoteContent", () => {
  it("keeps structured editor documents", () => {
    const document = { type: "doc", content: [{ type: "paragraph" }] };
    expect(parseNoteContent(JSON.stringify(document))).toEqual(document);
  });

  it("converts legacy plain text notes without losing line breaks", () => {
    expect(parseNoteContent("First line\nSecond line")).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First line" }] },
        { type: "paragraph", content: [{ type: "text", text: "Second line" }] },
      ],
    });
  });
});
