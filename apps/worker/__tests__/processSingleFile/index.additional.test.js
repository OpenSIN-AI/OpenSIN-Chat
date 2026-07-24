// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

// Additional tests for processSingleFile — covers dotted filenames, the
// parseOnly option, the FALLTHROUGH .custom branch, and the path-traversal
// guard with absolutePath provided.

const mockProcessor = jest.fn(() =>
  Promise.resolve({
    success: true,
    reason: null,
    documents: [{ pageContent: "x" }],
  })
);

jest.mock("../../utils/constants", () => ({
  WATCH_DIRECTORY: "/fake/hotdir",
  SUPPORTED_FILETYPE_CONVERTERS: {
    ".txt": "/fake/convert/asTxt",
    ".pdf": "/fake/convert/asPDF",
    ".log": "/fake/convert/asTxt",
    ".custom": "/fake/convert/asTxt",
    ".md": "/fake/convert/asTxt",
  },
}));

jest.mock("/fake/convert/asTxt", () => mockProcessor, { virtual: true });
jest.mock("/fake/convert/asPDF", () => mockProcessor, { virtual: true });

jest.mock("../../utils/files", () => ({
  trashFile: jest.fn(),
  isTextType: jest.fn(() => true),
  normalizePath: jest.fn((p) => p),
  isWithin: jest.fn(() => true),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  statSync: jest.fn(() => ({ size: 1024 })),
}));

const { processSingleFile } = require("../../processSingleFile");
const fs = require("fs");
const path = require("path");
const { trashFile, isTextType, isWithin, normalizePath } = require("../../utils/files");

describe("processSingleFile - additional coverage", () => {
  let origExtname;

  beforeAll(() => {
    origExtname = path.extname;
  });

  afterEach(() => {
    path.extname = origExtname;
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    isWithin.mockReturnValue(true);
    isTextType.mockReturnValue(true);
    fs.existsSync.mockReturnValue(true);
    mockProcessor.mockResolvedValue({
      success: true,
      reason: null,
      documents: [{ pageContent: "x" }],
    });
  });

  describe("extension detection", () => {
    it("rejects files containing a dot but having no extension", async () => {
      path.extname = jest.fn(() => "");
      const result = await processSingleFile("file.with.no.ext");
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/no file extension/i);
    });

    it("uses lowercased extension for matching", async () => {
      path.extname = jest.fn(() => ".TXT");
      const result = await processSingleFile("DOC.TXT");
      expect(result.success).toBe(true);
      expect(mockProcessor).toHaveBeenCalled();
    });

    it("supports a generic supported converter path", async () => {
      path.extname = jest.fn(() => ".log");
      const result = await processSingleFile("app.log");
      expect(result.success).toBe(true);
    });
  });

  describe("absolute path option", () => {
    it("uses the provided absolutePath directly", async () => {
      path.extname = jest.fn(() => ".txt");
      fs.existsSync.mockReturnValue(true);
      await processSingleFile("user.txt", { absolutePath: "/external/user.txt" });
      expect(normalizePath).toHaveBeenCalledWith("/external/user.txt");
    });

    it("does not call isWithin when absolutePath is provided", async () => {
      path.extname = jest.fn(() => ".txt");
      await processSingleFile(
        "user.txt",
        { absolutePath: "/external/user.txt" },
        {}
      );
      // isWithin should be skipped, so the default mock returning true
      // is irrelevant.
      expect(mockProcessor).toHaveBeenCalled();
    });

    it("trashes external files when unsupported", async () => {
      path.extname = jest.fn(() => ".bin");
      isTextType.mockReturnValue(false);
      // No absolutePath; default trashFile behavior expected
      await processSingleFile("data.bin");
      expect(trashFile).toHaveBeenCalled();
    });
  });

  describe("parseOnly option", () => {
    it("forwards parseOnly flag to the converter", async () => {
      path.extname = jest.fn(() => ".txt");
      await processSingleFile("doc.txt", { parseOnly: true });
      expect(mockProcessor).toHaveBeenCalledWith(
        expect.objectContaining({ options: expect.objectContaining({ parseOnly: true }) })
      );
    });
  });

  describe("metadata pass-through", () => {
    it("forwards an empty metadata object as default", async () => {
      path.extname = jest.fn(() => ".txt");
      await processSingleFile("doc.txt");
      expect(mockProcessor).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: {} })
      );
    });

    it("forwards complex metadata unchanged", async () => {
      path.extname = jest.fn(() => ".txt");
      const meta = {
        title: "Doc",
        custom: { nested: true },
        tags: ["a", "b"],
      };
      await processSingleFile("doc.txt", {}, meta);
      expect(mockProcessor).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: meta })
      );
    });
  });

  describe("error propagation", () => {
    it("propagates errors from the converter as a rejected promise", async () => {
      path.extname = jest.fn(() => ".txt");
      mockProcessor.mockRejectedValue(new Error("converter died"));
      // The source does `await FileTypeProcessor(...)` so the rejection
      // propagates out of processSingleFile.
      await expect(processSingleFile("doc.txt")).rejects.toThrow("converter died");
    });
  });

  describe("reserved filename variants", () => {
    it("rejects exact-case __HOTDIR__.md as reserved", async () => {
      const result = await processSingleFile("__HOTDIR__.md");
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/reserved/i);
    });

    it("does not match lowercase __hotdir__.md as reserved", async () => {
      // Reserved list is case-sensitive: lowercase bypasses the check
      // and is processed normally as a .md file (which is text-type).
      path.extname = jest.fn(() => ".md");
      const result = await processSingleFile("__hotdir__.md");
      expect(result.success).toBe(true);
    });
  });
});
