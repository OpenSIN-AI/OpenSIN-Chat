// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { workspaceDocumentToNotebookSource } from "./source-adapter";

describe("workspaceDocumentToNotebookSource", () => {
  it("recognizes a regular web source", () => {
    const source = workspaceDocumentToNotebookSource(
      { docId: "web-1", filename: "OpenAI", metadata: JSON.stringify({ url: "https://openai.com", title: "OpenAI" }) },
      "test-notebook",
    );
    expect(source.kind).toBe("web");
    expect(source.uri).toBe("https://openai.com");
    expect(source.title).toBe("OpenAI");
  });

  it("recognizes a YouTube source", () => {
    const source = workspaceDocumentToNotebookSource(
      { docId: "youtube-1", filename: "Video", metadata: JSON.stringify({ url: "https://youtube.com/watch?v=123" }) },
      "test-notebook",
    );
    expect(source.kind).toBe("youtube");
  });

  it("recognizes a repository source", () => {
    const source = workspaceDocumentToNotebookSource(
      { docId: "repo-1", filename: "OpenSIN-Chat", metadata: JSON.stringify({ source: "github://OpenSIN-AI/OpenSIN-Chat" }) },
      "test-notebook",
    );
    expect(source.kind).toBe("repository");
  });

  it("uses restrictive default permissions", () => {
    const source = workspaceDocumentToNotebookSource(
      { docId: "file-1", filename: "example.pdf" },
      "test-notebook",
    );
    expect(source.permissions).toEqual({ read: true, write: false, execute: false });
  });
});
