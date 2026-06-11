// SPDX-License-Identifier: MIT
/**
 * OCR-Fallback — Best Practice für gescannte PDFs ohne Text-Layer.
 *
 * Triage pro Seite (Intelligent Routing):
 *  - Liefert pdfjs genügend Text => programmatische Extraktion (schnell, exakt)
 *  - Liefert pdfjs (fast) nichts UND die Seite hat Render-Inhalt
 *    => Seite rastern (pdfjs + @napi-rs/canvas) und Tesseract-OCR
 *
 * Ein einziger Tesseract-Worker wird lazy initialisiert und wiederverwendet
 * (Worker-Spawn ist teuer); OCR-Aufrufe werden serialisiert, da der Worker
 * nicht thread-safe ist. Die parallelen Analyse-Agenten blockieren sich
 * dadurch nicht: nur Scan-Seiten landen in der OCR-Queue.
 */
const OCR_ENABLED = !/^false$/i.test(process.env.PDF_ANALYSIS_OCR || "true");
const OCR_LANGS = process.env.PDF_ANALYSIS_OCR_LANGS || "deu+eng";
const OCR_SCALE = Number(process.env.PDF_ANALYSIS_OCR_SCALE || 2.0);
// Unter dieser Zeichenzahl gilt eine Seite als "ohne Text-Layer"
const MIN_TEXT_CHARS = Number(process.env.PDF_ANALYSIS_OCR_MIN_CHARS || 16);

let workerPromise = null;
let ocrQueue = Promise.resolve();

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = require("tesseract.js");
      return await createWorker(OCR_LANGS);
    })();
  }
  return workerPromise;
}

/** Serialisiert OCR-Aufrufe über den einen Worker. */
function enqueueOcr(task) {
  const run = ocrQueue.then(task, task);
  ocrQueue = run.catch(() => {});
  return run;
}

/**
 * Rastert eine pdfjs-Seite zu PNG und führt OCR aus.
 * @param {Object} page pdfjs PDFPageProxy (noch nicht cleaned-up)
 * @returns {Promise<string>} erkannter Text
 */
async function ocrPage(page) {
  const { createCanvas } = require("@napi-rs/canvas");
  const viewport = page.getViewport({ scale: OCR_SCALE });
  const canvas = createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height)
  );
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  const png = canvas.toBuffer("image/png");

  return enqueueOcr(async () => {
    const worker = await getWorker();
    const {
      data: { text },
    } = await worker.recognize(png);
    return (text || "").trim();
  });
}

function needsOcr(extractedText) {
  if (!OCR_ENABLED) return false;
  return (extractedText || "").replace(/\s/g, "").length < MIN_TEXT_CHARS;
}

async function shutdownOcr() {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch {
    /* ignorieren */
  }
  workerPromise = null;
}

module.exports = { ocrPage, needsOcr, shutdownOcr };
