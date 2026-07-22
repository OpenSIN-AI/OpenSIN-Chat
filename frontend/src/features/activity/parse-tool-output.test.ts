// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { parseWebSources } from "./parse-tool-output";

describe("parseWebSources", () => {
  it("parses result arrays", () => {
    const sources = parseWebSources(
      JSON.stringify({
        results: [{ title: "Example", url: "https://example.com/page" }],
      }),
    );
    expect(sources).toEqual([
      { title: "Example", url: "https://example.com/page", domain: "example.com" },
    ]);
  });

  it("rejects unsafe URLs", () => {
    const sources = parseWebSources(
      JSON.stringify([{ title: "Unsafe", url: "javascript:alert(1)" }]),
    );
    expect(sources).toEqual([]);
  });

  it("handles invalid output", () => {
    expect(parseWebSources("not json")).toEqual([]);
  });
});
