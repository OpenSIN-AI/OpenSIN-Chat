// SPDX-License-Identifier: MIT
const { getStoragePath } = require("../paths");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { VALID_LANGUAGE_CODES } = require("./validLangs");

const OCR_MAX_BYTES = 5 * 1024 * 1024 * 1024;

// How long to wait for an OCR engine to bootstrap before giving up.
// Configurable via env. Default 60s for tesseract CDN download, 10s for
// local PaddleOCR models.
const WORKER_BOOTSTRAP_TIMEOUT_MS =
  Number(process.env.OCR_WORKER_BOOTSTRAP_TIMEOUT_MS) || 60_000;

// Optional local paths for tesseract.js core/lang files (offline mode).
const OCR_LANG_PATH = process.env.OCR_TESSDATA_PATH || undefined;
const OCR_CORE_PATH = process.env.OCR_CORE_PATH || undefined;

// Which OCR engine to use. "paddle" (PP-OCRv5 via ppu-paddle-ocr) is
// 10-50x faster than tesseract.js and runs fully offline with bundled
// ONNX models. "tesseract" is the legacy fallback. "auto" tries paddle
// first and falls back to tesseract if ppu-paddle-ocr is not installed.
const OCR_ENGINE = (process.env.OCR_ENGINE || "auto").toLowerCase();

// Whether to pre-warm the OCR engine on collector startup. Eliminates
// the cold-start delay on the first upload.
const OCR_PREWARM = String(process.env.OCR_PREWARM || "true").toLowerCase() !== "false";

// ─── PaddleOCR (PP-OCRv5 via ONNX Runtime) ───────────────────────────
//
// ppu-paddle-ocr runs PP-OCRv5 models on ONNX Runtime in Node.js.
// Benchmark: ~188ms/page on Apple M1 (vs seconds with tesseract.js).
// Models are bundled locally — no CDN download, fully offline.
// 40+ languages including German (deu) and English (eng).

let _paddleOcrInstance = null;
let _paddleOcrInitPromise = null;

/**
 * Lazy-loads and caches a PaddleOcrService instance.
 * @returns {Promise<object|null>} The OCR service, or null if not available.
 */
async function getPaddleOcr() {
  if (_paddleOcrInstance) return _paddleOcrInstance;
  if (_paddleOcrInitPromise) return _paddleOcrInitPromise;

  _paddleOcrInitPromise = (async () => {
    try {
      const { PaddleOcrService } = require("ppu-paddle-ocr");
      const ocr = new PaddleOcrService();
      await ocr.initialize();
      _paddleOcrInstance = ocr;
      console.log(
        "\x1b[36m[OCRLoader]\x1b[0m PaddleOCR (PP-OCRv5) engine initialized successfully"
      );
      return _paddleOcrInstance;
    } catch (e) {
      console.log(
        `\x1b[33m[OCRLoader]\x1b[0m PaddleOCR not available (${e.message}), will use tesseract fallback`
      );
      return null;
    }
  })();

  const result = await _paddleOcrInitPromise;
  _paddleOcrInitPromise = null;
  return result;
}

/**
 * Check if PaddleOCR is available as the fast OCR engine.
 * @returns {Promise<boolean>}
 */
async function isPaddleAvailable() {
  if (OCR_ENGINE === "tesseract") return false;
  const instance = await getPaddleOcr();
  return instance !== null;
}

// ─── Tesseract fallback ──────────────────────────────────────────────

/**
 * Creates a tesseract.js worker bounded by WORKER_BOOTSTRAP_TIMEOUT_MS.
 * @param {string[]} languages
 * @param {string} cachePath
 * @returns {Promise<import("tesseract.js").Worker>}
 */
async function createTesseractWorkerWithTimeout(languages, cachePath) {
  const { createWorker, OEM } = require("tesseract.js");
  const workerOptions = { cachePath };
  if (OCR_LANG_PATH) workerOptions.langPath = OCR_LANG_PATH;
  if (OCR_CORE_PATH) workerOptions.corePath = OCR_CORE_PATH;

  let timedOut = false;
  const workerPromise = createWorker(languages, OEM.LSTM_ONLY, workerOptions);

  workerPromise
    .then((worker) => {
      if (timedOut) worker?.terminate?.().catch(() => {});
    })
    .catch(() => {});

  return await Promise.race([
    workerPromise,
    new Promise((_, reject) =>
      setTimeout(() => {
        timedOut = true;
        reject(
          new Error(
            `OCR engine failed to initialize within ${
              WORKER_BOOTSTRAP_TIMEOUT_MS / 1000
            }s. Set OCR_TESSDATA_PATH / OCR_CORE_PATH for offline deployments.`
          )
        );
      }, WORKER_BOOTSTRAP_TIMEOUT_MS)
    ),
  ]);
}

// ─── Unified OCR interface ───────────────────────────────────────────

/**
 * Runs OCR on a single image buffer using the best available engine.
 * @param {Buffer} imageBuffer
 * @returns {Promise<string>} Extracted text.
 */
async function ocrImageBuffer(imageBuffer) {
  // Try PaddleOCR first (10-50x faster)
  if (OCR_ENGINE !== "tesseract") {
    const paddle = await getPaddleOcr();
    if (paddle) {
      const { text } = await paddle.recognize(imageBuffer);
      return text || "";
    }
  }

  // Fall back to tesseract.js
  return null; // Signal caller to use tesseract path
}

// ─── OCRLoader class ─────────────────────────────────────────────────

class OCRLoader {
  /**
   * @type {string[]}
   */
  language;

  /**
   * @type {string}
   */
  cacheDir;

  /**
   * @param {Object} options
   * @param {string} options.targetLanguages - comma separated language codes
   */
  constructor({ targetLanguages = "eng" } = {}) {
    this.language = this.parseLanguages(targetLanguages);
    this.cacheDir = getStoragePath("models", "tesseract");

    if (!fs.existsSync(this.cacheDir))
      fs.mkdirSync(this.cacheDir, { recursive: true });

    this.log(
      `OCRLoader initialized with language support for:`,
      this.language.map((lang) => VALID_LANGUAGE_CODES[lang]).join(", ")
    );

    // Pre-warm PaddleOCR on construction if enabled
    if (OCR_PREWARM && OCR_ENGINE !== "tesseract") {
      getPaddleOcr().catch(() => {});
    }
  }

  parseLanguages(language = null) {
    try {
      if (!language || typeof language !== "string") return ["eng"];
      const langList = language
        .split(",")
        .map((lang) => (lang.trim() !== "" ? lang.trim() : null))
        .filter(Boolean)
        .filter((lang) => VALID_LANGUAGE_CODES.hasOwnProperty(lang));
      if (langList.length === 0) return ["eng"];
      return langList;
    } catch (e) {
      this.log(`Error parsing languages: ${e.message}`, e.stack);
      return ["eng"];
    }
  }

  log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[36m[OCRLoader]\x1b[0m ${text}`, ...args);
  }

  /**
   * OCR a PDF document. Uses PaddleOCR if available (10-50x faster than
   * tesseract.js), falls back to tesseract.js otherwise.
   * @param {string} filePath
   * @param {{maxExecutionTime?: number, batchSize?: number, maxWorkers?: number}} options
   * @returns {Promise<{pageContent: string, metadata: object}[]>}
   */
  async ocrPDF(
    filePath,
    { maxExecutionTime = 300_000, batchSize = 10, maxWorkers = null } = {}
  ) {
    if (
      !filePath ||
      !fs.existsSync(filePath) ||
      !fs.statSync(filePath).isFile()
    ) {
      this.log(`File ${filePath} does not exist. Skipping OCR.`);
      return [];
    }

    const documentTitle = path.basename(filePath);
    this.log(`Starting OCR of ${documentTitle}`);
    const pdfjs = await import("pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js");
    const fbStat = await fs.promises.stat(filePath).catch(() => null);
    if (fbStat && fbStat.size > OCR_MAX_BYTES) {
      this.log(
        `Refusing OCR of ${documentTitle}: ${fbStat.size} bytes exceeds ${OCR_MAX_BYTES} byte cap`
      );
      return [];
    }
    const buffer = await fs.promises.readFile(filePath);

    const pdfDocument = await pdfjs.getDocument({
      data: buffer,
      isEvalSupported: false,
    });

    const documents = [];
    const meta = await pdfDocument.getMetadata().catch(() => null);
    const metadata = {
      source: filePath,
      pdf: {
        version: "v2.0.550",
        info: meta?.info,
        metadata: meta?.metadata,
        totalPages: pdfDocument.numPages,
      },
    };

    // ─── PaddleOCR fast path ──────────────────────────────────────
    //
    // PaddleOCR is 10-50x faster than tesseract.js (188ms/page vs
    // seconds/page). It processes each page as an image via sharp
    // and runs PP-OCRv5 inference on ONNX Runtime. No CDN downloads,
    // no worker bootstrap delay, fully offline.

    if (OCR_ENGINE !== "tesseract") {
      const paddle = await getPaddleOcr();
      if (paddle) {
        return await this._ocrPdfWithPaddle(
          paddle,
          pdfDocument,
          pdfjs,
          metadata,
          documentTitle,
          maxExecutionTime
        );
      }
    }

    // ─── Tesseract fallback path ──────────────────────────────────

    return await this._ocrPdfWithTesseract(
      pdfDocument,
      pdfjs,
      metadata,
      documentTitle,
      { maxExecutionTime, batchSize, maxWorkers }
    );
  }

  /**
   * Fast PDF OCR using PaddleOCR (PP-OCRv5 on ONNX Runtime).
   * @param {object} paddle - PaddleOcrService instance
   * @param {object} pdfDocument - pdfjs document proxy
   * @param {object} pdfjs - pdfjs module
   * @param {object} metadata - metadata template
   * @param {string} documentTitle
   * @param {number} maxExecutionTime
   * @returns {Promise<{pageContent: string, metadata: object}[]>}
   */
  async _ocrPdfWithPaddle(
    paddle,
    pdfDocument,
    pdfjs,
    metadata,
    documentTitle,
    maxExecutionTime
  ) {
    const totalPages = pdfDocument.numPages;
    const startTime = Date.now();
    const documents = [];

    this.log(`Using PaddleOCR (PP-OCRv5) for ${totalPages} pages`);

    const pdfSharp = new PDFSharp({
      validOps: [
        pdfjs.OPS.paintJpegXObject,
        pdfjs.OPS.paintImageXObject,
        pdfjs.OPS.paintInlineImageXObject,
      ],
    });
    await pdfSharp.init();

    // Process pages in parallel batches for maximum throughput.
    // PaddleOCR is fast enough that we can use larger batches.
    const BATCH_SIZE = 16;
    const pageNumbers = Array.from({ length: totalPages }, (_, k) => k + 1);

    for (let b = 0; b < pageNumbers.length; b += BATCH_SIZE) {
      if (Date.now() - startTime > maxExecutionTime) {
        this.log(
          `OCR timeout reached at page ${b + 1}/${totalPages}, returning partial results`
        );
        break;
      }

      const batch = pageNumbers.slice(b, b + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (pageNum) => {
          try {
            const page = await pdfDocument.getPage(pageNum);
            const imageBuffer = await pdfSharp.pageToBuffer({ page });
            if (!imageBuffer) return null;

            const { text } = await paddle.recognize(imageBuffer);
            this.log(`✅ PaddleOCR completed pg${pageNum}`);

            return {
              pageContent: text || "",
              metadata: {
                ...metadata,
                loc: { pageNumber: pageNum },
              },
            };
          } catch (e) {
            this.log(`PaddleOCR error on pg${pageNum}: ${e.message}`);
            return null;
          }
        })
      );

      for (const result of batchResults) {
        if (result && result.pageContent?.trim()) {
          documents.push(result);
        }
      }
    }

    this.log(`Completed PaddleOCR of ${documentTitle}!`, {
      documentsParsed: documents.length,
      totalPages,
      executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
    });

    return documents.sort(
      (a, b) =>
        (a?.metadata?.loc?.pageNumber || 0) -
        (b?.metadata?.loc?.pageNumber || 0)
    );
  }

  /**
   * Legacy PDF OCR using tesseract.js. Used when PaddleOCR is not available.
   * @param {object} pdfDocument
   * @param {object} pdfjs
   * @param {object} metadata
   * @param {string} documentTitle
   * @param {{maxExecutionTime: number, batchSize: number, maxWorkers: number}} opts
   * @returns {Promise<{pageContent: string, metadata: object}[]>}
   */
  async _ocrPdfWithTesseract(
    pdfDocument,
    pdfjs,
    metadata,
    documentTitle,
    { maxExecutionTime, batchSize, maxWorkers }
  ) {
    const BATCH_SIZE = batchSize;
    const MAX_EXECUTION_TIME = maxExecutionTime;
    const NUM_WORKERS = Math.min(maxWorkers ?? os.cpus().length, 4);
    const totalPages = pdfDocument.numPages;
    let workerPool = [];
    let timeoutHandle = null;
    const savedGlobalImage = global.Image;
    const startTime = Date.now();
    const documents = [];

    try {
      const workerResults = await Promise.allSettled(
        Array(NUM_WORKERS)
          .fill(0)
          .map(() =>
            createTesseractWorkerWithTimeout(this.language, this.cacheDir)
          )
      );
      workerPool = workerResults
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
      if (workerPool.length === 0) {
        const firstError = workerResults.find(
          (r) => r.status === "rejected"
        )?.reason?.message;
        throw new Error(
          firstError
            ? `Failed to create any OCR workers: ${firstError}`
            : "Failed to create any OCR workers"
        );
      }

      this.log("Bootstrapping tesseract OCR completed successfully!", {
        MAX_EXECUTION_TIME_MS: MAX_EXECUTION_TIME,
        BATCH_SIZE,
        MAX_CONCURRENT_WORKERS: NUM_WORKERS,
        TOTAL_PAGES: totalPages,
      });

      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new Error(
              `OCR job took too long to complete (${
                MAX_EXECUTION_TIME / 1000
              } seconds)`
            )
          );
        }, MAX_EXECUTION_TIME);
      });

      const pdfSharp = new PDFSharp({
        validOps: [
          pdfjs.OPS.paintJpegXObject,
          pdfjs.OPS.paintImageXObject,
          pdfjs.OPS.paintInlineImageXObject,
        ],
      });
      await pdfSharp.init();

      const processPages = async () => {
        for (
          let startPage = 1;
          startPage <= totalPages;
          startPage += BATCH_SIZE
        ) {
          const endPage = Math.min(startPage + BATCH_SIZE - 1, totalPages);
          const pageNumbers = Array.from(
            { length: endPage - startPage + 1 },
            (_, i) => startPage + i
          );
          this.log(`Working on pages ${startPage} - ${endPage}`);

          const pageQueue = [...pageNumbers];
          const results = [];
          const workerPromises = workerPool.map(async (worker, workerIndex) => {
            while (pageQueue.length > 0) {
              const pageNum = pageQueue.shift();
              try {
                const page = await pdfDocument.getPage(pageNum);
                const imageBuffer = await pdfSharp.pageToBuffer({ page });
                if (!imageBuffer) continue;
                const { data } = await worker.recognize(
                  imageBuffer,
                  {},
                  "text"
                );
                results.push({
                  pageContent: data.text,
                  metadata: {
                    ...metadata,
                    loc: { pageNumber: pageNum },
                  },
                });
              } catch (pageErr) {
                this.log(
                  `[Worker ${workerIndex + 1}] error on pg${pageNum}: ${pageErr.message}`
                );
              }
            }
          });

          await Promise.all(workerPromises);
          documents.push(
            ...results.sort(
              (a, b) => a.metadata.loc.pageNumber - b.metadata.loc.pageNumber
            )
          );
        }
        return documents;
      };

      const pagesPromise = processPages().catch(() => {});
      await Promise.race([timeoutPromise, pagesPromise]);
    } catch (e) {
      this.log(`Error: ${e.message}`, e.stack);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      global.Image = savedGlobalImage;
      await Promise.all(workerPool.map((worker) => worker.terminate()));
    }

    this.log(`Completed OCR of ${documentTitle}!`, {
      documentsParsed: documents.length,
      totalPages,
      executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
    });
    return documents;
  }

  /**
   * OCR a single image file.
   * @param {string} filePath
   * @param {{maxExecutionTime?: number}} options
   * @returns {Promise<string|null>}
   */
  async ocrImage(filePath, { maxExecutionTime = 300_000 } = {}) {
    let content = "";
    let worker = null;
    let timeoutHandle = null;
    if (
      !filePath ||
      !fs.existsSync(filePath) ||
      !fs.statSync(filePath).isFile()
    ) {
      this.log(`File ${filePath} does not exist. Skipping OCR.`);
      return null;
    }

    const imgStat = fs.statSync(filePath);
    if (imgStat.size > OCR_MAX_BYTES) {
      this.log(
        `Refusing OCR of ${filePath}: ${imgStat.size} bytes exceeds ${OCR_MAX_BYTES} byte cap`
      );
      return null;
    }

    const documentTitle = path.basename(filePath);
    try {
      this.log(`Starting OCR of ${documentTitle}`);
      const startTime = Date.now();

      // ─── PaddleOCR fast path ──────────────────────────────────
      if (OCR_ENGINE !== "tesseract") {
        const paddle = await getPaddleOcr();
        if (paddle) {
          // Apply EXIF orientation if needed
          let recognizeInput = filePath;
          try {
            const sharp = (await import("sharp")).default;
            const oriented = await sharp(filePath).rotate().png().toBuffer();
            recognizeInput = oriented;
          } catch {}

          const { text } = await paddle.recognize(recognizeInput);
          this.log(`Completed PaddleOCR of ${documentTitle}!`, {
            executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
          });
          return text || "";
        }
      }

      // ─── Tesseract fallback ───────────────────────────────────
      worker = await createTesseractWorkerWithTimeout(
        this.language,
        this.cacheDir
      );

      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new Error(
              `OCR job took too long to complete (${
                maxExecutionTime / 1000
              } seconds)`
            )
          );
        }, maxExecutionTime);
      });

      const processImage = async () => {
        let recognizeInput = filePath;
        try {
          const sharp = (await import("sharp")).default;
          const oriented = await sharp(filePath).rotate().png().toBuffer();
          recognizeInput = oriented;
          this.log(`Applied EXIF auto-orientation for ${documentTitle}`);
        } catch {
          this.log(
            `EXIF pre-processing skipped for ${documentTitle} (unsupported format or sharp unavailable)`
          );
        }
        const { data } = await worker.recognize(recognizeInput, {}, "text");
        content = data.text;
      };

      await Promise.race([timeoutPromise, processImage()]);
      this.log(`Completed OCR of ${documentTitle}!`, {
        executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
      });

      return content;
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return null;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (worker) await worker.terminate();
    }
  }

  async ocrImageBatch(filePaths = [], { maxExecutionTime = 600_000 } = {}) {
    if (!Array.isArray(filePaths) || filePaths.length === 0) return [];
    let worker = null;
    let timeoutHandle = null;
    const results = new Array(filePaths.length).fill(null);
    try {
      const valid = [];
      for (let i = 0; i < filePaths.length; i += 1) {
        const filePath = filePaths[i];
        if (
          !filePath ||
          !fs.existsSync(filePath) ||
          !fs.statSync(filePath).isFile()
        ) {
          results[i] = null;
          continue;
        }
        try {
          const st = fs.statSync(filePath);
          if (st.size > OCR_MAX_BYTES) {
            this.log(
              `Refusing batch OCR of ${filePath}: ${st.size} bytes exceeds ${OCR_MAX_BYTES} byte cap`
            );
            results[i] = null;
            continue;
          }
        } catch {
          results[i] = null;
          continue;
        }
        valid.push(i);
      }
      if (valid.length === 0) return results;

      this.log(
        `Starting batch OCR of ${valid.length} images.`
      );
      const startTime = Date.now();

      // ─── PaddleOCR fast path ──────────────────────────────────
      if (OCR_ENGINE !== "tesseract") {
        const paddle = await getPaddleOcr();
        if (paddle) {
          for (const idx of valid) {
            try {
              let recognizeInput = filePaths[idx];
              try {
                const sharp = (await import("sharp")).default;
                const oriented = await sharp(filePaths[idx])
                  .rotate()
                  .png()
                  .toBuffer();
                recognizeInput = oriented;
              } catch {}
              const { text } = await paddle.recognize(recognizeInput);
              results[idx] = text || "";
            } catch (e) {
              this.log(`PaddleOCR batch error on ${filePaths[idx]}: ${e.message}`);
              results[idx] = null;
            }
          }
          this.log(`Completed PaddleOCR batch.`, {
            processed: valid.length,
            executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
          });
          return results;
        }
      }

      // ─── Tesseract fallback ───────────────────────────────────
      worker = await createTesseractWorkerWithTimeout(
        this.language,
        this.cacheDir
      );

      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new Error(
              `OCR batch took too long to complete (${
                maxExecutionTime / 1000
              } seconds)`
            )
          );
        }, maxExecutionTime);
      });

      const processQueue = async () => {
        for (const idx of valid) {
          try {
            let recognizeInput = filePaths[idx];
            try {
              const sharp = (await import("sharp")).default;
              const oriented = await sharp(filePaths[idx])
                .rotate()
                .png()
                .toBuffer();
              recognizeInput = oriented;
            } catch {
              this.log(
                `EXIF pre-processing skipped for ${filePaths[idx]} (unsupported format or sharp unavailable)`
              );
            }
            const { data } = await worker.recognize(recognizeInput, {}, "text");
            results[idx] = data.text;
          } catch (e) {
            this.log(`Batch OCR error on ${filePaths[idx]}: ${e.message}`);
            results[idx] = null;
          }
        }
      };

      await Promise.race([timeoutPromise, processQueue()]);
      this.log(`Completed batch OCR.`, {
        processed: valid.length,
        executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
      });
      return results;
    } catch (e) {
      this.log(`Batch OCR error: ${e.message}`);
      return results;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (worker) await worker.terminate();
    }
  }
}

// ─── PDFSharp: converts PDF pages to image buffers ───────────────────

class PDFSharp {
  constructor({ validOps = [] } = {}) {
    this.sharp = null;
    this.validOps = validOps;
  }

  log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[36m[PDFSharp]\x1b[0m ${text}`, ...args);
  }

  async init() {
    this.sharp = (await import("sharp")).default;
  }

  async pageToBuffer({ page }) {
    if (!this.sharp) await this.init();
    try {
      this.log(`Converting page ${page.pageNumber} to image...`);
      const ops = await page.getOperatorList();
      const pageImages = ops.fnArray.length;

      for (let i = 0; i < pageImages; i++) {
        try {
          if (!this.validOps.includes(ops.fnArray[i])) continue;

          const name = ops.argsArray[i][0];
          const img = await page.objs.get(name);
          if (!img || !img.data || typeof img.data.length !== "number") {
            this.log(`Iteration error: image ${name} has no data buffer`);
            continue;
          }
          const { width, height } = img;
          const size = img.data.length;
          if (!(size > 0) || !(width > 0) || !(height > 0)) {
            this.log(
              `Iteration error: image ${name} has invalid dimensions (size=${size}, width=${width}, height=${height})`
            );
            continue;
          }
          const channels = Math.round(size / width / height);
          if (![1, 2, 3, 4].includes(channels)) {
            this.log(
              `Iteration error: image ${name} has invalid channel count (${channels}, size=${size}, width=${width}, height=${height})`
            );
            continue;
          }
          const targetDPI = 70;
          const targetWidth = Math.floor(width * (targetDPI / 72));
          const targetHeight = Math.floor(height * (targetDPI / 72));

          const image = this.sharp(img.data, {
            raw: { width, height, channels },
            density: targetDPI,
          })
            .resize({
              width: targetWidth,
              height: targetHeight,
              fit: "fill",
            })
            .withMetadata({
              density: targetDPI,
              resolution: targetDPI,
            })
            .png();

          return await image.toBuffer();
        } catch (error) {
          this.log(`Iteration error: ${error.message}`, error.stack);
          continue;
        }
      }
      this.log(`No valid images found on page ${page.pageNumber}`);
      return null;
    } catch (error) {
      this.log(`Error: ${error.message}`, error.stack);
      return null;
    }
  }
}

module.exports = OCRLoader;
