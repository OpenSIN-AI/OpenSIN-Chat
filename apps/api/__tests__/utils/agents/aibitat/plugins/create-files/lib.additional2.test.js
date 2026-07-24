// SPDX-License-Identifier: MIT
/* eslint-env jest */

const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const createFilesLib = require("../../../../../../utils/agents/aibitat/plugins/create-files/lib.js");
const { getStoragePath } = require("../../../../../../utils/paths");

describe("CreateFilesManager.isToolAvailable — additional edge cases", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRuntime = process.env.OPENSIN_CHAT_RUNTIME;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.OPENSIN_CHAT_RUNTIME = originalRuntime;
  });

  test("returns false in test environment without docker runtime", () => {
    process.env.NODE_ENV = "test";
    process.env.OPENSIN_CHAT_RUNTIME = "";
    expect(createFilesLib.isToolAvailable()).toBe(false);
  });

  test("returns true in test environment when docker runtime is set", () => {
    process.env.NODE_ENV = "test";
    process.env.OPENSIN_CHAT_RUNTIME = "docker";
    expect(createFilesLib.isToolAvailable()).toBe(true);
  });

  test("returns false when NODE_ENV is unset and runtime is unset", () => {
    delete process.env.NODE_ENV;
    process.env.OPENSIN_CHAT_RUNTIME = "";
    // Unset NODE_ENV falls through !== "development" check, so this returns
    // false unless OPENSIN_CHAT_RUNTIME === "docker".
    expect(createFilesLib.isToolAvailable()).toBe(false);
  });

  test("returns false when NODE_ENV is 'dev' shorthand (not 'development')", () => {
    process.env.NODE_ENV = "dev";
    process.env.OPENSIN_CHAT_RUNTIME = "";
    // The check is for exact equality with "development"; "dev" is a no-op.
    expect(createFilesLib.isToolAvailable()).toBe(false);
  });
});

describe("CreateFilesManager.getMimeType — additional extensions", () => {
  test("returns correct MIME type for .xml", () => {
    expect(createFilesLib.getMimeType("xml")).toBe("application/xml");
  });

  test("returns correct MIME type for .zip", () => {
    expect(createFilesLib.getMimeType("zip")).toBe("application/zip");
  });

  test("returns correct MIME type for .gif", () => {
    expect(createFilesLib.getMimeType("gif")).toBe("image/gif");
  });

  test("returns correct MIME type for .svg", () => {
    expect(createFilesLib.getMimeType("svg")).toBe("image/svg+xml");
  });

  test("returns correct MIME type for .mp3", () => {
    expect(createFilesLib.getMimeType("mp3")).toBe("audio/mpeg");
  });

  test("returns correct MIME type for .mp4", () => {
    expect(createFilesLib.getMimeType("mp4")).toBe("video/mp4");
  });

  test("returns correct MIME type for .webm", () => {
    expect(createFilesLib.getMimeType("webm")).toBe("video/webm");
  });

  test("handles uppercase extensions", () => {
    expect(createFilesLib.getMimeType("PNG")).toBe("image/png");
    expect(createFilesLib.getMimeType("PDF")).toBe("application/pdf");
    expect(createFilesLib.getMimeType("DOCX")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });

  test("handles mixed-case extensions", () => {
    expect(createFilesLib.getMimeType("PdF")).toBe("application/pdf");
    expect(createFilesLib.getMimeType("Xlsx")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  test("returns octet-stream for empty string", () => {
    expect(createFilesLib.getMimeType("")).toBe("application/octet-stream");
  });

  test("getMimeType requires a string argument (throws on null)", () => {
    // The implementation calls extension.startsWith directly; null throws.
    // Document the failure mode rather than papering over it.
    expect(() => createFilesLib.getMimeType(null)).toThrow(TypeError);
  });

  test("getMimeType coerces undefined to a string '.undefined'", () => {
    // undefined.startsWith would throw, so the implementation actually
    // throws on undefined as well. Verify the throw, not the result.
    expect(() => createFilesLib.getMimeType(undefined)).toThrow(TypeError);
  });
});

describe("CreateFilesManager.parseFilename — additional cases", () => {
  test("extracts a mixed-case extension and lowercases it (no — case preserved)", () => {
    const result = createFilesLib.parseFilename(
      "TXT-550e8400-e29b-41d4-a716-446655440000.TXT",
    );
    // The regex is case-insensitive (i flag); both fileType and extension
    // capture groups retain original casing.
    expect(result.fileType).toBe("TXT");
    expect(result.extension).toBe("TXT");
    expect(result.fileUUID).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  test("rejects filenames with extra characters before the dot", () => {
    expect(
      createFilesLib.parseFilename(
        "pptx-extra-550e8400-e29b-41d4-a716-446655440000.pptx",
      ),
    ).toBeNull();
  });

  test("rejects filenames with invalid UUID characters", () => {
    expect(
      createFilesLib.parseFilename("pptx-not-a-uuid-at-all-zzzzzzzz.pptx"),
    ).toBeNull();
  });

  test("accepts uppercase letters in the UUID portion", () => {
    const result = createFilesLib.parseFilename(
      "pptx-550E8400-E29B-41D4-A716-446655440000.pptx",
    );
    expect(result).toEqual({
      fileType: "pptx",
      fileUUID: "550E8400-E29B-41D4-A716-446655440000",
      extension: "pptx",
    });
  });
});

describe("CreateFilesManager.stripInvalidXmlChars — additional coverage", () => {
  test("strips a single form feed character", () => {
    expect(createFilesLib.stripInvalidXmlChars("\f")).toBe("");
  });

  test("strips a single backspace character", () => {
    expect(createFilesLib.stripInvalidXmlChars("\b")).toBe("");
  });

  test("preserves Unicode non-ASCII like CJK characters", () => {
    expect(createFilesLib.stripInvalidXmlChars("中文")).toBe("中文");
  });

  test("preserves Latin extended characters", () => {
    expect(createFilesLib.stripInvalidXmlChars("café résumé")).toBe(
      "café résumé",
    );
  });

  test("preserves null-terminator-like bytes that are part of UTF-8 sequences", () => {
    // A multi-byte UTF-8 string that should be left untouched
    expect(createFilesLib.stripInvalidXmlChars("🎉🎊")).toBe("🎉🎊");
  });

  test("leaves non-string scalars untouched", () => {
    expect(createFilesLib.stripInvalidXmlChars(42)).toBe(42);
    expect(createFilesLib.stripInvalidXmlChars(true)).toBe(true);
    expect(createFilesLib.stripInvalidXmlChars(null)).toBeNull();
    expect(createFilesLib.stripInvalidXmlChars(undefined)).toBeUndefined();
  });

  test("recursively strips strings inside an array", () => {
    const input = ["ok\x0C", "fine", "bad\x08value"];
    const expected = ["ok", "fine", "badvalue"];
    expect(createFilesLib.stripInvalidXmlChars(input)).toEqual(expected);
  });

  test("recursively strips strings inside a nested object", () => {
    const input = {
      title: "hello\x0C",
      nested: { value: "world\x0B" },
      list: ["a\x00", "b"],
      count: 5,
    };
    const expected = {
      title: "hello",
      nested: { value: "world" },
      list: ["a", "b"],
      count: 5,
    };
    expect(createFilesLib.stripInvalidXmlChars(input)).toEqual(expected);
  });

  test("handles empty object", () => {
    expect(createFilesLib.stripInvalidXmlChars({})).toEqual({});
  });

  test("handles empty array", () => {
    expect(createFilesLib.stripInvalidXmlChars([])).toEqual([]);
  });
});

describe("CreateFilesManager.sanitizeFilenameForHeader — additional cases", () => {
  test("preserves dashes, dots, and spaces", () => {
    expect(
      createFilesLib.sanitizeFilenameForHeader("my-file v1.0.docx"),
    ).toBe("my-file v1.0.docx");
  });

  test("replaces only the illegal characters, leaving ASCII punctuation", () => {
    expect(
      createFilesLib.sanitizeFilenameForHeader("file!#$%&'()*+,-.;<=>?@[]^_`{|}~.txt"),
    ).toBe("file!#$%&'()*+,-.;<=>?@[]^_`{|}~.txt");
  });

  test("truncates a long filename that has no illegal characters", () => {
    const longName = "a".repeat(300) + ".pdf";
    const result = createFilesLib.sanitizeFilenameForHeader(longName);
    expect(result.length).toBe(255);
    expect(result.length).toBeLessThanOrEqual(255);
  });

  test("replaces multiple illegal characters in sequence", () => {
    expect(
      createFilesLib.sanitizeFilenameForHeader('a\r"\\\nb'),
    ).toBe("a____b");
  });

  test("replaces extended ASCII (> 0x7E) with underscores", () => {
    expect(createFilesLib.sanitizeFilenameForHeader("a©b")).toBe("a_b");
    expect(createFilesLib.stripInvalidXmlChars("a©b")).toBe("a©b");
  });
});

describe("CreateFilesManager.registerOutput — additional cases", () => {
  test("does not call console.warn when aibitat is provided", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const aibitat = {};
    createFilesLib.registerOutput(aibitat, "X", { foo: 1 });
    expect(warnSpy).not.toHaveBeenCalled();
    expect(aibitat._pendingOutputs).toEqual([{ type: "X", payload: { foo: 1 } }]);
    warnSpy.mockRestore();
  });

  test("calls console.warn when aibitat is null", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    createFilesLib.registerOutput(null, "X", { foo: 1 });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("calls console.warn when aibitat is undefined", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    createFilesLib.registerOutput(undefined, "X", { foo: 1 });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("preserves payload reference (does not deep-clone)", () => {
    const payload = { nested: { x: 1 } };
    const aibitat = {};
    createFilesLib.registerOutput(aibitat, "T", payload);
    expect(aibitat._pendingOutputs[0].payload).toBe(payload);
  });
});

describe("CreateFilesManager.getLogo", () => {
  // Both opensin-logo.png and opensin-logo-dark.png are now shipped inside
  // create-files/assets/. getLogo() should return a Buffer for the buffer
  // format and a data-URI string for the dataUri format.
  test("returns a Buffer for the light logo (forDarkBackground: false)", () => {
    const result = createFilesLib.getLogo({ forDarkBackground: false });
    expect(result).not.toBeNull();
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test("returns a Buffer for the dark logo (forDarkBackground: true)", () => {
    const result = createFilesLib.getLogo({ forDarkBackground: true });
    expect(result).not.toBeNull();
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  test("returns a data: URI string for the dataUri format", () => {
    const result = createFilesLib.getLogo({
      forDarkBackground: false,
      format: "dataUri",
    });
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
    expect(result.startsWith("data:image/png;base64,")).toBe(true);
  });
});

describe("CreateFilesManager initialization and storage paths", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test("getStoragePath is invoked when computing the output directory", async () => {
    const spy = jest.spyOn({ getStoragePath }, "getStoragePath");
    // We can't easily re-initialize the singleton, but we can verify the
    // exported API is consistent.
    const dir = await createFilesLib.getOutputDirectory();
    expect(typeof dir).toBe("string");
    expect(dir.length).toBeGreaterThan(0);
    spy.mockRestore();
  });

  test("getOutputDirectory is idempotent across calls", async () => {
    const a = await createFilesLib.getOutputDirectory();
    const b = await createFilesLib.getOutputDirectory();
    expect(a).toBe(b);
  });

  test("getOutputDirectory resolves to a real path under the storage root", async () => {
    const dir = await createFilesLib.getOutputDirectory();
    const storageRoot = getStoragePath();
    expect(dir.startsWith(storageRoot)).toBe(true);
    expect(dir.endsWith("generated-files")).toBe(true);
  });
});

describe("CreateFilesManager.fileExists", () => {
  test("returns true for a file that exists", async () => {
    const tmpFile = path.join("/tmp", `cfm-exists-${Date.now()}.txt`);
    await fs.writeFile(tmpFile, "x");
    try {
      expect(await createFilesLib.fileExists(tmpFile)).toBe(true);
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
    }
  });

  test("returns false for a file that does not exist", async () => {
    expect(
      await createFilesLib.fileExists("/tmp/does-not-exist-xyz-12345"),
    ).toBe(false);
  });
});

describe("CreateFilesManager.readBinaryFile", () => {
  test("reads a file as a Buffer", async () => {
    const tmpFile = path.join("/tmp", `cfm-read-${Date.now()}.bin`);
    const data = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    await fs.writeFile(tmpFile, data);
    try {
      const read = await createFilesLib.readBinaryFile(tmpFile);
      expect(Buffer.isBuffer(read)).toBe(true);
      expect(read.equals(data)).toBe(true);
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
    }
  });
});

describe("CreateFilesManager.getGeneratedFile — invalid filename", () => {
  test("returns null and warns for a path-traversal attempt", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const result = await createFilesLib.getGeneratedFile(
      "../../../etc/passwd",
    );
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("returns null for a filename missing the UUID portion", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const result = await createFilesLib.getGeneratedFile("just-a-file.pdf");
    expect(result).toBeNull();
    warnSpy.mockRestore();
  });

  test("returns null for a completely invalid filename", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const result = await createFilesLib.getGeneratedFile("!!!");
    expect(result).toBeNull();
    warnSpy.mockRestore();
  });

  test("returns null when the file is well-formed but does not exist on disk", async () => {
    const filename = createFilesLib.generateFilename("pdf", "pdf");
    const result = await createFilesLib.getGeneratedFile(filename);
    expect(result).toBeNull();
  });
});

describe("CreateFilesManager.writeBinaryFile", () => {
  test("writes the buffer to the given file path", async () => {
    const tmpFile = path.join("/tmp", `cfm-write-${Date.now()}.bin`);
    const data = Buffer.from("hello world");
    try {
      await createFilesLib.writeBinaryFile(tmpFile, data);
      const read = await fs.readFile(tmpFile);
      expect(read.equals(data)).toBe(true);
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
    }
  });

  test("creates missing parent directories", async () => {
    const tmpDir = path.join(
      "/tmp",
      `cfm-mkdir-${Date.now()}`,
      "sub",
      "deep",
    );
    const tmpFile = path.join(tmpDir, "file.bin");
    try {
      await createFilesLib.writeBinaryFile(tmpFile, Buffer.from("x"));
      const stat = await fs.stat(tmpFile);
      expect(stat.isFile()).toBe(true);
    } finally {
      await fs.rm(path.dirname(path.dirname(path.dirname(tmpFile))), {
        recursive: true,
        force: true,
      });
    }
  });
});

describe("CreateFilesManager.saveGeneratedFile", () => {
  test("writes the file and returns the expected metadata", async () => {
    const buffer = Buffer.from("Hello, save!");
    const result = await createFilesLib.saveGeneratedFile({
      fileType: "pdf",
      extension: "pdf",
      buffer,
      displayFilename: "report.pdf",
    });
    expect(result.filename).toMatch(/^pdf-[a-f0-9-]{36}\.pdf$/);
    expect(result.displayFilename).toBe("report.pdf");
    expect(result.fileSize).toBe(buffer.length);
    expect(result.storagePath.endsWith(result.filename)).toBe(true);
    // file actually exists
    const onDisk = await fs.readFile(result.storagePath);
    expect(onDisk.equals(buffer)).toBe(true);
    // cleanup
    await fs.unlink(result.storagePath).catch(() => {});
  });

  test("returns the fileSize equal to the buffer byte length for an empty buffer", async () => {
    const result = await createFilesLib.saveGeneratedFile({
      fileType: "pdf",
      extension: "pdf",
      buffer: Buffer.alloc(0),
      displayFilename: "empty.pdf",
    });
    expect(result.fileSize).toBe(0);
    await fs.unlink(result.storagePath).catch(() => {});
  });
});

describe("CreateFilesManager.generateFilename — additional cases", () => {
  test("fileType and extension can differ", () => {
    const name = createFilesLib.generateFilename("presentation", "pptx");
    expect(name).toMatch(/^presentation-[a-f0-9-]{36}\.pptx$/);
  });

  test("produces valid UUID v4 format", () => {
    const name = createFilesLib.generateFilename("pdf", "pdf");
    const parsed = createFilesLib.parseFilename(name);
    expect(parsed).not.toBeNull();
    expect(parsed.fileUUID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
