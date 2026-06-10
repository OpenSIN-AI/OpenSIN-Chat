// SPDX-License-Identifier: MIT
/**
 * Guards against pdf-parse API changes. We intentionally do NOT mock the
 * module here: v2 replaced the callable default export with the PDFParse
 * class, which broke runtime behavior while mocked tests stayed green.
 */
describe("pdf-parse module API shape", () => {
  it("exports the PDFParse class (v2+ API)", () => {
    const mod = require("pdf-parse");
    expect(typeof mod).toBe("object");
    expect(typeof mod.PDFParse).toBe("function");
  });

  it("PDFParse#getText returns { text, total } for a minimal PDF", async () => {
    const { PDFParse } = require("pdf-parse");
    const minimalPdf = Buffer.from(
      "%PDF-1.4\n" +
        "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
        "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
        "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n" +
        "4 0 obj<</Length 44>>stream\n" +
        "BT /F1 24 Tf 100 700 Td (Hello World) Tj ET\n" +
        "endstream\nendobj\n" +
        "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n" +
        "xref\n0 6\n0000000000 65535 f \n" +
        "trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF",
    );

    const parser = new PDFParse({ data: minimalPdf });
    const result = await parser.getText();

    expect(typeof result.text).toBe("string");
    expect(result.text).toContain("Hello World");
    expect(result.total).toBe(1);
  });
});
