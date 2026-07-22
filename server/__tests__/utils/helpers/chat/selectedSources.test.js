const {
  validateSelectedSources,
} = require("../../../../utils/helpers/chat/selectedSources");

describe("validateSelectedSources", () => {
  const workspace = {
    documents: [
      { docId: "doc-1", filename: "one.pdf" },
      { docId: "doc-2", filename: "two.pdf" },
    ],
  };

  it("returns only workspace documents", () => {
    const result = validateSelectedSources({
      workspace,
      requestedIds: ["doc-1", "foreign-doc"],
    });

    expect(result.selectedIds).toEqual(["doc-1"]);
    expect(result.rejectedIds).toEqual(["foreign-doc"]);
  });

  it("returns no documents for explicit empty selection", () => {
    const result = validateSelectedSources({ workspace, requestedIds: [] });
    expect(result.selectedDocuments).toEqual([]);
  });

  it("handles missing workspace gracefully", () => {
    const result = validateSelectedSources({ workspace: null, requestedIds: ["doc-1"] });
    expect(result.selectedDocuments).toEqual([]);
    expect(result.rejectedIds).toEqual(["doc-1"]);
  });

  it("deduplicates document IDs", () => {
    const result = validateSelectedSources({
      workspace,
      requestedIds: ["doc-1", "doc-1"],
    });
    expect(result.selectedIds).toEqual(["doc-1"]);
  });
});
