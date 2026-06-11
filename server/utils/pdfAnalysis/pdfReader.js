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
const { ocrPage, needsOcr } = require("./ocr");
const { describeImage } = require("./visionAgent");
const { deepScanPage } = require("./deepScan");

const VISION_MIN_IMAGE_AREA = Number(
  process.env.PDF_ANALYSIS_VISION_MIN_AREA || 0.08 // Bildfläche >= 8% der Seite
);
const VISION_MAX_PAGES_PER_CHUNK = Number(
  process.env.PDF_ANALYSIS_VISION_MAX_PER_CHUNK || 3 // Kostendeckel pro Chunk
);

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
  constructor(pdfPath, { deepScan = false } = {}) {
    if (!fs.existsSync(pdfPath))
      throw new Error(`PDF nicht gefunden: ${pdfPath}`);
    this.pdfPath = pdfPath;
    this.deepScan = deepScan;
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
   * Extrahiert Text einer einzelnen Seite (1-basiert) mit Triage:
   *  1. Programmatische Extraktion (Text-Layer)
   *  2. OCR-Fallback, falls die Seite (nahezu) keinen Text-Layer hat
   * Markiert OCR-Seiten, damit nachgelagerte Stufen (z.B. der deterministische
   * Zitat-Verifier) die geringere Zeichengenauigkeit berücksichtigen können.
   */
  async pageText(pageNumber) {
    // Deep-Scan-Modus: Seite komplett visuell lesen (MiniCPM-V lokal).
    // Fallback auf Text-Layer/OCR, falls das lokale Modell nicht antwortet.
    if (this.deepScan) {
      try {
        const scanned = await deepScanPage(this.doc, pageNumber);
        if (scanned) {
          this.deepScannedPages = this.deepScannedPages || new Set();
          this.deepScannedPages.add(pageNumber);
          return scanned;
        }
      } catch {
        /* Fallback auf normalen Pfad */
      }
    }

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
      out = out.trim();

      // Triage: kein Text-Layer => gescannte Seite => OCR-Fallback
      if (needsOcr(out)) {
        try {
          const ocrText = await ocrPage(page);
          if (ocrText) {
            this.ocrPages = this.ocrPages || new Set();
            this.ocrPages.add(pageNumber);
            return ocrText;
          }
        } catch {
          /* OCR fehlgeschlagen — mit (leerem) Extraktionstext weiterarbeiten */
        }
      }
      return out;
    } finally {
      page.cleanup();
    }
  }

  /** True, wenn die Seite per OCR gelesen wurde (geringere Zeichen-Treue). */
  wasOcrPage(pageNumber) {
    return !!(this.ocrPages && this.ocrPages.has(pageNumber));
  }

  /**
   * Triage: Hat die Seite signifikante Bildinhalte? Prüft die Operator-Liste
   * (paintImageXObject) — deterministisch und billig, KEIN Rendern nötig.
   * Kleine Logos/Icons unterhalb der Flächenschwelle werden ignoriert.
   */
  async pageHasSignificantImages(pageNumber) {
    const lib = loadPdfjs();
    const page = await this.doc.getPage(pageNumber);
    try {
      const ops = await page.getOperatorList();
      const viewport = page.getViewport({ scale: 1.0 });
      const pageArea = viewport.width * viewport.height;
      let imageCount = 0;
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (
          ops.fnArray[i] === lib.OPS.paintImageXObject ||
          ops.fnArray[i] === lib.OPS.paintInlineImageXObject
        ) {
          imageCount++;
        }
      }
      // Konservativ: jedes Bild zählt mit Mindestfläche
      const imageArea = imageCount * pageArea * 0.05;
      return imageArea / pageArea >= VISION_MIN_IMAGE_AREA;
    } catch {
      return false;
    } finally {
      page.cleanup();
    }
  }

  /**
   * Rendert eine Seite zu PNG und lässt sie vom Vision-Agenten beschreiben.
   * Wird NUR für Seiten mit signifikantem Bildanteil aufgerufen (Triage).
   */
  async pageVisionDescription(pageNumber) {
    const { createCanvas } = require("@napi-rs/canvas");
    const page = await this.doc.getPage(pageNumber);
    try {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height)
      );
      await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport,
      }).promise;
      return await describeImage(
        canvas.toBuffer("image/png"),
        `Seite ${pageNumber} eines PDF-Dokuments (enthält Grafiken/Diagramme/Fotos)`
      );
    } finally {
      page.cleanup();
    }
  }

  /**
   * Extrahiert einen Seitenbereich [from..to] (1-basiert, inklusiv).
   * Markiert leere Seiten, OCR-Seiten und Vision-Seiten explizit.
   */
  async rangeText(from, to) {
    const pages = [];
    let visionBudget = VISION_MAX_PAGES_PER_CHUNK;
    for (let p = from; p <= to; p++) {
      const text = await this.pageText(p);
      let media = null;
      try {
        if (visionBudget > 0 && (await this.pageHasSignificantImages(p))) {
          media = await this.pageVisionDescription(p);
          if (media) {
            visionBudget--;
            this.visionPages = this.visionPages || new Set();
            this.visionPages.add(p);
          }
        }
      } catch {
        /* Vision optional — Text-Analyse läuft immer weiter */
      }
      pages.push({
        page: p,
        text,
        ocr: this.wasOcrPage(p),
        media,
      });
    }
    return {
      pages,
      text: pages
        .map((p) => {
          const marker = p.ocr ? " (OCR)" : "";
          const body = p.text || "[leere Seite — kein Textinhalt]";
          const mediaBlock = p.media
            ? `\n[BILDINHALT Seite ${p.page} — visuelle Analyse]\n${p.media}`
            : "";
          return `\n--- [Seite ${p.page}${marker}] ---\n${body}${mediaBlock}`;
        })
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
