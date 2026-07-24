// SPDX-License-Identifier: MIT

jest.mock("../../models/documents", () => ({
  Document: {
    where: jest.fn(),
  },
}));

jest.mock("../../utils/documentSummary", () => ({
  generateDocumentSummary: jest.fn(async () => "summary text"),
}));

const fs = require("fs");
const { Document } = require("../../models/documents");
const { DocumentManager } = require("../../utils/DocumentManager");

describe("DocumentManager.alwaysOnContextDocs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dedupes pinned + full mode for the same docId", async () => {
    Document.where.mockResolvedValue([
      {
        docId: "a",
        filename: "a.json",
        docpath: "custom-documents/a.json",
        pinned: true,
        contextMode: "full",
      },
      {
        docId: "a",
        filename: "a.json",
        docpath: "custom-documents/a.json",
        pinned: true,
        contextMode: "full",
      },
    ]);

    const mgr = new DocumentManager({ workspace: { id: 1 }, maxTokens: 1e9 });
    jest.spyOn(mgr, "loadPinnedDocument").mockResolvedValue({
      pageContent: "FULL TEXT",
      token_count_estimate: 10,
      filename: "a.json",
      title: "A",
    });

    const docs = await mgr.alwaysOnContextDocs();
    expect(docs).toHaveLength(1);
    expect(docs[0].pageContent).toBe("FULL TEXT");
    expect(docs[0].contextMode).toBe("full");
  });

  it("loads summary mode as summary content", async () => {
    Document.where.mockResolvedValue([
      {
        docId: "b",
        filename: "b.json",
        docpath: "custom-documents/b.json",
        pinned: false,
        contextMode: "summary",
      },
    ]);

    const mgr = new DocumentManager({ workspace: { id: 1 }, maxTokens: 1e9 });
    const docs = await mgr.alwaysOnContextDocs();
    expect(docs).toHaveLength(1);
    expect(docs[0].contextMode).toBe("summary");
    expect(docs[0].pageContent).toContain("summary text");
  });
});
