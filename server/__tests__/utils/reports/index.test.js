// SPDX-License-Identifier: MIT
const fs = require("fs");
const path = require("path");

jest.mock("@mintplex-labs/mdpdf", () => ({
  markdownToPdf: jest.fn().mockResolvedValue(Buffer.from("fake-pdf-content")),
}));

jest.mock("pdf-lib", () => {
  const mockPage = {
    drawRectangle: jest.fn(),
    drawText: jest.fn(),
    getSize: jest.fn().mockReturnValue({ width: 595, height: 842 }),
  };
  const mockPdfDoc = {
    embedFont: jest.fn().mockImplementation(() => Promise.resolve({ widthOfTextAtSize: () => 100, heightAtSize: () => 10 })),
    getPages: jest.fn().mockReturnValue([mockPage]),
    insertPage: jest.fn().mockReturnValue(mockPage),
    save: jest.fn().mockResolvedValue(Buffer.from("branded-pdf")),
  };
  return {
    PDFDocument: {
      load: jest.fn().mockResolvedValue(mockPdfDoc),
    },
    rgb: jest.fn((r, g, b) => ({ r, g, b })),
    StandardFonts: {
      Helvetica: "Helvetica",
    },
  };
});

const { ReportGenerator } = require("../../../utils/reports");

describe("ReportGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("static utility methods", () => {
    test("class is defined", () => {
      expect(ReportGenerator).toBeDefined();
      expect(typeof ReportGenerator.generate).toBe("function");
    });
  });

  describe("generate", () => {
    test("generates a PDF report with valid inputs", async () => {
      const result = await ReportGenerator.generate({
        title: "Test Report",
        query: "Test query",
        summary: "This is a test summary.",
        searchResults: [{ title: "Source 1", link: "https://example.com", snippet: "Test snippet" }],
      });
      expect(result).toHaveProperty("filePath");
      expect(result).toHaveProperty("fileName");
      expect(result).toHaveProperty("fileSizeKB");
      expect(result.fileName).toContain("Test_Report");
      expect(result.fileName).toContain(".pdf");
    });

    test("uses query as title when title is missing", async () => {
      const result = await ReportGenerator.generate({
        query: "Test query",
        summary: "Summary",
      });
      expect(result.fileName).toContain("Test_query");
    });

    test("uses 'report' as default name when both title and query missing", async () => {
      const result = await ReportGenerator.generate({
        summary: "Summary",
      });
      expect(result.fileName).toContain("report");
    });

    test("sanitizes special characters in filename", async () => {
      const result = await ReportGenerator.generate({
        title: "Test/Report: Special<Chars>",
        query: "test",
        summary: "Summary",
      });
      expect(result.fileName).not.toContain("/");
      expect(result.fileName).not.toContain(":");
      expect(result.fileName).not.toContain("<");
      expect(result.fileName).not.toContain(">");
    });

    test("limits filename length", async () => {
      const longTitle = "a".repeat(100);
      const result = await ReportGenerator.generate({
        title: longTitle,
        query: "test",
        summary: "Summary",
      });
      expect(result.fileName.length).toBeLessThan(100);
    });

    test("returns fileSizeKB as string with one decimal", async () => {
      const result = await ReportGenerator.generate({
        title: "Test",
        query: "test",
        summary: "Summary",
      });
      expect(typeof result.fileSizeKB).toBe("string");
      expect(result.fileSizeKB).toMatch(/^\d+\.\d$/);
    });

    test("uses brief template when specified", async () => {
      const result = await ReportGenerator.generate({
        title: "Brief Test",
        query: "test",
        summary: "Summary",
        template: "brief",
      });
      expect(result).toHaveProperty("filePath");
    });

    test("uses full template when specified", async () => {
      const result = await ReportGenerator.generate({
        title: "Full Test",
        query: "test",
        summary: "Summary",
        template: "full",
      });
      expect(result).toHaveProperty("filePath");
    });

    test("handles empty searchResults", async () => {
      const result = await ReportGenerator.generate({
        title: "Test",
        query: "test",
        summary: "Summary",
        searchResults: [],
      });
      expect(result).toHaveProperty("filePath");
    });

    test("handles empty politicianResults", async () => {
      const result = await ReportGenerator.generate({
        title: "Test",
        query: "test",
        summary: "Summary",
        politicianResults: [],
      });
      expect(result).toHaveProperty("filePath");
    });

    test("handles empty extractedContent", async () => {
      const result = await ReportGenerator.generate({
        title: "Test",
        query: "test",
        summary: "Summary",
        extractedContent: [],
      });
      expect(result).toHaveProperty("filePath");
    });

    test("handles missing summary", async () => {
      const result = await ReportGenerator.generate({
        title: "Test",
        query: "test",
      });
      expect(result).toHaveProperty("filePath");
    });
  });
});
