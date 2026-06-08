// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

const mockProcessor = jest.fn(() =>
  Promise.resolve({ success: true, reason: null, documents: [{ pageContent: "content" }] })
);

jest.mock("../../utils/constants", () => ({
  WATCH_DIRECTORY: "/fake/hotdir",
  SUPPORTED_FILETYPE_CONVERTERS: {
    ".txt": "/fake/convert/asTxt",
    ".pdf": "/fake/convert/asPDF",
    ".log": "/fake/convert/asTxt",
    ".custom": "/fake/convert/asTxt",
  },
}));

jest.mock("/fake/convert/asTxt", () => mockProcessor, { virtual: true });
jest.mock("/fake/convert/asPDF", () => mockProcessor, { virtual: true });

jest.mock("../../utils/files", () => ({
  trashFile: jest.fn(),
  isTextType: jest.fn(),
  normalizePath: jest.fn((p) => p),
  isWithin: jest.fn(() => true),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

const { processSingleFile } = require("../../processSingleFile");
const fs = require("fs");
const path = require("path");
const { trashFile, isTextType, isWithin } = require("../../utils/files");

describe("processSingleFile", () => {
  let origExtname;

  beforeAll(() => {
    origExtname = path.extname;
  });

  afterEach(() => {
    path.extname = origExtname;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    isWithin.mockReturnValue(true);
    mockProcessor.mockResolvedValue({
      success: true,
      reason: null,
      documents: [{ pageContent: "content" }],
    });
  });

  it("rejects reserved filenames", async () => {
    const result = await processSingleFile("__HOTDIR__.md");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("reserved");
  });

  it("rejects files that do not exist", async () => {
    fs.existsSync.mockReturnValue(false);
    const result = await processSingleFile("missing.txt");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("does not exist");
  });

  it("rejects files outside the watch directory", async () => {
    isWithin.mockReturnValue(false);
    const result = await processSingleFile("escape.txt");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("not a valid path");
  });

  it("rejects unsupported file types that are not text", async () => {
    fs.existsSync.mockReturnValue(true);
    path.extname = jest.fn(() => ".bin");
    isTextType.mockReturnValue(false);
    const result = await processSingleFile("data.bin");
    expect(result.success).toBe(false);
    expect(result.reason).toContain("not supported");
    expect(trashFile).toHaveBeenCalled();
  });

  it("does not trash file when absolutePath is provided and type is unsupported", async () => {
    fs.existsSync.mockReturnValue(true);
    path.extname = jest.fn(() => ".bin");
    isTextType.mockReturnValue(false);
    const result = await processSingleFile("data.bin", { absolutePath: "/external/data.bin" });
    expect(result.success).toBe(false);
    expect(trashFile).not.toHaveBeenCalled();
  });

  it("processes unsupported text files as .txt", async () => {
    fs.existsSync.mockReturnValue(true);
    path.extname = jest.fn(() => ".custom");
    isTextType.mockReturnValue(true);
    const result = await processSingleFile("readme.custom");
    expect(result.success).toBe(true);
  });

  it("delegates to the correct file type processor for supported extensions", async () => {
    fs.existsSync.mockReturnValue(true);
    path.extname = jest.fn(() => ".txt");
    const result = await processSingleFile("doc.txt");
    expect(result.success).toBe(true);
    expect(result.documents).toEqual([{ pageContent: "content" }]);
  });

  it("passes options and metadata to the processor", async () => {
    fs.existsSync.mockReturnValue(true);
    path.extname = jest.fn(() => ".txt");
    const opts = { parseOnly: true };
    const meta = { title: "test" };
    await processSingleFile("doc.txt", opts, meta);
    expect(mockProcessor).toHaveBeenCalledWith(
      expect.objectContaining({
        options: opts,
        metadata: meta,
      })
    );
  });
});
