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
  const originalEnv = {
    CHAT_IMAGE_OCR_ENABLED: process.env.CHAT_IMAGE_OCR_ENABLED,
    CHAT_IMAGE_OCR_CACHE_SIZE: process.env.CHAT_IMAGE_OCR_CACHE_SIZE,
    CHAT_IMAGE_OCR_LANGS: process.env.CHAT_IMAGE_OCR_LANGS,
  };

  function resetEnv() {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  beforeEach(() => {
    mockRecognize.mockReset();
    mockCreateWorker.mockClear();
    resetEnv();
  });

  afterEach(() => {
    resetEnv();
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

  // URL regex edge cases

  it("strips trailing punctuation from URLs", async () => {
    mockRecognize.mockResolvedValue({
      data: {
        text: "Visit https://example.com, https://test.com! or https://other.com; now.",
      },
    });
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls(["base64-punct"]);
    expect(urls).toEqual([
      "https://example.com",
      "https://test.com",
      "https://other.com",
    ]);
  });

  it("extracts URLs surrounded by parentheses", async () => {
    mockRecognize.mockResolvedValue({
      data: { text: "See (https://example.com) for more info." },
    });
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls(["base64-parens"]);
    expect(urls).toEqual(["https://example.com"]);
  });

  it("extracts multiple URLs from one OCR text", async () => {
    mockRecognize.mockResolvedValue({
      data: {
        text: "Links: https://one.com, https://two.com, and https://three.com.",
      },
    });
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls(["base64-multi"]);
    expect(urls).toEqual([
      "https://one.com",
      "https://two.com",
      "https://three.com",
    ]);
  });

  // Data-URI variations

  it("handles data-URI with and without prefix", async () => {
    mockRecognize
      .mockResolvedValueOnce({ data: { text: "https://with-prefix.com" } })
      .mockResolvedValueOnce({ data: { text: "https://without-prefix.com" } });
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls([
      "data:image/png;base64,abc123",
      "xyz789",
    ]);
    expect(urls).toEqual(["https://with-prefix.com", "https://without-prefix.com"]);
    expect(mockRecognize).toHaveBeenCalledTimes(2);
  });

  it("returns empty array for invalid base64 content", async () => {
    mockRecognize.mockRejectedValue(new Error("Invalid buffer"));
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls(["!!!not-base64!!!"]);
    expect(urls).toEqual([]);
  });

  // Cache eviction

  it("evicts oldest cache entry when MAX_CACHE_SIZE is exceeded", async () => {
    process.env.CHAT_IMAGE_OCR_CACHE_SIZE = "2";
    mockRecognize
      .mockResolvedValueOnce({ data: { text: "https://first.com" } })
      .mockResolvedValueOnce({ data: { text: "https://second.com" } })
      .mockResolvedValueOnce({ data: { text: "https://third.com" } });
    const extractImageUrls = loadExtractImageUrls();

    await extractImageUrls(["base64-first"]);
    await extractImageUrls(["base64-second"]);
    await extractImageUrls(["base64-third"]);
    expect(mockRecognize).toHaveBeenCalledTimes(3);

    // First entry should have been evicted, so reprocessing it triggers OCR again.
    mockRecognize.mockResolvedValueOnce({ data: { text: "https://first.com" } });
    await extractImageUrls(["base64-first"]);
    expect(mockRecognize).toHaveBeenCalledTimes(4);
  });

  // CHAT_IMAGE_OCR_LANGS env behavior

  it("honors CHAT_IMAGE_OCR_LANGS when creating the worker", async () => {
    process.env.CHAT_IMAGE_OCR_LANGS = "eng";
    mockRecognize.mockResolvedValue({ data: { text: "https://lang.com" } });
    const extractImageUrls = loadExtractImageUrls();
    await extractImageUrls(["base64-lang"]);
    expect(mockCreateWorker).toHaveBeenCalledWith("eng");
  });

  // Parallel processing

  it("processes multiple images in parallel", async () => {
    let callCount = 0;
    mockRecognize.mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) return { data: { text: "https://parallel-a.com" } };
      if (callCount === 2) return { data: { text: "https://parallel-b.com" } };
      return { data: { text: "https://shared.com" } };
    });
    const extractImageUrls = loadExtractImageUrls();
    const urls = await extractImageUrls([
      "base64-a",
      "base64-b",
      "base64-shared",
    ]);
    expect(urls).toEqual([
      "https://parallel-a.com",
      "https://parallel-b.com",
      "https://shared.com",
    ]);
    expect(mockRecognize).toHaveBeenCalledTimes(3);
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
