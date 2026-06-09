// SPDX-License-Identifier: MIT
process.env.STORAGE_DIR = require("os").tmpdir();

// Mock heavy PDF dependencies — we test report orchestration and content
// building, not binary PDF rendering. Captured markdown is read back from
// the mock's call history (markdownToPdf.mock.calls).
jest.mock("@mintplex-labs/mdpdf", () => ({
  markdownToPdf: jest.fn(async () => Buffer.from("raw-pdf")),
}));

jest.mock("pdf-lib", () => {
  const fakePage = {
    getSize: () => ({ width: 595.28, height: 841.89 }),
    drawRectangle: jest.fn(),
    drawText: jest.fn(),
  };
  const fakePdfDoc = {
    getPages: () => [fakePage],
    insertPage: jest.fn(() => fakePage),
    embedFont: jest.fn(async () => ({
      widthOfTextAtSize: (t, s) => String(t).length * s * 0.5,
    })),
    save: jest.fn(async () => Buffer.from("%PDF-1.7 fake pdf bytes")),
  };
  return {
    PDFDocument: { load: jest.fn(async () => fakePdfDoc) },
    rgb: (r, g, b) => ({ r, g, b }),
    StandardFonts: { Helvetica: "Helvetica", HelveticaBold: "HelveticaBold" },
  };
});

const { markdownToPdf } = require("@mintplex-labs/mdpdf");
const { ReportGenerator } = require("../../../utils/reports");

function lastMarkdown() {
  const calls = markdownToPdf.mock.calls;
  return calls.length ? calls[calls.length - 1][0] : null;
}

const baseParams = {
  title: "Energiepolitik Bericht",
  query: "AfD Energiepolitik",
  summary: "## Zusammenfassung\nWichtige Erkenntnisse.",
  searchResults: [
    { title: "Quelle A", link: "https://a.de", snippet: "Snippet A" },
  ],
  politicianResults: [
    { fullName: "Max Mustermann", party: "AfD", faction: "AfD", state: "Berlin" },
  ],
  extractedContent: [
    { title: "Doc A", url: "https://a.de", content: "Langer Inhalt ".repeat(200) },
  ],
};

describe("ReportGenerator.generate", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns a file descriptor with a sanitized filename and size", async () => {
    const res = await ReportGenerator.generate(baseParams);
    expect(res.fileName).toMatch(/^Energiepolitik_Bericht_[a-f0-9]{8}\.pdf$/);
    expect(res.filePath).toContain(res.fileName);
    expect(res.fileSizeKB).toMatch(/^\d+\.\d$/);
  });

  it("includes the summary, politicians and sources in the standard template", async () => {
    await ReportGenerator.generate(baseParams);
    const md = lastMarkdown();
    expect(md).toContain("Energiepolitik Bericht");
    expect(md).toContain("Zusammenfassung");
    expect(md).toContain("Max Mustermann");
    expect(md).toContain("Quelle A");
  });

  it("produces a compact brief template", async () => {
    await ReportGenerator.generate({ ...baseParams, template: "brief" });
    const md = lastMarkdown();
    expect(md).toContain("Kurzgutachten:");
    expect(md).not.toContain("## Alle Quellen");
  });

  it("produces an expanded full template", async () => {
    await ReportGenerator.generate({ ...baseParams, template: "full" });
    expect(lastMarkdown()).toContain("Vollgutachten:");
  });

  it("falls back to the query when no title is given", async () => {
    const res = await ReportGenerator.generate({ ...baseParams, title: undefined });
    expect(res.fileName).toMatch(/^AfD_Energiepolitik_/);
  });

  it("handles empty result arrays without throwing", async () => {
    const res = await ReportGenerator.generate({
      title: "Leer",
      query: "leer",
      summary: "",
    });
    expect(res.fileName).toMatch(/\.pdf$/);
  });
});
