// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

jest.mock("../../../utils/paths", () => ({
  getStoragePath: jest.fn((...subdirs) =>
    ["/fake/storage", ...subdirs].join("/")
  ),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  statSync: jest.fn(() => ({ isFile: () => true })),
  readFileSync: jest.fn(),
}));

jest.mock("tesseract.js", () => ({
  createWorker: jest.fn(() =>
    Promise.resolve({
      recognize: jest.fn(() =>
        Promise.resolve({ data: { text: "OCR result" } })
      ),
      terminate: jest.fn(() => Promise.resolve()),
    })
  ),
  OEM: { LSTM_ONLY: 1 },
}), { virtual: true });

jest.mock("sharp", () => ({
  default: jest.fn(() => ({
    resize: jest.fn(() => ({
      withMetadata: jest.fn(() => ({
        png: jest.fn(() => ({
          toBuffer: jest.fn(() => Promise.resolve(Buffer.from("fake"))),
          toFile: jest.fn(() => Promise.resolve()),
        })),
      })),
    })),
  })),
}), { virtual: true });

jest.mock("pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js", () => ({
  getDocument: jest.fn(),
  OPS: {
    paintJpegXObject: 1,
    paintImageXObject: 2,
    paintInlineImageXObject: 3,
  },
}), { virtual: true });

const OCRLoader = require("../../../utils/OCRLoader");
const fs = require("fs");

describe("OCRLoader", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("parseLanguages", () => {
    it("defaults to eng when no language provided", () => {
      const loader = new OCRLoader();
      expect(loader.language).toEqual(["eng"]);
    });

    it("parses a single valid language code", () => {
      const loader = new OCRLoader({ targetLanguages: "deu" });
      expect(loader.language).toEqual(["deu"]);
    });

    it("parses multiple comma-separated valid language codes", () => {
      const loader = new OCRLoader({ targetLanguages: "eng,deu,fra" });
      expect(loader.language).toEqual(["eng", "deu", "fra"]);
    });

    it("filters out invalid language codes and falls back to eng if none valid", () => {
      const loader = new OCRLoader({ targetLanguages: "xyz,abc" });
      expect(loader.language).toEqual(["eng"]);
    });

    it("filters out invalid codes but keeps valid ones", () => {
      const loader = new OCRLoader({ targetLanguages: "eng,xyz,deu" });
      expect(loader.language).toEqual(["eng", "deu"]);
    });

    it("handles null input", () => {
      const loader = new OCRLoader({ targetLanguages: null });
      expect(loader.language).toEqual(["eng"]);
    });

    it("handles empty string", () => {
      const loader = new OCRLoader({ targetLanguages: "" });
      expect(loader.language).toEqual(["eng"]);
    });

    it("trims whitespace around language codes", () => {
      const loader = new OCRLoader({ targetLanguages: " eng , deu " });
      expect(loader.language).toEqual(["eng", "deu"]);
    });

    it("skips empty entries from trailing commas", () => {
      const loader = new OCRLoader({ targetLanguages: "eng,,deu," });
      expect(loader.language).toEqual(["eng", "deu"]);
    });
  });

  describe("constructor", () => {
    it("creates cache dir if it does not exist", () => {
      fs.existsSync.mockReturnValue(false);
      const loader = new OCRLoader();
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("tesseract"),
        { recursive: true }
      );
    });

    it("does not create cache dir if it already exists", () => {
      fs.existsSync.mockReturnValue(true);
      const loader = new OCRLoader();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe("ocrImage", () => {
    it("returns null when file does not exist", async () => {
      fs.existsSync.mockReturnValue(false);
      const loader = new OCRLoader();
      const result = await loader.ocrImage("/nonexistent.png");
      expect(result).toBeNull();
    });

    it("returns null when path is not a file", async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isFile: () => false });
      const loader = new OCRLoader();
      const result = await loader.ocrImage("/some/dir");
      expect(result).toBeNull();
    });

    it("returns null when filePath is falsy", async () => {
      const loader = new OCRLoader();
      const result = await loader.ocrImage("");
      expect(result).toBeNull();
    });

    it("returns OCR text for a valid image file", async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isFile: () => true });
      const loader = new OCRLoader();
      const result = await loader.ocrImage("/fake/image.png");
      expect(result).toBe("OCR result");
    });
  });

  describe("ocrPDF", () => {
    it("returns empty array when file does not exist", async () => {
      fs.existsSync.mockReturnValue(false);
      const loader = new OCRLoader();
      const result = await loader.ocrPDF("/nonexistent.pdf");
      expect(result).toEqual([]);
    });

    it("returns empty array when filePath is falsy", async () => {
      const loader = new OCRLoader();
      const result = await loader.ocrPDF("");
      expect(result).toEqual([]);
    });

    it("returns empty array when path is not a file", async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ isFile: () => false });
      const loader = new OCRLoader();
      const result = await loader.ocrPDF("/some/dir");
      expect(result).toEqual([]);
    });
  });
});
