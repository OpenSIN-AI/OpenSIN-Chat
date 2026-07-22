const { normalizeQuery, normalizeLimit } = require("../../../utils/globalSearch/query");

describe("global search query", () => {
  it("normalizes whitespace", () => {
    expect(normalizeQuery("  hello   world ")).toBe("hello world");
  });

  it("clamps result limits", () => {
    expect(normalizeLimit(500)).toBe(50);
    expect(normalizeLimit(-4)).toBe(1);
  });
});
