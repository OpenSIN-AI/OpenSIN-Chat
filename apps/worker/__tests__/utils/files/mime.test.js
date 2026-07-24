// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

const mimeLib = require("mime");

jest.mock("mime", () => {
  const overrides = {};
  const fallback = {
    ".pdf": "application/pdf",
    ".html": "text/html",
    ".css": "text/css",
    ".json": "application/json",
    ".zip": "application/zip",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".png": "image/png",
    ".jpg": "image/jpeg",
  };
  return {
    define: jest.fn((mapping, force) => {
      for (const [mime, exts] of Object.entries(mapping)) {
        for (const ext of exts) {
          overrides["." + ext] = mime;
        }
      }
    }),
    getType: jest.fn((filepath) => {
      const ext = filepath.includes(".")
        ? "." + filepath.split(".").pop()
        : "";
      if (overrides[ext]) return overrides[ext];
      if (fallback[ext]) return fallback[ext];
      return null;
    }),
  };
});

const { MimeDetector } = require("../../../utils/files/mime");

describe("MimeDetector", () => {
  let detector;

  beforeEach(() => {
    detector = new MimeDetector();
  });

  describe("getType", () => {
    it("returns text/plain for .js (override)", () => {
      expect(detector.getType("test.js")).toBe("text/plain");
    });

    it("returns text/plain for .ts (override)", () => {
      expect(detector.getType("app.ts")).toBe("text/plain");
    });

    it("returns text/plain for .tsx (override)", () => {
      expect(detector.getType("component.tsx")).toBe("text/plain");
    });

    it("returns text/plain for .py (override)", () => {
      expect(detector.getType("script.py")).toBe("text/plain");
    });

    it("returns application/pdf for .pdf", () => {
      expect(detector.getType("document.pdf")).toBe("application/pdf");
    });

    it("returns text/html for .html", () => {
      expect(detector.getType("page.html")).toBe("text/html");
    });

    it("returns null for unknown extensions", () => {
      expect(detector.getType("file.xyz123abc")).toBeNull();
    });
  });

  describe("nonTextTypes", () => {
    it("contains expected categories", () => {
      expect(detector.nonTextTypes).toContain("multipart");
      expect(detector.nonTextTypes).toContain("model");
      expect(detector.nonTextTypes).toContain("audio");
      expect(detector.nonTextTypes).toContain("video");
      expect(detector.nonTextTypes).toContain("font");
    });
  });

  describe("badMimes", () => {
    it("contains expected types", () => {
      expect(detector.badMimes).toContain("application/octet-stream");
      expect(detector.badMimes).toContain("application/zip");
      expect(detector.badMimes).toContain("application/pkcs8");
      expect(detector.badMimes).toContain(
        "application/vnd.microsoft.portable-executable"
      );
      expect(detector.badMimes).toContain("application/x-msdownload");
    });
  });

  describe("setOverrides", () => {
    it("maps .ts to text/plain", () => {
      expect(detector.getType("index.ts")).toBe("text/plain");
    });

    it("maps .tsx to text/plain", () => {
      expect(detector.getType("app.tsx")).toBe("text/plain");
    });

    it("maps .py to text/plain", () => {
      expect(detector.getType("main.py")).toBe("text/plain");
    });

    it("maps .sh to text/plain", () => {
      expect(detector.getType("run.sh")).toBe("text/plain");
    });

    it("maps .go to text/plain", () => {
      expect(detector.getType("main.go")).toBe("text/plain");
    });

    it("maps .c to text/plain", () => {
      expect(detector.getType("program.c")).toBe("text/plain");
    });

    it("maps .lock to text/plain", () => {
      expect(detector.getType("package.lock")).toBe("text/plain");
    });
  });
});
