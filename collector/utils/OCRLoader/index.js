// SPDX-License-Identifier: MIT
const { getStoragePath } = require("../paths");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { VALID_LANGUAGE_CODES } = require("./validLangs");

const OCR_MAX_BYTES = 5 * 1024 * 1024 * 1024;

// ─── NVIDIA NIM Vision API (Nemotron 3 Nano Omni 30B) ────────────────
//
// State-of-the-art PDF OCR via NVIDIA's cloud-hosted Nemotron 3 Nano Omni
// 30B multimodal model. The model natively handles OCR, document
// intelligence, tables, diagrams, and complex layouts — no separate OCR
// engine needed.
//
// API: OpenAI-compatible /v1/chat/completions at integrate.api.nvidia.com
// Auth: Bearer token (NVIDIA_NIM_API_KEY env var, free via build.nvidia.com)
// Input: Base64-encoded PNG images of PDF pages
// Output: Extracted text, preserving layout and reading order
//
// Benchmark: sub-second per page on NVIDIA's cloud GPUs (vs 2-10s/page
// with tesseract.js, ~188ms/page with PaddleOCR). No local model
// download, no CDN dependency, no worker bootstrap delay.

const NIM_BASE_URL =
  process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
const NIM_MODEL =
  process.env.NVIDIA_NIM_MODEL ||
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
const NIM_API_KEY = process.env.NVIDIA_NIM_API_KEY || "";
const NIM_TIMEOUT_MS = Number(process.env.NVIDIA_NIM_TIMEOUT_MS || 120_000);
const NIM_MAX_TOKENS = Number(process.env.NVIDIA_NIM_MAX_TOKENS || 4096);
const NIM_CONCURRENCY = Number(process.env.NVIDIA_NIM_CONCURRENCY || 4);

// Fallback: tesseract.js (only if NVIDIA NIM is unavailable/unconfigured)
const WORKER_BOOTSTRAP_TIMEOUT_MS =
  Number(process.env.OCR_WORKER_BOOTSTRAP_TIMEOUT_MS) || 60_000;
const OCR_LANG_PATH = process.env.OCR_TESSDATA_PATH || undefined;
const OCR_CORE_PATH = process.env.OCR_CORE_PATH || undefined;
const OCR_ENGINE = (process.env.OCR_ENGINE || "nim").toLowerCase(); // nim | tesseract

// OCR prompt: instruct the model to extract text faithfully
const OCR_PROMPT =
  "Extract ALL text from this document page image. " +
  "Return ONLY the raw text content, preserving layout, tables, and reading order. " +
  "No commentary, no analysis, no numbering — just the text as it appears in the image.";

// ─── NIM Vision client ───────────────────────────────────────────────

let _nimAvailable = null;
let _nimCheckedAt = 0;

/**
 * Checks if NVIDIA NIM API is configured and reachable.
 * @returns {Promise<boolean>}
 */
async function isNimAvailable() {
  if (!NIM_API_KEY) return false;
  // Cache for 60s
  if (_nimAvailable !== null && Date.now() - _nimCheckedAt < 60_000)
    return _nimAvailable;
  try {
    const res = await fetch(`${NIM_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${NIM_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    _nimAvailable = res.ok;
    _nimCheckedAt = Date.now();
    return _nimAvailable;
  } catch {
    _nimAvailable = false;
    _nimCheckedAt = Date.now();
    return false;
  }
}

/**
 * Runs OCR on a single image buffer via NVIDIA NIM Vision API.
 * @param {Buffer} imageBuffer - PNG/JPEG buffer of the page
 * @returns {Promise<string>} Extracted text
 */
async function nimOcrImage(imageBuffer) {
  const mime = "image/png";
  const b64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mime};base64,${b64}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NIM_TIMEOUT_MS);

  try {
    const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NIM_API_KEY}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: NIM_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: OCR_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: NIM_MAX_TOKENS,
        temperature: 0,
        top_k: 1,
        chat_template_kwargs: { enable_thinking: false },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`NIM API HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim() || "";
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs OCR on multiple image buffers in parallel via NIM.
 * @param {Buffer[]} imageBuffers
 * @returns {Promise<string[]>}
 */
async function nimOcrBatch(imageBuffers) {
  const results = new Array(imageBuffers.length).fill("");
  const batches = [];
  for (let i = 0; i < imageBuffers.length; i += NIM_CONCURRENCY) {
    batches.push(imageBuffers.slice(i, i + NIM_CONCURRENCY).map((buf, j) => ({
      idx: i + j,
      buf,
    })));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async ({ idx, buf }) => {
        try {
          return { idx, text: await nimOcrImage(buf) };
        } catch (e) {
          console.error(`[OCRLoader] NIM OCR error on image ${idx}: ${e.message}`);
          return { idx, text: "" };
        }
      })
    );
    for (const { idx, text } of batchResults) {
      results[idx] = text;
    }
  }
  return results;
}

// ─── Tesseract fallback (only if NIM unavailable) ────────────────────

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
            `Tesseract worker failed to initialize within ${
              WORKER_BOOTSTRAP_TIMEOUT_MS / 1000
            }s. Configure NVIDIA_NIM_API_KEY for state-of-the-art OCR.`
          )
        );
      }, WORKER_BOOTSTRAP_TIMEOUT_MS)
    ),
  ]);
}

// ─── OCRLoader class ─────────────────────────────────────────────────

class OCRLoader {
  language;
  cacheDir;

  constructor({ targetLanguages = "eng" } = {}) {
    this.language = this.parseLanguages(targetLanguages);
    this.cacheDir = getStoragePath("models", "tesseract");
    if (!fs.existsSync(this.cacheDir))
      fs.mkdirSync(this.cacheDir, { recursive: true });

    const engineLabel =
      OCR_ENGINE === "tesseract"
        ? "tesseract.js (fallback)"
        : NIM_API_KEY
          ? `NVIDIA NIM (${NIM_MODEL})`
          : "NIM (no API key — will fall back to tesseract)";

    this.log(
      `OCRLoader initialized — engine: ${engineLabel}, languages:`,
      this.language.map((lang) => VALID_LANGUAGE_CODES[lang]).join(", ")
    );
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
   * OCR a PDF document via NVIDIA NIM Vision API.
   * Each page is rendered to PNG (via sharp/pdfjs) and sent to the
   * Nemotron 3 Nano Omni model for text extraction.
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

    // ─── NVIDIA NIM Vision path ──────────────────────────────────
    if (OCR_ENGINE !== "tesseract") {
      const nimOk = await isNimAvailable();
      if (nimOk) {
        return await this._ocrPdfWithNim(
          pdfDocument,
          pdfjs,
          metadata,
          documentTitle,
          maxExecutionTime
        );
      }
      this.log(
        `NVIDIA NIM not available (${
          NIM_API_KEY ? "API unreachable" : "no API key set"
        }), falling back to tesseract.js`
      );
    }

    // ─── Tesseract fallback path ─────────────────────────────────
    return await this._ocrPdfWithTesseract(
      pdfDocument,
      pdfjs,
      metadata,
      documentTitle,
      { maxExecutionTime, batchSize, maxWorkers }
    );
  }

  /**
   * Fast PDF OCR via NVIDIA NIM Vision API (Nemotron 3 Nano Omni 30B).
   * Pages are rendered to PNG and sent to the cloud API in parallel batches.
   * @param {object} pdfDocument
   * @param {object} pdfjs
   * @param {object} metadata
   * @param {string} documentTitle
   * @param {number} maxExecutionTime
   * @returns {Promise<{pageContent: string, metadata: object}[]>}
   */
  async _ocrPdfWithNim(
    pdfDocument,
    pdfjs,
    metadata,
    documentTitle,
    maxExecutionTime
  ) {
    const totalPages = pdfDocument.numPages;
    const startTime = Date.now();
    const documents = [];

    this.log(`Using NVIDIA NIM Vision (${NIM_MODEL}) for ${totalPages} pages`);

    const pdfSharp = new PDFSharp({
      validOps: [
        pdfjs.OPS.paintJpegXObject,
        pdfjs.OPS.paintImageXObject,
        pdfjs.OPS.paintInlineImageXObject,
      ],
    });
    await pdfSharp.init();

    // Render pages to PNG and OCR in parallel batches
    const BATCH_SIZE = NIM_CONCURRENCY;
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

            const text = await nimOcrImage(imageBuffer);
            this.log(`✅ NIM OCR completed pg${pageNum}`);

            return {
              pageContent: text || "",
              metadata: {
                ...metadata,
                loc: { pageNumber: pageNum },
              },
            };
          } catch (e) {
            this.log(`NIM OCR error on pg${pageNum}: ${e.message}`);
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

    this.log(`Completed NIM OCR of ${documentTitle}!`, {
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
   * Legacy PDF OCR via tesseract.js. Only used when NIM is unavailable.
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

      this.log("Bootstrapping tesseract OCR (fallback) completed!", {
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
   * OCR a single image file via NVIDIA NIM Vision API.
   * @param {string} filePath
   * @param {{maxExecutionTime?: number}} options
   * @returns {Promise<string|null>}
   */
  async ocrImage(filePath, { maxExecutionTime = 300_000 } = {}) {
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

      // ─── NIM Vision path ───────────────────────────────────────
      if (OCR_ENGINE !== "tesseract") {
        const nimOk = await isNimAvailable();
        if (nimOk) {
          // Apply EXIF orientation if needed
          let imageBuffer = await fs.promises.readFile(filePath);
          try {
            const sharp = (await import("sharp")).default;
            imageBuffer = await sharp(filePath).rotate().png().toBuffer();
          } catch {}

          const text = await nimOcrImage(imageBuffer);
          this.log(`Completed NIM OCR of ${documentTitle}!`, {
            executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
          });
          return text || "";
        }
        this.log(`NIM not available, falling back to tesseract.js`);
      }

      // ─── Tesseract fallback ───────────────────────────────────
      let worker = null;
      let timeoutHandle = null;
      try {
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

        let content = "";
        const processImage = async () => {
          let recognizeInput = filePath;
          try {
            const sharp = (await import("sharp")).default;
            const oriented = await sharp(filePath).rotate().png().toBuffer();
            recognizeInput = oriented;
          } catch {}
          const { data } = await worker.recognize(recognizeInput, {}, "text");
          content = data.text;
        };

        await Promise.race([timeoutPromise, processImage()]);
        this.log(`Completed OCR of ${documentTitle}!`, {
          executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
        });
        return content;
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (worker) await worker.terminate();
      }
    } catch (e) {
      this.log(`Error: ${e.message}`);
      return null;
    }
  }

  async ocrImageBatch(filePaths = [], { maxExecutionTime = 600_000 } = {}) {
    if (!Array.isArray(filePaths) || filePaths.length === 0) return [];
    const results = new Array(filePaths.length).fill(null);

    // Validate files
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

    this.log(`Starting batch OCR of ${valid.length} images.`);
    const startTime = Date.now();

    // ─── NIM Vision path ───────────────────────────────────────
    if (OCR_ENGINE !== "tesseract") {
      const nimOk = await isNimAvailable();
      if (nimOk) {
        // Read and orient all images first
        const imageBuffers = await Promise.all(
          valid.map(async (idx) => {
            try {
              let buf = await fs.promises.readFile(filePaths[idx]);
              try {
                const sharp = (await import("sharp")).default;
                buf = await sharp(filePaths[idx]).rotate().png().toBuffer();
              } catch {}
              return buf;
            } catch {
              return null;
            }
          })
        );

        // OCR in parallel batches
        for (let b = 0; b < valid.length; b += NIM_CONCURRENCY) {
          const batchIndices = valid.slice(b, b + NIM_CONCURRENCY);
          const batchBuffers = imageBuffers.slice(b, b + NIM_CONCURRENCY);

          const batchResults = await Promise.all(
            batchBuffers.map(async (buf, j) => {
              if (!buf) return { idx: batchIndices[j], text: null };
              try {
                return { idx: batchIndices[j], text: await nimOcrImage(buf) };
              } catch (e) {
                this.log(`NIM batch error on ${filePaths[batchIndices[j]]}: ${e.message}`);
                return { idx: batchIndices[j], text: null };
              }
            })
          );

          for (const { idx, text } of batchResults) {
            results[idx] = text || "";
          }
        }

        this.log(`Completed NIM batch OCR.`, {
          processed: valid.length,
          executionTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
        });
        return results;
      }
      this.log(`NIM not available, falling back to tesseract.js`);
    }

    // ─── Tesseract fallback ───────────────────────────────────
    let worker = null;
    let timeoutHandle = null;
    try {
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
            } catch {}
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
