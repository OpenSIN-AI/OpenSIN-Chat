const { rankSearchResult, rankAndLimit } = require("../../../utils/globalSearch/ranking");

describe("global search ranking", () => {
  it("ranks exact titles highest", () => {
    const exact = rankSearchResult(
      { title: "Produktvision" },
      "Produktvision",
    );

    const snippet = rankSearchResult(
      {
        title: "Anderer Chat",
        snippet: "Die Produktvision wird erklärt.",
      },
      "Produktvision",
    );

    expect(exact).toBeGreaterThan(snippet);
  });

  it("deduplicates results", () => {
    const results = rankAndLimit({
      query: "Test",
      limit: 10,
      results: [
        { type: "chat", id: "1", title: "Test" },
        { type: "chat", id: "1", title: "Testbericht" },
      ],
    });

    expect(results).toHaveLength(1);
  });
});
