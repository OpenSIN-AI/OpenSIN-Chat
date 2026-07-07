// SPDX-License-Identifier: MIT
// Tests for copyText — clipboard copy with fallback.
// Issue #391
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyText } from "./clipboard";

// Mock chat/markdown to avoid circular dependency chain (useTheme etc.)
vi.mock("./chat/markdown", () => ({
  default: (text: string) => `<p>${text}</p>`,
}));

describe("copyText – clipboard copy function", () => {
  let originalClipboard: any;
  let originalExecCommand: any;

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
    originalExecCommand = document.execCommand;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
    document.execCommand = originalExecCommand;
  });

  function setClipboard(mock: any) {
    Object.defineProperty(navigator, "clipboard", {
      value: mock,
      writable: true,
      configurable: true,
    });
  }

  it("returns false for empty string", async () => {
    setClipboard({ writeText: vi.fn() });
    expect(await copyText("")).toBe(false);
  });

  it("returns false for non-string input", async () => {
    setClipboard({ writeText: vi.fn() });
    expect(await copyText(null as any)).toBe(false);
    expect(await copyText(undefined as any)).toBe(false);
    expect(await copyText(123 as any)).toBe(false);
  });

  it("copies text via navigator.clipboard.writeText when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const result = await copyText("Hello, world!");
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith("Hello, world!");
  });

  it("returns true on successful clipboard write", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    expect(await copyText("test text")).toBe(true);
  });

  it("falls back to execCommand when navigator.clipboard is undefined", async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn().mockReturnValue(true);
    const result = await copyText("fallback text");
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("falls back to execCommand when navigator.clipboard.writeText throws", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    setClipboard({ writeText });
    document.execCommand = vi.fn().mockReturnValue(true);
    const result = await copyText("test text");
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("returns false when both clipboard and execCommand fail", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Denied"));
    setClipboard({ writeText });
    document.execCommand = vi.fn().mockReturnValue(false);
    const result = await copyText("test text");
    expect(result).toBe(false);
  });

  it("returns false when execCommand throws", async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error("execCommand error");
    });
    const result = await copyText("test text");
    expect(result).toBe(false);
  });

  it("handles multiline text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const multiline = "Line 1\nLine 2\nLine 3";
    const result = await copyText(multiline);
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith(multiline);
  });

  it("handles special characters in text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const special = "Hello <world> & 'friends' \"!\"";
    const result = await copyText(special);
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith(special);
  });

  it("handles very long text strings", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const longText = "A".repeat(10000);
    const result = await copyText(longText);
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith(longText);
  });

  it("handles Unicode text correctly", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const unicode = "Hello 世界 🌍 café";
    const result = await copyText(unicode);
    expect(result).toBe(true);
    expect(writeText).toHaveBeenCalledWith(unicode);
  });

  it("creates and removes a textarea element when using fallback", async () => {
    setClipboard(undefined);
    document.execCommand = vi.fn().mockReturnValue(true);
    const spy = vi.spyOn(document, "createElement");
    const result = await copyText("fallback test");
    expect(result).toBe(true);
    expect(spy).toHaveBeenCalledWith("textarea");
  });
});
