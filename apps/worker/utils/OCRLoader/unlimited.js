// SPDX-License-Identifier: MIT
// OpenAI-compatible client for Baidu Unlimited-OCR (MIT licensed).

const DEFAULT_BACKEND = "vllm";
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_TIMEOUT_MS = 1_200_000;
const DEFAULT_PAGES_PER_REQUEST = 8;

const BACKEND_DEFAULTS = {
  vllm: {
    baseUrl: "http://127.0.0.1:8000/v1",
    model: "baidu/Unlimited-OCR",
    singlePrompt: "<image>document parsing.",
    multiPrompt: "<image>Multi page parsing.",
  },
  sglang: {
    baseUrl: "http://127.0.0.1:10000/v1",
    model: "Unlimited-OCR",
    singlePrompt: "document parsing.",
    multiPrompt: "Multi page parsing.",
  },
};

function normalizeBaseUrl(value, fallback = BACKEND_DEFAULTS.vllm.baseUrl) {
  return String(value || fallback).replace(/\/+$/, "");
}

function positiveInteger(value, fallback, { min = 1, max = Infinity } = {}) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max)
    return fallback;
  return parsed;
}

function parseExtraBody(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

/**
 * vLLM emits grounding text and coordinate boxes as special tokens. Preserve
 * the referenced text while dropping detector coordinates from searchable
 * Markdown. SGLang/Transformers output is unaffected when these tokens are
 * absent.
 */
function cleanOcrText(value) {
  return String(value || "")
    .replace(/<\|ref\|>([\s\S]*?)<\|\/ref\|>/g, "$1")
    .replace(/<\|det\|>[\s\S]*?<\|\/det\|>/g, "")
    .replace(/<\|(?:grounding|endofsentence)\|>/g, "")
    .trim();
}

function contentToText(data) {
  const responseContent = data?.choices?.[0]?.message?.content;
  if (typeof responseContent === "string") return cleanOcrText(responseContent);
  if (!Array.isArray(responseContent)) return "";
  return cleanOcrText(
    responseContent
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.text?.value === "string") return part.text.value;
        return "";
      })
      .join(""),
  );
}

const PAGE_MARKER_RE =
  /(?:^|\n)\s*(?:<!--\s*)?(?:\[\s*)?PAGE\s*[:#-]?\s*(\d+)(?:\s*\])?(?:\s*-->)?\s*(?=\n|$)/gim;

/**
 * Split a multi-page response using markers such as `[PAGE:12]` or
 * `<!-- PAGE:12 -->`. If a server renumbers a chunk from 1, the result is
 * remapped positionally to the requested absolute PDF page numbers.
 */
function splitPageMarkedText(text, expectedPageNumbers = []) {
  const source = cleanOcrText(text);
  const matches = [...source.matchAll(PAGE_MARKER_RE)];
  const parsed = new Map();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const pageNumber = Number(match[1]);
    const start = (match.index || 0) + match[0].length;
    const end = matches[index + 1]?.index ?? source.length;
    const pageText = source.slice(start, end).trim();
    if (Number.isInteger(pageNumber) && pageText)
      parsed.set(pageNumber, pageText);
  }

  const expected = expectedPageNumbers.map(Number);
  if (expected.length && !expected.every((page) => parsed.has(page))) {
    const relativePages = Array.from(
      { length: expected.length },
      (_, i) => i + 1,
    );
    if (relativePages.every((page) => parsed.has(page))) {
      return new Map(expected.map((page, i) => [page, parsed.get(i + 1)]));
    }
  }

  return parsed;
}

function stripSinglePageMarker(text) {
  const source = cleanOcrText(text);
  const match = PAGE_MARKER_RE.exec(source);
  PAGE_MARKER_RE.lastIndex = 0;
  if (match && (match.index || 0) === 0) {
    return source.slice(match[0].length).trim();
  }
  return source;
}

class UnlimitedOcrClient {
  constructor({ fetchImpl = globalThis.fetch, logger = () => {} } = {}) {
    if (typeof fetchImpl !== "function") {
      throw new Error("Unlimited-OCR requires a fetch-compatible runtime");
    }

    this.fetch = fetchImpl;
    this.logger = logger;
    this.backend = String(
      process.env.UNLIMITED_OCR_BACKEND || DEFAULT_BACKEND,
    ).toLowerCase();
    if (!BACKEND_DEFAULTS[this.backend]) {
      this.logger(
        `Unknown UNLIMITED_OCR_BACKEND=${this.backend}; using ${DEFAULT_BACKEND}.`,
      );
      this.backend = DEFAULT_BACKEND;
    }
    const defaults = BACKEND_DEFAULTS[this.backend];
    this.baseUrl = normalizeBaseUrl(
      process.env.UNLIMITED_OCR_BASE_URL,
      defaults.baseUrl,
    );
    this.apiKey = process.env.UNLIMITED_OCR_API_KEY || "";
    this.model = process.env.UNLIMITED_OCR_MODEL || defaults.model;
    this.timeoutMs = positiveInteger(
      process.env.UNLIMITED_OCR_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      { max: 7_200_000 },
    );
    this.maxTokens = positiveInteger(
      process.env.UNLIMITED_OCR_MAX_TOKENS,
      DEFAULT_MAX_TOKENS,
      { max: 131_072 },
    );
    this.pagesPerRequest = positiveInteger(
      process.env.UNLIMITED_OCR_PAGES_PER_REQUEST,
      DEFAULT_PAGES_PER_REQUEST,
      { max: 64 },
    );
    this.singlePrompt =
      process.env.UNLIMITED_OCR_SINGLE_PROMPT || defaults.singlePrompt;
    this.multiPrompt =
      process.env.UNLIMITED_OCR_MULTI_PROMPT || defaults.multiPrompt;
    this.customLogitProcessor =
      process.env.UNLIMITED_OCR_CUSTOM_LOGIT_PROCESSOR || "";
    this.extraBody = parseExtraBody(process.env.UNLIMITED_OCR_EXTRA_BODY);
    this._availability = null;
    this._availabilityCheckedAt = 0;
  }

  get headers() {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  async isAvailable() {
    if (
      this._availability !== null &&
      Date.now() - this._availabilityCheckedAt < 60_000
    ) {
      return this._availability;
    }

    try {
      const response = await this.fetch(`${this.baseUrl}/models`, {
        headers: this.headers,
        signal: AbortSignal.timeout(5_000),
      });
      // Some compatible gateways expose chat completions but not /models.
      this._availability =
        response.ok || response.status === 404 || response.status === 405;
    } catch {
      this._availability = false;
    }
    this._availabilityCheckedAt = Date.now();
    return this._availability;
  }

  async recognizeImage(imageBuffer) {
    return stripSinglePageMarker(
      await this._request([imageBuffer], { pageNumbers: [1] }),
    );
  }

  /**
   * Recognize ordered page images. Multi-page inference is attempted in
   * configurable chunks. If page markers are absent or incomplete, that chunk
   * is retried page-by-page so the caller never loses page boundaries.
   */
  async recognizePages(imageBuffers, { pageNumbers = [] } = {}) {
    if (!Array.isArray(imageBuffers) || imageBuffers.length === 0) return [];
    if (!pageNumbers.length) {
      pageNumbers = imageBuffers.map((_, index) => index + 1);
    }
    if (pageNumbers.length !== imageBuffers.length) {
      throw new Error("Unlimited-OCR imageBuffers/pageNumbers length mismatch");
    }

    const byPage = new Map();
    for (
      let offset = 0;
      offset < imageBuffers.length;
      offset += this.pagesPerRequest
    ) {
      const buffers = imageBuffers.slice(offset, offset + this.pagesPerRequest);
      const pages = pageNumbers.slice(offset, offset + this.pagesPerRequest);
      const chunkResult = await this._recognizeChunk(buffers, pages);
      for (const [page, text] of chunkResult) byPage.set(page, text);
    }

    return pageNumbers.map((page) => byPage.get(page) || "");
  }

  async _recognizeChunk(imageBuffers, pageNumbers) {
    if (imageBuffers.length === 1) {
      return new Map([
        [
          pageNumbers[0],
          stripSinglePageMarker(
            await this._request(imageBuffers, { pageNumbers }),
          ),
        ],
      ]);
    }

    try {
      const text = await this._request(imageBuffers, { pageNumbers });
      const parsed = splitPageMarkedText(text, pageNumbers);
      if (
        pageNumbers.every(
          (page) => parsed.has(page) && String(parsed.get(page)).trim(),
        )
      ) {
        return parsed;
      }
      this.logger(
        `Unlimited-OCR returned no complete page markers for pages ${pageNumbers.join(
          "-",
        )}; retrying this chunk page-by-page.`,
      );
    } catch (error) {
      this.logger(
        `Unlimited-OCR multi-page request failed for pages ${pageNumbers.join(
          "-",
        )}: ${error.message}; retrying page-by-page.`,
      );
    }

    const singles = await Promise.all(
      imageBuffers.map(async (buffer, index) => {
        const text = await this._request([buffer], {
          pageNumbers: [pageNumbers[index]],
        });
        return [pageNumbers[index], stripSinglePageMarker(text)];
      }),
    );
    return new Map(singles);
  }

  _providerExtraBody(isMultiPage) {
    const windowSize = isMultiPage ? 1024 : 128;
    const defaults =
      this.backend === "sglang"
        ? {
            skip_special_tokens: false,
            images_config: { image_mode: isMultiPage ? "base" : "gundam" },
            custom_params: { ngram_size: 35, window_size: windowSize },
          }
        : {
            skip_special_tokens: false,
            vllm_xargs: { ngram_size: 35, window_size: windowSize },
          };
    return { ...defaults, ...this.extraBody };
  }

  async _request(imageBuffers, { pageNumbers }) {
    const isMultiPage = imageBuffers.length > 1;
    const markerInstruction = isMultiPage
      ? `\nReturn every page separately and in order. Start each page with exactly [PAGE:N], replacing N with its original page number. The page numbers in this request are: ${pageNumbers.join(
          ", ",
        )}. Preserve reading order, headings, tables, formulas and layout in Markdown. Do not add commentary.`
      : "";
    const prompt = `${
      isMultiPage ? this.multiPrompt : this.singlePrompt
    }${markerInstruction}`;

    const content = [
      { type: "text", text: prompt },
      ...imageBuffers.map((buffer) => ({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${buffer.toString("base64")}`,
        },
      })),
    ];

    const payload = {
      model: this.model,
      messages: [{ role: "user", content }],
      temperature: 0,
      max_tokens: this.maxTokens,
      stream: false,
      ...this._providerExtraBody(isMultiPage),
    };
    if (this.backend === "sglang" && this.customLogitProcessor) {
      payload.custom_logit_processor = this.customLogitProcessor;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `HTTP ${response.status}: ${
            body.slice(0, 500) || response.statusText
          }`,
        );
      }
      const data = await response.json();
      const text = contentToText(data);
      if (!text) throw new Error("empty model response");
      return text;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = {
  UnlimitedOcrClient,
  cleanOcrText,
  contentToText,
  normalizeBaseUrl,
  splitPageMarkedText,
};
