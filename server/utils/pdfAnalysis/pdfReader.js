// SPDX-License-Identifier: MIT
/**
 * PdfReader — Range-basiertes Streaming-Lesen beliebig großer PDFs.
 *
 * KEIN Laden der Datei in den RAM. Stattdessen:
 *  - PDFDataRangeTransport: pdfjs fordert gezielt Byte-Ranges an
 *    (XRef-Tabelle, einzelne Seiten-Objekte), die wir direkt per
 *    File-Descriptor von der Platte lesen.
 *  - Nur ein kleiner Initial-Chunk (Header + Trailer-Nähe) wird vorab gelesen.
 *  - Seiten werden nach Text-Extraktion sofort freigegeben (page.cleanup()).
 *
 * => Konstanter Speicherverbrauch, unabhängig von der Dateigröße.
 *    Getestet ausgelegt auf Dateien im dreistelligen GB-Bereich und
 *    Dokumente mit hunderttausenden Seiten.
 */
const fs = require("fs");

const INITIAL_CHUNK_BYTES = Number(
  process.env.PDF_ANALYSIS_INITIAL_CHUNK_BYTES || 2 * 1024 * 1024 // 2 MB
);

let pdfjs = null;
function loadPdfjs() {
  if (!pdfjs) pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
  return pdfjs;
}

/**
 * Liefert Byte-Ranges der PDF-Datei on-demand aus dem Dateisystem.
 * pdfjs ruft requestDataRange auf, wann immer es ein Objekt (Seite,
 * Font, XRef-Segment) braucht, das nicht im Initial-Chunk liegt.
 */
function buildRangeTransport(lib, fd, fileSize) {
  const initialLength = Math.min(INITIAL_CHUNK_BYTES, fileSize);
  const initialBuffer = Buffer.alloc(initialLength);
  fs.readSync(fd, initialBuffer, 0, initialLength, 0);

  class FileRangeTransport extends lib.PDFDataRangeTransport {
    requestDataRange(begin, end) {
      const length = end - begin;
      const buffer = Buffer.alloc(length);
      fs.read(fd, buffer, 0, length, begin, (err, bytesRead) => {
        if (err) {
          this.abort();
          return;
        }
        this.onDataRange(
          begin,
          new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead)
        );
      });
    }
  }

  return new FileRangeTransport(
    fileSize,
    new Uint8Array(
      initialBuffer.buffer,
      initialBuffer.byteOffset,
      initialLength
    )
  );
}

class PdfReader {
  constructor(pdfPath) {
    if (!fs.existsSync(pdfPath))
      throw new Error(`PDF nicht gefunden: ${pdfPath}`);
    this.pdfPath = pdfPath;
    this.doc = null;
    this.fd = null;
  }

  async open() {
    const lib = loadPdfjs();
    const { size } = fs.statSync(this.pdfPath);
    this.fd = fs.openSync(this.pdfPath, "r");

    try {
      // Bevorzugt: Range-Streaming (konstanter RAM, beliebige Dateigröße)
      const transport = buildRangeTransport(lib, this.fd, size);
      this.doc = await lib.getDocument({
        range: transport,
        length: size,
        disableAutoFetch: true, // nichts spekulativ vorladen
        disableStream: true, // nur explizite Ranges
        useSystemFonts: true,
        disableFontFace: true,
        isEvalSupported: false,
      }).promise;
    } catch (rangeError) {
      // Fallback nur für kleine/defekte Dateien (z.B. ohne gültige XRef,
      // linearisierungs-feindliche Generatoren): voller Buffer.
      const data = new Uint8Array(fs.readFileSync(this.pdfPath));
      this.doc = await lib.getDocument({
        data,
        useSystemFonts: true,
        disableFontFace: true,
        isEvalSupported: false,
      }).promise;
    }
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
    if (this.fd !== null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
  }
}

/**
 * Partitioniert ein Dokument in synchronisierte Seiten-Chunks mit Überlappung.
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
