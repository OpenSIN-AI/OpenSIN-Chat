// SPDX-License-Identifier: MIT
const { getStoragePath } = require("../paths");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { VALID_LANGUAGE_CODES } = require("./validLangs");

const OCR_MAX_BYTES = 5 * 1024 * 1024 * 1024;

class OCRLoader {
  /**
   * The language code(s) to use for the OCR.
   * @type {string[]}
   */
  language;
  /**
   * The cache directory for the OCR.
   * @type {string}
   */
  cacheDir;

  /**
   * The constructor for the OCRLoader.
   * @param {Object} options - The options for the OCRLoader.
   * @param {string} options.targetLanguages - The target languages to use for the OCR as a comma separated string. eg: "eng,deu,..."
   */
  constructor({ targetLanguages = "eng" } = {}) {
    this.language = this.parseLanguages(targetLanguages);
    this.cacheDir = getStoragePath("models", "tesseract");

    // Ensure the cache directory exists or else Tesseract will persist the cache in the default location.
    if (!fs.existsSync(this.cacheDir))
      fs.mkdirSync(this.cacheDir, { recursive: true });
    this.log(
      `OCRLoader initialized with language support for:`,
      this.language.map((lang) => VALID_LANGUAGE_CODES[lang]).join(", ")
    );
  }

  /**
   * Parses the language code from a provided comma separated string of language codes.
   * @param {string} language - The language code to parse.
   * @returns {string[]} The parsed language code.
   */
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
   * Loads a PDF file and returns an array of documents.
   * This function is reserved to parsing for SCANNED documents - digital documents are not supported in this function
   * @returns {Promise<{pageContent: string, metadata: object}[]>} An array of documents with page content and metadata.
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

    const pdfSharp = new PDFSharp({
      validOps: [
        pdfjs.OPS.paintJpegXObject,
        pdfjs.OPS.paintImageXObject,
        pdfjs.OPS.paintInlineImageXObject,
      ],
    });
    await pdfSharp.init();

    const { createWorker, OEM } = require("tesseract.js");
    const BATCH_SIZE = batchSize;
    const MAX_EXECUTION_TIME = maxExecutionTime;
    const NUM_WORKERS = Math.min(maxWorkers ?? os.cpus().length, 4);
    const totalPages = pdfDocument.numPages;
    let workerPool = [];
    let timeoutHandle = null;
    const savedGlobalImage = global.Image;
    const startTime = Date.now();
    try {
      const workerResults = await Promise.allSettled(
        Array(NUM_WORKERS)
          .fill(0)
          .map(() =>
            createWorker(this.language, OEM.LSTM_ONLY, {
              cachePath: this.cacheDir,
            })
          )
      );
      workerPool = workerResults
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
      if (workerPool.length === 0)
        throw new Error("Failed to create any OCR workers");

      this.log("Bootstrapping OCR completed successfully!", {
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
              this.log(
                `\x1b[34m[Worker ${
                  workerIndex + 1
                }]\x1b[0m assigned pg${pageNum}`
              );
              try {
                const page = await pdfDocument.getPage(pageNum);
                const imageBuffer = await pdfSharp.pageToBuffer({ page });
                if (!imageBuffer) continue;
                const { data } = await worker.recognize(
                  imageBuffer,
                  {},
                  "text"
                );
                this.log(
                  `✅ \x1b[34m[Worker ${
                    workerIndex + 1
                  }]\x1b[0m completed pg${pageNum}`
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
                  `\x1b[31m[Worker ${
                    workerIndex + 1
                  }]\x1b[0m error on pg${pageNum}: ${pageErr.message}`
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
      totalPages: totalPages,
      executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
    });
    return documents;
  }

  /**
   * Loads an image file and returns the OCRed text.
   * @param {string} filePath - The path to the image file.
   * @param {Object} options - The options for the OCR.
   * @param {number} options.maxExecutionTime - The maximum execution time of the OCR in milliseconds.
   * @returns {Promise<string>} The OCRed text.
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
      const { createWorker, OEM } = require("tesseract.js");
      worker = await createWorker(this.language, OEM.LSTM_ONLY, {
        cachePath: this.cacheDir,
      });

      // Race the timeout with the OCR
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
        `Starting batch OCR of ${valid.length} images with 1 shared worker.`
      );
      const startTime = Date.now();
      const { createWorker, OEM } = require("tesseract.js");
      worker = await createWorker(this.language, OEM.LSTM_ONLY, {
        cachePath: this.cacheDir,
      });

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

/**
 * Converts a PDF page to a buffer using Sharp.
 * @param {Object} options - The options for the Sharp PDF page object.
 * @param {Object} options.page - The PDFJS page proxy object.
 * @returns {Promise<Buffer>} The buffer of the page.
 */
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

  /**
   * Converts a PDF page to a buffer.
   * @param {Object} options - The options for the Sharp PDF page object.
   * @param {Object} options.page - The PDFJS page proxy object.
   * @returns {Promise<Buffer>} The buffer of the page.
   */
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

          // For debugging purposes
          // await image.toFile(getStoragePath(`pg${page.pageNumber}.png`));
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
