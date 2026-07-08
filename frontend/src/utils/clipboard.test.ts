// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/utils/chat/markdown", () => ({
  default: (text) => `<p>${text}</p>`,
}));

vi.mock("@/utils/logger", () => ({
  default: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    reportError: vi.fn(),
  },
}));

import { copyMarkdownAsRichText, copyText } from "./clipboard";
import logger from "@/utils/logger";

describe("clipboard utilities", () => {
  let originalClipboard;

  beforeEach(() => {
    vi.clearAllMocks();
    originalClipboard = navigator.clipboard;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  describe("copyText", () => {
    it("returns false for empty string", async () => {
      const result = await copyText("");
      expect(result).toBe(false);
    });

    it("returns false for non-string input", async () => {
      const result = await copyText(null);
      expect(result).toBe(false);
    });

    it("returns true when clipboard.writeText succeeds", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        writable: true,
        configurable: true,
      });
      const result = await copyText("hello world");
      expect(result).toBe(true);
      expect(writeText).toHaveBeenCalledWith("hello world");
    });

    it("falls back to execCommand when clipboard API throws", async () => {
      const writeText = vi.fn().mockRejectedValue(new Error("not allowed"));
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        writable: true,
        configurable: true,
      });
      document.execCommand = vi.fn(() => true);
      const result = await copyText("fallback text");
      expect(result).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith("copy");
    });

    it("returns false when both clipboard and execCommand fail", async () => {
      const writeText = vi.fn().mockRejectedValue(new Error("not allowed"));
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        writable: true,
        configurable: true,
      });
      document.execCommand = vi.fn(() => false);
      const result = await copyText("test");
      expect(result).toBe(false);
    });

    it("returns false when navigator.clipboard is undefined", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      document.execCommand = vi.fn(() => true);
      const result = await copyText("no clipboard api");
      expect(result).toBe(true);
    });
  });

  describe("copyMarkdownAsRichText", () => {
    it("returns true when clipboard.write succeeds", async () => {
      const write = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { write },
        writable: true,
        configurable: true,
      });
      const result = await copyMarkdownAsRichText("**bold**");
      expect(result).toBe(true);
      expect(write).toHaveBeenCalledTimes(1);
    });

    it("returns false and logs error when clipboard.write throws", async () => {
      const write = vi.fn().mockRejectedValue(new Error("denied"));
      Object.defineProperty(navigator, "clipboard", {
        value: { write },
        writable: true,
        configurable: true,
      });
      const result = await copyMarkdownAsRichText("**bold**");
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
