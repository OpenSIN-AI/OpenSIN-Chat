// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

const mockScrapeGenericUrl = jest.fn();

jest.mock("../../processLink/convert/generic", () => ({
  scrapeGenericUrl: mockScrapeGenericUrl,
}));

jest.mock("../../utils/url", () => ({
  validURL: jest.fn(),
  validateURL: jest.fn(),
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}), { virtual: true });

const { processLink, getLinkText } = require("../../processLink");
const { validURL, validateURL } = require("../../utils/url");

describe("processLink", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateURL.mockImplementation((u) => u);
  });

  it("returns failure for an invalid URL", async () => {
    validURL.mockReturnValue(false);
    const result = await processLink("not-a-url");
    expect(result).toEqual({ success: false, reason: "Not a valid URL." });
  });

  it("calls scrapeGenericUrl with saveAsDocument: true", async () => {
    validURL.mockReturnValue(true);
    mockScrapeGenericUrl.mockResolvedValue({ success: true, content: "text" });
    await processLink("https://example.com");
    expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        saveAsDocument: true,
        captureAs: "text",
      })
    );
  });

  it("passes scraper headers and metadata", async () => {
    validURL.mockReturnValue(true);
    mockScrapeGenericUrl.mockResolvedValue({ success: true, content: "text" });
    await processLink("https://example.com", { Auth: "Bearer x" }, { title: "Test" });
    expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        scraperHeaders: { Auth: "Bearer x" },
        metadata: { title: "Test" },
      })
    );
  });

  it("returns the scrape result on success", async () => {
    validURL.mockReturnValue(true);
    mockScrapeGenericUrl.mockResolvedValue({ success: true, content: "page text" });
    const result = await processLink("https://example.com");
    expect(result.success).toBe(true);
    expect(result.content).toBe("page text");
  });

  it("returns the scrape result on failure", async () => {
    validURL.mockReturnValue(true);
    mockScrapeGenericUrl.mockResolvedValue({ success: false, reason: "timeout" });
    const result = await processLink("https://example.com");
    expect(result.success).toBe(false);
  });
});

describe("getLinkText", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateURL.mockImplementation((u) => u);
  });

  it("returns failure for an invalid URL", async () => {
    validURL.mockReturnValue(false);
    const result = await getLinkText("not-a-url");
    expect(result).toEqual({ success: false, reason: "Not a valid URL." });
  });

  it("calls scrapeGenericUrl with saveAsDocument: false", async () => {
    validURL.mockReturnValue(true);
    mockScrapeGenericUrl.mockResolvedValue({ success: true, content: "text" });
    await getLinkText("https://example.com");
    expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        saveAsDocument: false,
        captureAs: "text",
      })
    );
  });

  it("respects the captureAs parameter", async () => {
    validURL.mockReturnValue(true);
    mockScrapeGenericUrl.mockResolvedValue({ success: true, content: "<html>" });
    await getLinkText("https://example.com", "html");
    expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        captureAs: "html",
      })
    );
  });

  it("defaults captureAs to 'text'", async () => {
    validURL.mockReturnValue(true);
    mockScrapeGenericUrl.mockResolvedValue({ success: true, content: "text" });
    await getLinkText("https://example.com");
    expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
      expect.objectContaining({ captureAs: "text" })
    );
  });
});
