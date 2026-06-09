// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

// Additional tests for processLink / getLinkText — covers captureAs
// variants, headers, metadata pass-through, and error surfaces.

const mockScrapeGenericUrl = jest.fn();

jest.mock("../../processLink/convert/generic", () => ({
  scrapeGenericUrl: mockScrapeGenericUrl,
}));

jest.mock("../../utils/url", () => ({
  validURL: jest.fn(() => true),
  validateURL: jest.fn((u) => u),
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}), { virtual: true });

const { processLink, getLinkText } = require("../../processLink");
const { validURL, validateURL } = require("../../utils/url");

describe("processLink - additional coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateURL.mockImplementation((u) => u);
    validURL.mockReturnValue(true);
    mockScrapeGenericUrl.mockResolvedValue({ success: true, content: "x" });
  });

  describe("processLink", () => {
    it("validates URL via validateURL then validURL", async () => {
      await processLink("https://example.com");
      expect(validateURL).toHaveBeenCalledWith("https://example.com");
      expect(validURL).toHaveBeenCalled();
    });

    it("passes the validated URL to scrapeGenericUrl", async () => {
      validateURL.mockReturnValue("https://normalized.example.com");
      await processLink("example.com");
      expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
        expect.objectContaining({ link: "https://normalized.example.com" })
      );
    });

    it("uses saveAsDocument: true", async () => {
      await processLink("https://example.com");
      expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
        expect.objectContaining({ saveAsDocument: true })
      );
    });

    it("uses captureAs: 'text' by default", async () => {
      await processLink("https://example.com");
      expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
        expect.objectContaining({ captureAs: "text" })
      );
    });

    it("forwards scraperHeaders (default empty object)", async () => {
      await processLink("https://example.com");
      expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
        expect.objectContaining({ scraperHeaders: {} })
      );
    });

    it("forwards provided scraperHeaders", async () => {
      const headers = { "X-API-Key": "abc" };
      await processLink("https://example.com", headers);
      expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
        expect.objectContaining({ scraperHeaders: headers })
      );
    });

    it("forwards provided metadata (default empty object)", async () => {
      await processLink("https://example.com");
      expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: {} })
      );
    });

    it("returns failure when URL is invalid", async () => {
      validURL.mockReturnValue(false);
      const result = await processLink("not-a-url");
      expect(result).toEqual({ success: false, reason: "Not a valid URL." });
    });

    it("returns the scrape result untouched on success", async () => {
      mockScrapeGenericUrl.mockResolvedValue({
        success: true,
        content: "scraped body",
        saveLocation: "documents/x.json",
      });
      const result = await processLink("https://example.com");
      expect(result).toEqual({
        success: true,
        content: "scraped body",
        saveLocation: "documents/x.json",
      });
    });

    it("returns the scrape result untouched on failure", async () => {
      mockScrapeGenericUrl.mockResolvedValue({
        success: false,
        reason: "upstream 503",
      });
      const result = await processLink("https://example.com");
      expect(result).toEqual({ success: false, reason: "upstream 503" });
    });
  });

  describe("getLinkText", () => {
    it("validates URL", async () => {
      await getLinkText("https://example.com");
      expect(validateURL).toHaveBeenCalledWith("https://example.com");
    });

    it("uses saveAsDocument: false", async () => {
      await getLinkText("https://example.com");
      expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
        expect.objectContaining({ saveAsDocument: false })
      );
    });

    it("defaults captureAs to 'text'", async () => {
      await getLinkText("https://example.com");
      expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
        expect.objectContaining({ captureAs: "text" })
      );
    });

    it("respects 'html' captureAs", async () => {
      await getLinkText("https://example.com", "html");
      expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
        expect.objectContaining({ captureAs: "html" })
      );
    });

    it("respects 'json' captureAs", async () => {
      await getLinkText("https://example.com", "json");
      expect(mockScrapeGenericUrl).toHaveBeenCalledWith(
        expect.objectContaining({ captureAs: "json" })
      );
    });

    it("returns the scrape result untouched", async () => {
      mockScrapeGenericUrl.mockResolvedValue({
        success: true,
        content: "<html>...</html>",
      });
      const result = await getLinkText("https://example.com", "html");
      expect(result).toEqual({ success: true, content: "<html>...</html>" });
    });

    it("returns failure for invalid URL", async () => {
      validURL.mockReturnValue(false);
      const result = await getLinkText("not-a-url");
      expect(result).toEqual({ success: false, reason: "Not a valid URL." });
    });
  });
});
