// SPDX-License-Identifier: MIT
// Purpose: Extract URLs from base64 image attachments using Tesseract OCR.
// Docs: server/utils/chats/extractImageUrls.doc.md
const crypto = require("crypto");

const OCR_ENABLED = !/^false$/i.test(
  process.env.CHAT_IMAGE_OCR_ENABLED ?? "true",
);
const OCR_LANGS = process.env.CHAT_IMAGE_OCR_LANGS ?? "deu+eng";
const MAX_CACHE_SIZE = Number(process.env.CHAT_IMAGE_OCR_CACHE_SIZE ?? 100);
const URL_REGEX = /https?:\/\/[^\s<>"{}|`^[\]]+/gi;

let workerPromise = null;
let ocrQueue = Promise.resolve();
const ocrCache = new Map(); // key: sha256(base64) -> { urls: string[], text: string }

/**
 * Lazily create and cache a single Tesseract worker for image OCR.
 * Worker creation is expensive, so we reuse it across the process lifetime.
 * @returns {Promise<object>} Tesseract worker
 */
async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = require("tesseract.js");
      return createWorker(OCR_LANGS);
    })().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

/**
 * Serialize OCR calls through a single worker queue.
 * Tesseract workers are not thread-safe, so calls must run sequentially.
 * @param {function} task - Async task returning the OCR result.
 * @returns {Promise<*>}
 */
function enqueueOcr(task) {
  const run = ocrQueue.then(task, task);
  ocrQueue = run.catch(() => {});
  return run;
}

/**
 * Strip a data-URI prefix and return the raw base64 payload.
 * @param {string} content
 * @returns {string}
 */
function stripDataUri(content) {
  if (typeof content !== "string") return "";
  const match = content.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : content;
}

/**
 * SHA-256 hash of a string, used as a cache key for image OCR results.
 * @param {string} content
 * @returns {string}
 */
function hashContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Find unique HTTP/HTTPS URLs in a string using a conservative regex.
 * Trailing punctuation is stripped to avoid capturing delimiters.
 * @param {string} text
 * @returns {string[]}
 */
function findUrls(text) {
  if (!text) return [];
  const matches = text.match(URL_REGEX) || [];
  const seen = new Set();
  const urls = [];
  for (const match of matches) {
    const url = match.trim().replace(/[.,;!?]+$/, "");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

/**
 * Keep the OCR cache within the configured size limit.
 * Evicts the oldest entry when the limit is exceeded.
 */
function trimCache() {
  if (ocrCache.size <= MAX_CACHE_SIZE) return;
  const oldest = ocrCache.keys().next().value;
  if (oldest) ocrCache.delete(oldest);
}

/**
 * Run OCR on a single base64 image and return any URLs found.
 * Results are cached by the image content hash to avoid repeated OCR.
 * @param {string} content - Base64 image string (with or without data URI prefix)
 * @returns {Promise<string[]>}
 */
async function extractUrlsFromImage(content) {
  if (!OCR_ENABLED) return [];
  const base64 = stripDataUri(content);
  if (!base64) return [];

  const hash = hashContent(base64);
  if (ocrCache.has(hash)) {
    return ocrCache.get(hash).urls;
  }

  return enqueueOcr(async () => {
    if (ocrCache.has(hash)) return ocrCache.get(hash).urls;
    try {
      const worker = await getWorker();
      const {
        data: { text },
      } = await worker.recognize(Buffer.from(base64, "base64"));
      const urls = findUrls(text);
      trimCache();
      ocrCache.set(hash, { urls, text: (text || "").trim() });
      return urls;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[extractImageUrls] OCR failed:", error.message);
      return [];
    }
  });
}

/**
 * Extract URLs from an array of base64 image strings.
 * Accepts raw base64 strings or attachment objects with a `contentString` field.
 * Processes images in parallel (serialized at the worker level) and returns
 * de-duplicated URLs in their original order.
 * @param {Array<string|{contentString: string}>} images
 * @returns {Promise<string[]>}
 */
async function extractImageUrls(images = []) {
  if (!Array.isArray(images) || images.length === 0) return [];

  const contents = images
    .map((img) => (img && typeof img === "object" ? img.contentString : img))
    .filter((content) => typeof content === "string" && content.length > 0);

  if (contents.length === 0) return [];

  const allUrls = await Promise.all(contents.map(extractUrlsFromImage));
  const seen = new Set();
  const urls = [];
  for (const batch of allUrls) {
    for (const url of batch) {
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

/**
 * Build a prompt instruction that tells the LLM/agent to ask the user whether
 * a URL detected in an uploaded image should be analyzed on the web.
 * @param {string[]} urls
 * @returns {string}
 */
function buildScreenshotUrlPrompt(urls = []) {
  if (!urls || urls.length === 0) return "";
  const list = urls.map((url) => `- ${url}`).join("\n");
  return [
    "Wenn der Benutzer eine Bildquelle mit URL hochlädt, frage kurz nach, ob die URL im Web analysiert werden soll. Bestätigung → nutze das Web-Browsing-Tool.",
    "",
    "Im hochgeladenen Bild wurde erkannt:",
    list,
    "",
    'Bitte frage den Benutzer: "Ich sehe in dem Bild eine URL: <url>. Soll ich diese Quelle zusätzlich im Web analysieren?"',
  ].join("\n");
}

module.exports = {
  extractImageUrls,
  buildScreenshotUrlPrompt,
};
