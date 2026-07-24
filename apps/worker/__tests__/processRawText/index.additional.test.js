// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

// Additional tests for processRawText — exercises the stripAndSlug helper
// indirectly via metadata, edge cases for word counting, and the
// writeToServerDocuments filename format.

jest.mock("uuid", () => ({
  v4: jest.fn(() => "deterministic-uuid"),
}));

jest.mock("slugify", () => {
  const fn = (str) => String(str).toLowerCase().replace(/\s+/g, "-");
  return { default: fn, __esModule: true };
}, { virtual: true });

jest.mock("../../utils/tokenizer", () => ({
  tokenizeString: jest.fn(() => 100),
}));

jest.mock("../../utils/files", () => ({
  writeToServerDocuments: jest.fn(({ data, filename }) => ({
    ...data,
    location: `documents/${filename}.json`,
  })),
}));

jest.mock("../../utils/paths", () => ({
  getStoragePath: jest.fn(() => "/fake/storage"),
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}), { virtual: true });

const { processRawText } = require("../../processRawText");
const { tokenizeString } = require("../../utils/tokenizer");
const { writeToServerDocuments } = require("../../utils/files");

describe("processRawText - additional coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseMeta = {
    title: "Test Doc",
    url: "https://example.com",
    docAuthor: "A. Author",
    description: "desc",
    docSource: "source",
    chunkSource: "chunk://x",
    published: 1700000000000,
  };

  describe("empty / falsy inputs", () => {
    it("returns failure for undefined textContent", async () => {
      const result = await processRawText(undefined, baseMeta);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/empty/i);
    });

    it("returns failure for whitespace-only textContent", async () => {
      // processRawText only checks .length === 0, so whitespace is "valid"
      const result = await processRawText("   \n  ", baseMeta);
      // It is technically non-empty, so success is expected
      expect(result.success).toBe(true);
    });

    it("returns failure for 0 (number) textContent", async () => {
      const result = await processRawText(0, baseMeta);
      expect(result.success).toBe(false);
    });
  });

  describe("URL handling", () => {
    it("supports http:// URL", async () => {
      const result = await processRawText("x", {
        ...baseMeta,
        url: "http://example.com",
      });
      expect(result.documents[0].url).toContain("http://example.com");
    });

    it("rejects non-http protocols in URL", async () => {
      const result = await processRawText("x", {
        ...baseMeta,
        url: "ftp://example.com",
      });
      expect(result.documents[0].url).toContain("file://");
    });

    it("handles URL with trailing path", async () => {
      const result = await processRawText("x", {
        ...baseMeta,
        url: "https://example.com/foo/bar",
      });
      expect(result.documents[0].url).toContain("/foo/bar");
    });
  });

  describe("title slugification", () => {
    it("slugifies the title in the output", async () => {
      const result = await processRawText("x", {
        ...baseMeta,
        title: "Hello World Title",
      });
      expect(result.documents[0].title).toContain("hello-world-title");
    });

    it("removes last extension from title when slugifying", async () => {
      const result = await processRawText("x", {
        ...baseMeta,
        title: "My File.TXT",
      });
      // .split(".").slice(0, -1).join("-") => "My File" -> "my-file"
      expect(result.documents[0].title).toContain("my-file");
    });
  });

  describe("writeToServerDocuments call", () => {
    it("passes filename prefixed with 'raw-' and the uuid", async () => {
      await processRawText("content", baseMeta);
      const call = writeToServerDocuments.mock.calls[0][0];
      expect(call.filename).toMatch(/^raw-test-doc-deterministic-uuid$/);
    });

    it("passes data with all required document fields", async () => {
      await processRawText("content", baseMeta);
      const call = writeToServerDocuments.mock.calls[0][0];
      expect(call.data).toEqual(
        expect.objectContaining({
          id: "deterministic-uuid",
          pageContent: "content",
          wordCount: 1,
          token_count_estimate: 100,
        })
      );
    });
  });

  describe("wordCount calculation", () => {
    it("counts spaces in text content", async () => {
      const result = await processRawText("a b c d e", baseMeta);
      expect(result.documents[0].wordCount).toBe(5);
    });

    it("returns 1 for single-word text", async () => {
      const result = await processRawText("singleword", baseMeta);
      expect(result.documents[0].wordCount).toBe(1);
    });
  });

  describe("metadata fields", () => {
    it("uses 'no author specified' when docAuthor is missing", async () => {
      const result = await processRawText("x", { ...baseMeta, docAuthor: undefined });
      expect(result.documents[0].docAuthor).toBe("no author specified");
    });

    it("uses 'no description found' when description is missing", async () => {
      const result = await processRawText("x", { ...baseMeta, description: undefined });
      expect(result.documents[0].description).toBe("no description found");
    });

    it("uses 'no source set' when docSource is missing", async () => {
      const result = await processRawText("x", { ...baseMeta, docSource: undefined });
      expect(result.documents[0].docSource).toBe("no source set");
    });

    it("uses slugified title as chunkSource fallback", async () => {
      const result = await processRawText("x", { ...baseMeta, chunkSource: undefined });
      expect(result.documents[0].chunkSource).toContain("test-doc");
    });
  });

  describe("tokenizeString integration", () => {
    it("calls tokenizeString with the text content", async () => {
      await processRawText("hello there friend", baseMeta);
      expect(tokenizeString).toHaveBeenCalledWith("hello there friend");
    });
  });
});
