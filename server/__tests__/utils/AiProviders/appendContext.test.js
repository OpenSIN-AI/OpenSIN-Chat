// SPDX-License-Identifier: MIT
const { appendContext } = require("../../../utils/AiProviders/appendContext");

describe("appendContext", () => {
  it("returns empty string for empty input", () => {
    expect(appendContext([])).toBe("");
    expect(appendContext()).toBe("");
  });

  it("uses 1-based CONTEXT labels matching [source:N]", () => {
    const out = appendContext(["first chunk", "second chunk"]);
    expect(out).toContain("[CONTEXT 1]:");
    expect(out).toContain("[END CONTEXT 1]");
    expect(out).toContain("[CONTEXT 2]:");
    expect(out).toContain("[END CONTEXT 2]");
    expect(out).not.toContain("[CONTEXT 0]");
    expect(out).toContain("first chunk");
    expect(out).toContain("second chunk");
  });

  it("wraps content in RETRIEVED_CONTEXT delimiters", () => {
    const out = appendContext(["hello"]);
    expect(out).toMatch(/<RETRIEVED_CONTEXT nonce="[A-F0-9]+">/);
    expect(out).toMatch(/<\/RETRIEVED_CONTEXT nonce="[A-F0-9]+">/);
  });
});
