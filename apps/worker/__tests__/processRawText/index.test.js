// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

jest.mock("uuid", () => ({ v4: jest.fn(() => "test-uuid-1234") }));

jest.mock("slugify", () => {
  const fn = (str) => str.toLowerCase().replace(/\s+/g, "-");
  return { default: fn, __esModule: true };
}, { virtual: true });

jest.mock("../../utils/tokenizer", () => ({
  tokenizeString: jest.fn(() => 42),
}));

jest.mock("../../utils/files", () => ({
  writeToServerDocuments: jest.fn(({ data }) => ({
    ...data,
    location: "custom-documents/raw-test-1234.json",
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

describe("processRawText", () => {
  beforeEach(() => jest.clearAllMocks());

  const baseMetadata = {
    title: "Test Document",
    url: "https://example.com",
    docAuthor: "Author Name",
    description: "A test document",
    docSource: "test source",
    chunkSource: "link://test",
    published: 1700000000000,
  };

  it("returns failure when textContent is empty", async () => {
    const result = await processRawText("", baseMetadata);
    expect(result.success).toBe(false);
    expect(result.reason).toContain("empty");
    expect(result.documents).toEqual([]);
  });

  it("returns failure when textContent is null", async () => {
    const result = await processRawText(null, baseMetadata);
    expect(result.success).toBe(false);
    expect(result.reason).toContain("empty");
  });

  it("returns success with a document for valid text content", async () => {
    const result = await processRawText("Hello world", baseMetadata);
    expect(result.success).toBe(true);
    expect(result.documents).toHaveLength(1);
  });

  it("populates document fields from metadata", async () => {
    const result = await processRawText("Some content", baseMetadata);
    const doc = result.documents[0];
    expect(doc.id).toBe("test-uuid-1234");
    expect(doc.pageContent).toBe("Some content");
    expect(doc.token_count_estimate).toBe(42);
  });

  it("computes wordCount from textContent", async () => {
    const result = await processRawText("one two three", baseMetadata);
    expect(result.documents[0].wordCount).toBe(3);
  });

  it("calls tokenizeString with the text content", async () => {
    await processRawText("some text to tokenize", baseMetadata);
    expect(tokenizeString).toHaveBeenCalledWith("some text to tokenize");
  });

  it("calls writeToServerDocuments with constructed data", async () => {
    await processRawText("content", baseMetadata);
    expect(writeToServerDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringContaining("raw-test-document"),
      })
    );
  });

  it("handles metadata with valid URL for url field", async () => {
    const result = await processRawText("content", {
      ...baseMetadata,
      url: "https://example.com/page",
    });
    expect(result.documents[0].url).toContain("web://");
  });

  it("falls back to file:// when URL is invalid", async () => {
    const result = await processRawText("content", {
      ...baseMetadata,
      url: "not-a-url",
    });
    expect(result.documents[0].url).toContain("file://");
  });

  it("handles non-string docAuthor gracefully", async () => {
    const result = await processRawText("content", {
      ...baseMetadata,
      docAuthor: 42,
    });
    expect(result.documents[0].docAuthor).toBe("no author specified");
  });

  it("handles non-string description gracefully", async () => {
    const result = await processRawText("content", {
      ...baseMetadata,
      description: null,
    });
    expect(result.documents[0].description).toBe("no description found");
  });

  it("handles non-string docSource gracefully", async () => {
    const result = await processRawText("content", {
      ...baseMetadata,
      docSource: undefined,
    });
    expect(result.documents[0].docSource).toBe("no source set");
  });

  it("handles published as a number", async () => {
    const result = await processRawText("content", {
      ...baseMetadata,
      published: 1700000000000,
    });
    expect(typeof result.documents[0].published).toBe("string");
  });

  it("handles published as NaN gracefully", async () => {
    const result = await processRawText("content", {
      ...baseMetadata,
      published: "not-a-number",
    });
    expect(typeof result.documents[0].published).toBe("string");
  });

  it("falls back chunkSource to slugified title when not provided", async () => {
    const result = await processRawText("content", {
      ...baseMetadata,
      chunkSource: undefined,
    });
    expect(result.documents[0].chunkSource).toContain("test-document");
  });
});
