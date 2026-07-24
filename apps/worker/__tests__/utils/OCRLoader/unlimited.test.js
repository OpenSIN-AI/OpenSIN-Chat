// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

const {
  UnlimitedOcrClient,
  cleanOcrText,
  contentToText,
  normalizeBaseUrl,
  splitPageMarkedText,
} = require("../../../utils/OCRLoader/unlimited");

function jsonResponse(content, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => String(content),
  };
}

describe("UnlimitedOcrClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.UNLIMITED_OCR_BACKEND = "vllm";
    process.env.UNLIMITED_OCR_BASE_URL = "http://ocr.test/v1/";
    process.env.UNLIMITED_OCR_MODEL = "Unlimited-OCR";
    process.env.UNLIMITED_OCR_PAGES_PER_REQUEST = "8";
    process.env.UNLIMITED_OCR_MAX_TOKENS = "8192";
    delete process.env.UNLIMITED_OCR_API_KEY;
    delete process.env.UNLIMITED_OCR_EXTRA_BODY;
    delete process.env.UNLIMITED_OCR_CUSTOM_LOGIT_PROCESSOR;
    delete process.env.UNLIMITED_OCR_SINGLE_PROMPT;
    delete process.env.UNLIMITED_OCR_MULTI_PROMPT;
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  it("normalizes URLs, array content, and vLLM grounding tokens", () => {
    expect(normalizeBaseUrl("http://ocr.test/v1///")).toBe(
      "http://ocr.test/v1"
    );
    expect(
      contentToText({
        choices: [
          {
            message: {
              content: [
                { text: "<|ref|>Hello<|/ref|>" },
                { text: "<|det|>[[1,2,3,4]]<|/det|> world" },
              ],
            },
          },
        ],
      })
    ).toBe("Hello world");
    expect(cleanOcrText("<|ref|>Title<|/ref|><|det|>[0,0]<|/det|>")).toBe(
      "Title"
    );
  });

  it("splits absolute and relative page markers", () => {
    expect(
      Object.fromEntries(
        splitPageMarkedText("[PAGE:7]\nAlpha\n[PAGE:8]\nBeta", [7, 8])
      )
    ).toEqual({ 7: "Alpha", 8: "Beta" });
    expect(
      Object.fromEntries(
        splitPageMarkedText("[PAGE:1]\nAlpha\n[PAGE:2]\nBeta", [11, 12])
      )
    ).toEqual({ 11: "Alpha", 12: "Beta" });
  });

  it("sends a vLLM-compatible multi-page request", async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse("[PAGE:3]\nFirst\n[PAGE:4]\nSecond")
    );
    const client = new UnlimitedOcrClient({ fetchImpl });

    const result = await client.recognizePages(
      [Buffer.from("one"), Buffer.from("two")],
      { pageNumbers: [3, 4] }
    );

    expect(result).toEqual(["First", "Second"]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, request] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://ocr.test/v1/chat/completions");
    const payload = JSON.parse(request.body);
    expect(payload.model).toBe("Unlimited-OCR");
    expect(payload.max_tokens).toBe(8192);
    expect(payload.skip_special_tokens).toBe(false);
    expect(payload.vllm_xargs).toEqual({ ngram_size: 35, window_size: 1024 });
    expect(payload.images_config).toBeUndefined();
    expect(payload.messages[0].content[0].text).toMatch(
      /^<image>Multi page parsing\./
    );
    expect(
      payload.messages[0].content.filter((part) => part.type === "image_url")
    ).toHaveLength(2);
  });

  it("falls back to page-by-page requests when markers are missing", async () => {
    const responses = [
      jsonResponse("Combined output without markers"),
      jsonResponse("Page one"),
      jsonResponse("Page two"),
    ];
    const fetchImpl = jest.fn(async () => responses.shift());
    const logger = jest.fn();
    const client = new UnlimitedOcrClient({ fetchImpl, logger });

    const result = await client.recognizePages(
      [Buffer.from("one"), Buffer.from("two")],
      { pageNumbers: [1, 2] }
    );

    expect(result).toEqual(["Page one", "Page two"]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(logger).toHaveBeenCalledWith(
      expect.stringContaining("page-by-page")
    );
  });

  it("uses the official SGLang single-image recipe when selected", async () => {
    process.env.UNLIMITED_OCR_BACKEND = "sglang";
    const fetchImpl = jest.fn(async () => jsonResponse("Recognized text"));
    const client = new UnlimitedOcrClient({ fetchImpl });

    expect(await client.recognizeImage(Buffer.from("one"))).toBe(
      "Recognized text"
    );
    const payload = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(payload.messages[0].content[0].text).toBe("document parsing.");
    expect(payload.images_config).toEqual({ image_mode: "gundam" });
    expect(payload.custom_params).toEqual({ ngram_size: 35, window_size: 128 });
    expect(payload.vllm_xargs).toBeUndefined();
  });
});
