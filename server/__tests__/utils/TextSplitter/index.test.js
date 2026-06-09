// SPDX-License-Identifier: MIT
const { TextSplitter } = require("../../../utils/TextSplitter");

describe("TextSplitter", () => {
  describe("determineMaxChunkSize", () => {
    test("returns embedderLimit when preferred is null", () => {
      expect(TextSplitter.determineMaxChunkSize(null, 8192)).toBe(8192);
    });

    test("returns embedderLimit when preferred is NaN", () => {
      expect(TextSplitter.determineMaxChunkSize(NaN, 8192)).toBe(8192);
    });

    test("returns preferred when less than embedderLimit", () => {
      expect(TextSplitter.determineMaxChunkSize(500, 8192)).toBe(500);
    });

    test("returns embedderLimit when preferred exceeds limit", () => {
      expect(TextSplitter.determineMaxChunkSize(10000, 8192)).toBe(8192);
    });

    test("returns preferred when equal to embedderLimit", () => {
      expect(TextSplitter.determineMaxChunkSize(8192, 8192)).toBe(8192);
    });

    test("handles string numbers", () => {
      expect(TextSplitter.determineMaxChunkSize("500", "8192")).toBe(500);
      expect(TextSplitter.determineMaxChunkSize("10000", "8192")).toBe(8192);
    });
  });

  describe("buildHeaderMeta", () => {
    test("returns null for empty metadata", () => {
      expect(TextSplitter.buildHeaderMeta({})).toBeNull();
      expect(TextSplitter.buildHeaderMeta(null)).toBeNull();
      expect(TextSplitter.buildHeaderMeta(undefined)).toBeNull();
    });

    test("extracts title as sourceDocument", () => {
      const meta = TextSplitter.buildHeaderMeta({ title: "Test Doc" });
      expect(meta).toEqual({ sourceDocument: "Test Doc" });
    });

    test("extracts published date", () => {
      const meta = TextSplitter.buildHeaderMeta({ published: "2026-01-01T00:00:00.000Z" });
      expect(meta).toEqual({ published: "2026-01-01T00:00:00.000Z" });
    });

    test("extracts link:// chunkSource", () => {
      const meta = TextSplitter.buildHeaderMeta({ chunkSource: "link://https://example.com/page" });
      expect(meta).toEqual({ source: "https://example.com/page" });
    });

    test("extracts youtube:// chunkSource", () => {
      const meta = TextSplitter.buildHeaderMeta({ chunkSource: "youtube://abc123" });
      expect(meta).toEqual({ source: "abc123" });
    });

    test("ignores invalid chunkSource prefix", () => {
      const meta = TextSplitter.buildHeaderMeta({ chunkSource: "invalid://something" });
      expect(meta).toEqual({});
    });

    test("ignores empty chunkSource", () => {
      expect(TextSplitter.buildHeaderMeta({ chunkSource: "" })).toEqual({});
      expect(TextSplitter.buildHeaderMeta({ chunkSource: null })).toEqual({});
    });

    test("combines multiple metadata fields", () => {
      const meta = TextSplitter.buildHeaderMeta({
        title: "Test",
        published: "2026-01-01",
        chunkSource: "link://https://example.com",
      });
      expect(meta).toEqual({
        sourceDocument: "Test",
        published: "2026-01-01",
        source: "https://example.com",
      });
    });

    test("ignores fields with null plucked values", () => {
      const meta = TextSplitter.buildHeaderMeta({
        title: "",
        published: null,
        chunkSource: "invalid://test",
      });
      expect(meta).toEqual({});
    });
  });

  describe("constructor and config", () => {
    test("creates instance with default config", () => {
      const splitter = new TextSplitter();
      expect(splitter.config).toEqual({});
    });

    test("accepts chunkSize config", () => {
      const splitter = new TextSplitter({ chunkSize: 500 });
      expect(splitter.config.chunkSize).toBe(500);
    });

    test("accepts chunkOverlap config", () => {
      const splitter = new TextSplitter({ chunkOverlap: 50 });
      expect(splitter.config.chunkOverlap).toBe(50);
    });

    test("accepts chunkPrefix config", () => {
      const splitter = new TextSplitter({ chunkPrefix: "PREFIX: " });
      expect(splitter.config.chunkPrefix).toBe("PREFIX: ");
    });

    test("accepts chunkHeaderMeta config", () => {
      const splitter = new TextSplitter({ chunkHeaderMeta: { title: "Test" } });
      expect(splitter.config.chunkHeaderMeta).toEqual({ title: "Test" });
    });
  });

  describe("stringifyHeader", () => {
    test("returns empty string when no config", () => {
      const splitter = new TextSplitter();
      expect(splitter.stringifyHeader()).toBe("");
    });

    test("returns prefix when only prefix is set", () => {
      const splitter = new TextSplitter({ chunkPrefix: "PREFIX: " });
      expect(splitter.stringifyHeader()).toBe("PREFIX: ");
    });

    test("applies prefix to header when header meta is set", () => {
      const splitter = new TextSplitter({
        chunkPrefix: "PREFIX: ",
        chunkHeaderMeta: { title: "Test" },
      });
      const result = splitter.stringifyHeader();
      expect(result).toContain("PREFIX: ");
      expect(result).toContain("<document_metadata>");
    });

    test("formats header meta correctly", () => {
      const splitter = new TextSplitter({
        chunkHeaderMeta: { title: "Test", author: "Me" },
      });
      const result = splitter.stringifyHeader();
      expect(result).toContain("title: Test");
      expect(result).toContain("author: Me");
      expect(result).toContain("<document_metadata>");
    });
  });
});
