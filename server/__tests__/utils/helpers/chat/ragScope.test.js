const { buildRagScope } = require("../../../../utils/helpers/chat/ragScope");

describe("buildRagScope", () => {
  const workspace = { id: 1, slug: "test-workspace" };

  it("returns empty arrays for no documents", () => {
    const scope = buildRagScope({ workspace, selectedDocuments: [], selectionWasExplicit: false });
    expect(scope.workspaceId).toBe(1);
    expect(scope.documentIds).toEqual([]);
    expect(scope.selectionWasExplicit).toBe(false);
  });

  it("extracts docIds and paths from documents", () => {
    const scope = buildRagScope({
      workspace,
      selectedDocuments: [
        { docId: "d1", docpath: "/a/b.pdf", filename: "b.pdf" },
        { id: "d2", docpath: "/c/d.md", filename: "d.md" },
      ],
      selectionWasExplicit: true,
    });

    expect(scope.documentIds).toEqual(["d1", "d2"]);
    expect(scope.documentPaths).toEqual(["/a/b.pdf", "/c/d.md"]);
    expect(scope.filenames).toEqual(["b.pdf", "d.md"]);
    expect(scope.selectionWasExplicit).toBe(true);
  });
});
