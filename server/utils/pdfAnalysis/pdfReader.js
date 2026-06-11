// SPDX-License-Identifier: MIT
/**
 * PdfReader — speicherschonendes, seitenweises Auslesen sehr großer PDFs.
 *
 * pdfjs lädt Seiten lazy über die XRef-Tabelle; wir extrahieren Text
 * pro Seite und geben die Seite sofort wieder frei (page.cleanup()),
 * sodass auch Dokumente mit hunderttausenden Seiten verarbeitbar sind.
 */
const fs = require("fs");

let pdfjs = null;
function loadPdfjs() {
  if (!pdfjs) pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
  return pdfjs;
}

class PdfReader {
  constructor(pdfPath) {
    if (!fs.existsSync(pdfPath))
      throw new Error(`PDF nicht gefunden: ${pdfPath}`);
    this.pdfPath = pdfPath;
    this.doc = null;
  }

  async open() {
    const lib = loadPdfjs();
    const data = new Uint8Array(fs.readFileSync(this.pdfPath));
    this.doc = await lib.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    }).promise;
    return this.doc.numPages;
  }

  get numPages() {
    return this.doc ? this.doc.numPages : 0;
  }

  /**
   * Extrahiert Text einer einzelnen Seite (1-basiert) und räumt sofort auf.
   */
  async pageText(pageNumber) {
    const page = await this.doc.getPage(pageNumber);
    try {
      const content = await page.getTextContent();
      let lastY = null;
      let out = "";
      for (const item of content.items) {
        const y = item.transform ? item.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2)
          out += "\n";
        else if (out.length && !out.endsWith(" ") && !out.endsWith("\n"))
          out += " ";
        out += item.str;
        lastY = y;
      }
      return out.trim();
    } finally {
      page.cleanup();
    }
  }

  /**
   * Extrahiert einen Seitenbereich [from..to] (1-basiert, inklusiv).
   * Liefert { pages: [{ page, text }], text }.
   */
  async rangeText(from, to) {
    const pages = [];
    for (let p = from; p <= to; p++) {
      const text = await this.pageText(p);
      pages.push({ page: p, text });
    }
    return {
      pages,
      text: pages
        .map((p) => `\n--- [Seite ${p.page}] ---\n${p.text}`)
        .join("\n"),
    };
  }

  async close() {
    if (this.doc) {
      await this.doc.cleanup();
      await this.doc.destroy();
      this.doc = null;
    }
  }
}

/**
 * Partitioniert ein Dokument in synchronisierte Seiten-Chunks mit Überlappung.
 * Überlappung stellt sicher, dass Inhalte an Chunk-Grenzen von zwei Agenten
 * gesehen werden (Seiten-Synchronisierung über Grenzen hinweg).
 */
function buildChunkPlan(totalPages, pagesPerChunk, overlap) {
  const chunks = [];
  let start = 1;
  let index = 0;
  while (start <= totalPages) {
    const end = Math.min(start + pagesPerChunk - 1, totalPages);
    chunks.push({ index, pageStart: start, pageEnd: end });
    index++;
    if (end >= totalPages) break;
    start = end + 1 - overlap;
    if (start <= chunks[chunks.length - 1].pageStart) start = end + 1;
  }
  return chunks;
}

module.exports = { PdfReader, buildChunkPlan };
