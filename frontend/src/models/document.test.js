// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Document model", () => {
  let originalFetch;
  let originalEnv;
  let consoleErrorSpy;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalEnv = { ...import.meta.env };
    vi.stubEnv("VITE_API_BASE", "/api");
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.assign(import.meta.env, originalEnv);
    vi.clearAllMocks();
    vi.resetModules();
    consoleErrorSpy.mockRestore();
  });

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  describe("createFolder", () => {
    it("creates folder with name", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ success: true, folder: "new-folder" }),
        );
      const { default: Document } = await import("./document");
      const result = await Document.createFolder("new-folder");
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/document/create-folder",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "new-folder" }),
        }),
      );
    });

    it("returns error on failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      const { default: Document } = await import("./document");
      const result = await Document.createFolder("test");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("handles non-ok response", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ success: false, error: "Invalid name" }, 400),
        );
      const { default: Document } = await import("./document");
      const result = await Document.createFolder("test");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid name");
    });
  });

  describe("moveToFolder", () => {
    it("moves files to folder with correct mapping", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
      const { default: Document } = await import("./document");

      const files = [
        { name: "file1.txt", folderName: "source" },
        { name: "file2.txt" },
      ];

      const result = await Document.moveToFolder(files, "destination");

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/document/move-files",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            files: [
              { from: "source/file1.txt", to: "destination/file1.txt" },
              { from: "file2.txt", to: "destination/file2.txt" },
            ],
          }),
        }),
      );
    });

    it("returns error on failure", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Move failed"));
      const { default: Document } = await import("./document");
      const result = await Document.moveToFolder(
        [{ name: "file.txt" }],
        "dest",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Move failed");
    });

    it("handles empty files array", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
      const { default: Document } = await import("./document");
      const result = await Document.moveToFolder([], "dest");
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/document/move-files",
        expect.objectContaining({
          body: JSON.stringify({ files: [] }),
        }),
      );
    });
  });
});
