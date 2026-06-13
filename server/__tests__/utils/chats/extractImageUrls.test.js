// SPDX-License-Identifier: MIT
const { buildScreenshotUrlPrompt } = require("../../../utils/chats/extractImageUrls");

const mockRecognize = jest.fn();
const mockCreateWorker = jest.fn(() =>
  Promise.resolve({ recognize: mockRecognize })
);
jest.mock(
  "tesseract.js",
  () => ({
    createWorker: mockCreateWorker,
  }),
  { virtual: true }
);

function loadExtractImageUrls() {
  jest.resetModules();
  return require("../../../utils/chats/extractImageUrls").extractImageUrls;
}

describe("extractImageUrls", () => {
  const originalEnv = process.env.CHAT_IMAGE_OCR_ENABLED;

  beforeEach(() => {
    mockRecognize.mockReset();
    mockCreateWorker.mockClear();
    if (originalEnv === undefined) {
      delete process.env.CHAT_IMAGE_OCR_ENABLED;
    } else {
      process.env.CHAT_IMAGE_OCR_ENABLED = originalEnv;
    }
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CHAT_IMAGE_OCR_ENABLED;
    } else {
      process.env.CHAT_IMAGE_OCR_ENABLED = originalEnv;
    }
  });

  it("returns an empty array for empty input", async () => {
    const extractImageUrls = loadExtractImageUrls();
    expect(await extractImageUrls([])).toEqual([]);
  });

  it("returns an empty array for non-array input", async () => {
    const extractImageUrls = loadExtractImageUrls();
    expect(await extractImageUrls(null)).toEqual([]);
    expect(await extractImageUrls(undefined)).toEqual([]);
    expect(await extractImageUrls("not-an-array")).toEqual([]);
  });

  it("returns an empty array when OCR is disabled", async () => {
    process.env.CHAT_IMAGE_OCR_ENABLED = "false";
    const extractImageUrls = loadExtractImageUrls();
    expect(await extractImageUrls(["data:image/png;base64,abc123"])).toEqual([]);
    expect(mockCreateWorker).not.toHaveBeenCalled();
  });

  it("extracts URLs from a base64 image string", async () => {
    mockRecognize.mockResolvedValue({ data: { text: "Visit https://example.com for details." } });
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls(["data:image/png;base64,abc123"]);
    expect(urls).toEqual(["https://example.com"]);
    expect(mockRecognize).toHaveBeenCalledTimes(1);
  });

  it("extracts URLs from attachment objects with contentString", async () => {
    mockRecognize.mockResolvedValue({
      data: { text: "Sources: https://one.com and https://two.com" },
    });
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls([
      { contentString: "data:image/png;base64,first" },
      { contentString: "data:image/png;base64,second" },
    ]);
    expect(urls).toEqual(["https://one.com", "https://two.com"]);
  });

  it("deduplicates URLs across images", async () => {
    mockRecognize
      .mockResolvedValueOnce({ data: { text: "See https://shared.com" } })
      .mockResolvedValueOnce({ data: { text: "Also https://shared.com" } });
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls(["base64-one", "base64-two"]);
    expect(urls).toEqual(["https://shared.com"]);
  });

  it("returns an empty array when OCR returns no text", async () => {
    mockRecognize.mockResolvedValue({ data: { text: "" } });
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls(["base64-nothing"]);
    expect(urls).toEqual([]);
  });

  it("returns an empty array when OCR fails", async () => {
    mockRecognize.mockRejectedValue(new Error("OCR engine crashed"));
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls(["base64-broken"]);
    expect(urls).toEqual([]);
  });

  it("caches OCR results by content hash", async () => {
    mockRecognize.mockResolvedValue({ data: { text: "https://cached.com" } });
    const extractImageUrls = loadExtractImageUrls();
    const first = await extractImageUrls(["base64-same"]);
    const second = await extractImageUrls(["base64-same"]);
    expect(first).toEqual(second);
    expect(mockRecognize).toHaveBeenCalledTimes(1);
  });

  it("ignores invalid attachment entries", async () => {
    mockRecognize.mockResolvedValue({ data: { text: "https://valid.com" } });
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls([
      null,
      { contentString: "" },
      42,
      "base64-valid",
      { contentString: null },
    ]);
    expect(urls).toEqual(["https://valid.com"]);
  });
});

describe("buildScreenshotUrlPrompt", () => {
  it("returns an empty string for empty URLs", () => {
    expect(buildScreenshotUrlPrompt([])).toBe("");
    expect(buildScreenshotUrlPrompt(null)).toBe("");
  });

  it("builds a prompt listing detected URLs", () => {
    const prompt = buildScreenshotUrlPrompt(["https://example.com", "https://test.com"]);
    expect(prompt).toContain("https://example.com");
    expect(prompt).toContain("https://test.com");
    expect(prompt).toContain("Wenn der Benutzer eine Bildquelle mit URL hochlädt");
  });
});
