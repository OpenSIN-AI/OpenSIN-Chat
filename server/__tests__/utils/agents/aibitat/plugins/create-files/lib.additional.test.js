// SPDX-License-Identifier: MIT
/* eslint-env jest */

const createFilesLib = require("../../../../../../utils/agents/aibitat/plugins/create-files/lib.js");

describe("CreateFilesManager.getMimeType", () => {
  test("returns correct MIME type for .pptx", () => {
    expect(createFilesLib.getMimeType("pptx")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
  });

  test("returns correct MIME type for .xlsx", () => {
    expect(createFilesLib.getMimeType("xlsx")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  test("returns correct MIME type for .docx", () => {
    expect(createFilesLib.getMimeType("docx")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });

  test("returns correct MIME type for .pdf", () => {
    expect(createFilesLib.getMimeType("pdf")).toBe("application/pdf");
  });

  test("returns correct MIME type for .txt", () => {
    expect(createFilesLib.getMimeType("txt")).toBe("text/plain");
  });

  test("returns correct MIME type for .csv", () => {
    expect(createFilesLib.getMimeType("csv")).toBe("text/csv");
  });

  test("returns correct MIME type for .json", () => {
    expect(createFilesLib.getMimeType("json")).toBe("application/json");
  });

  test("returns correct MIME type for .html", () => {
    expect(createFilesLib.getMimeType("html")).toBe("text/html");
  });

  test("returns correct MIME type for .png", () => {
    expect(createFilesLib.getMimeType("png")).toBe("image/png");
  });

  test("returns correct MIME type for .jpg", () => {
    expect(createFilesLib.getMimeType("jpg")).toBe("image/jpeg");
  });

  test("returns correct MIME type for .jpeg", () => {
    expect(createFilesLib.getMimeType("jpeg")).toBe("image/jpeg");
  });

  test("returns octet-stream for unknown extension", () => {
    expect(createFilesLib.getMimeType("xyz")).toBe("application/octet-stream");
  });

  test("handles extension with dot prefix", () => {
    expect(createFilesLib.getMimeType(".pdf")).toBe("application/pdf");
  });

  test("handles extension with dot prefix for unknown type", () => {
    expect(createFilesLib.getMimeType(".unknown")).toBe(
      "application/octet-stream",
    );
  });

  test("is case-insensitive", () => {
    expect(createFilesLib.getMimeType("PDF")).toBe("application/pdf");
    expect(createFilesLib.getMimeType("Pptx")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
  });
});

describe("CreateFilesManager.sanitizeFilenameForHeader", () => {
  test('returns "download" for null', () => {
    expect(createFilesLib.sanitizeFilenameForHeader(null)).toBe("download");
  });

  test('returns "download" for undefined', () => {
    expect(createFilesLib.sanitizeFilenameForHeader(undefined)).toBe("download");
  });

  test('returns "download" for empty string', () => {
    expect(createFilesLib.sanitizeFilenameForHeader("")).toBe("download");
  });

  test('returns "download" for non-string input', () => {
    expect(createFilesLib.sanitizeFilenameForHeader(123)).toBe("download");
  });

  test("replaces carriage return with underscore", () => {
    expect(createFilesLib.sanitizeFilenameForHeader("file\rname.pptx")).toBe(
      "file_name.pptx",
    );
  });

  test("replaces newline with underscore", () => {
    expect(createFilesLib.sanitizeFilenameForHeader("file\nname.pptx")).toBe(
      "file_name.pptx",
    );
  });

  test('replaces double quote with underscore', () => {
    expect(createFilesLib.sanitizeFilenameForHeader('file"name.pptx')).toBe(
      "file_name.pptx",
    );
  });

  test("replaces backslash with underscore", () => {
    expect(createFilesLib.sanitizeFilenameForHeader("file\\name.pptx")).toBe(
      "file_name.pptx",
    );
  });

  test("replaces non-ASCII characters with underscore", () => {
    expect(createFilesLib.sanitizeFilenameForHeader("fïlé.pptx")).toBe(
      "f_l_.pptx",
    );
  });

  test("preserves normal ASCII filename", () => {
    expect(
      createFilesLib.sanitizeFilenameForHeader("report-2024-Q1.xlsx"),
    ).toBe("report-2024-Q1.xlsx");
  });

  test("truncates to 255 characters max", () => {
    const longName = "a".repeat(300) + ".pptx";
    const result = createFilesLib.sanitizeFilenameForHeader(longName);
    expect(result.length).toBe(255);
  });

  test("handles combined injection attempts", () => {
    const malicious = 'file.pptx"\r\nContent-Type: evil';
    const result = createFilesLib.sanitizeFilenameForHeader(malicious);
    expect(result).not.toMatch(/[\r\n"]/);
  });
});

describe("CreateFilesManager.parseFilename", () => {
  test("parses valid filename format", () => {
    const result = createFilesLib.parseFilename(
      "pptx-550e8400-e29b-41d4-a716-446655440000.pptx",
    );
    expect(result).toEqual({
      fileType: "pptx",
      fileUUID: "550e8400-e29b-41d4-a716-446655440000",
      extension: "pptx",
    });
  });

  test("parses xlsx filename", () => {
    const result = createFilesLib.parseFilename(
      "xlsx-6ba7b810-9dad-11d1-80b4-00c04fd430c8.xlsx",
    );
    expect(result).toEqual({
      fileType: "xlsx",
      fileUUID: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      extension: "xlsx",
    });
  });

  test("returns null for invalid filename without UUID", () => {
    expect(createFilesLib.parseFilename("just-a-file.pptx")).toBeNull();
  });

  test("returns null for filename without extension", () => {
    expect(
      createFilesLib.parseFilename(
        "pptx-550e8400-e29b-41d4-a716-446655440000",
      ),
    ).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(createFilesLib.parseFilename("")).toBeNull();
  });

  test("returns null for path traversal attempt", () => {
    expect(createFilesLib.parseFilename("../../etc/passwd")).toBeNull();
  });
});

describe("CreateFilesManager.generateFilename", () => {
  test("generates filename in {type}-{uuid}.{ext} format", () => {
    const result = createFilesLib.generateFilename("pptx", "pptx");
    expect(result).toMatch(/^pptx-[a-f0-9-]{36}\.pptx$/);
  });

  test("generates different UUIDs for successive calls", () => {
    const a = createFilesLib.generateFilename("xlsx", "xlsx");
    const b = createFilesLib.generateFilename("xlsx", "xlsx");
    expect(a).not.toBe(b);
  });

  test("uses provided fileType in filename", () => {
    const result = createFilesLib.generateFilename("docx", "docx");
    expect(result.startsWith("docx-")).toBe(true);
  });
});

describe("CreateFilesManager.registerOutput", () => {
  test("creates _pendingOutputs array if missing", () => {
    const aibitat = {};
    createFilesLib.registerOutput(aibitat, "PptxFileDownload", {
      filename: "test.pptx",
    });
    expect(Array.isArray(aibitat._pendingOutputs)).toBe(true);
    expect(aibitat._pendingOutputs).toHaveLength(1);
  });

  test("pushes to existing _pendingOutputs array", () => {
    const aibitat = { _pendingOutputs: [{ type: "existing", payload: {} }] };
    createFilesLib.registerOutput(aibitat, "XlsxFileDownload", {
      filename: "test.xlsx",
    });
    expect(aibitat._pendingOutputs).toHaveLength(2);
    expect(aibitat._pendingOutputs[1]).toEqual({
      type: "XlsxFileDownload",
      payload: { filename: "test.xlsx" },
    });
  });

  test("handles null aibitat gracefully", () => {
    expect(() => {
      createFilesLib.registerOutput(null, "PptxFileDownload", {});
    }).not.toThrow();
  });

  test("handles undefined aibitat gracefully", () => {
    expect(() => {
      createFilesLib.registerOutput(undefined, "PptxFileDownload", {});
    }).not.toThrow();
  });
});

describe("CreateFilesManager.isToolAvailable", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRuntime = process.env.ANYTHING_LLM_RUNTIME;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ANYTHING_LLM_RUNTIME = originalRuntime;
  });

  test("returns true in development environment", () => {
    process.env.NODE_ENV = "development";
    process.env.ANYTHING_LLM_RUNTIME = "";
    expect(createFilesLib.isToolAvailable()).toBe(true);
  });

  test("returns true when ANYTHING_LLM_RUNTIME is docker", () => {
    process.env.NODE_ENV = "production";
    process.env.ANYTHING_LLM_RUNTIME = "docker";
    expect(createFilesLib.isToolAvailable()).toBe(true);
  });

  test("returns false in production without docker runtime", () => {
    process.env.NODE_ENV = "production";
    process.env.ANYTHING_LLM_RUNTIME = "";
    expect(createFilesLib.isToolAvailable()).toBe(false);
  });

  test("returns false in production with non-docker runtime", () => {
    process.env.NODE_ENV = "production";
    process.env.ANYTHING_LLM_RUNTIME = "local";
    expect(createFilesLib.isToolAvailable()).toBe(false);
  });
});
