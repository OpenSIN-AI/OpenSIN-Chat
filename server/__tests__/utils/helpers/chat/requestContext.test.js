const {
  parseChatRequestContext,
} = require("../../../../utils/helpers/chat/requestContext");

describe("parseChatRequestContext", () => {
  it("accepts a valid context", () => {
    const result = parseChatRequestContext({
      turnId: "12345678-abcd-1234-abcd-123456789012",
      notebookMode: "code",
      selectedSourceIds: ["doc-1", "doc-1", "doc-2"],
      codeRunnerId: "codex-cli",
      sourceSelectionExplicit: true,
    });

    expect(result.notebookMode).toBe("code");
    expect(result.selectedSourceIds).toEqual(["doc-1", "doc-2"]);
    expect(result.codeRunnerId).toBe("codex-cli");
    expect(result.turnId).toBe("12345678-abcd-1234-abcd-123456789012");
    expect(result.sourceSelectionExplicit).toBe(true);
  });

  it("falls back for invalid modes", () => {
    const result = parseChatRequestContext({ notebookMode: "admin-mode" });
    expect(result.notebookMode).toBe("chat");
    expect(result.codeRunnerId).toBeNull();
  });

  it("rejects runner outside code mode", () => {
    const result = parseChatRequestContext({ notebookMode: "work", codeRunnerId: "codex-cli" });
    expect(result.codeRunnerId).toBeNull();
  });

  it("limits selected sources", () => {
    const result = parseChatRequestContext({
      selectedSourceIds: Array.from({ length: 1_000 }, (_, i) => `doc-${i}`),
    });
    expect(result.selectedSourceIds).toHaveLength(500);
  });

  it("generates a turnId when missing", () => {
    const result = parseChatRequestContext({});
    expect(typeof result.turnId).toBe("string");
    expect(result.turnId.length).toBeGreaterThan(0);
  });

  it("normalizes sourceSelectionExplicit", () => {
    expect(parseChatRequestContext({}).sourceSelectionExplicit).toBe(false);
    expect(parseChatRequestContext({ sourceSelectionExplicit: true }).sourceSelectionExplicit).toBe(true);
    expect(parseChatRequestContext({ sourceSelectionExplicit: "yes" }).sourceSelectionExplicit).toBe(false);
  });
});
