// SPDX-License-Identifier: MIT
// Tests for middleTruncate — string truncation with extension preservation.
// Issue #391
import { describe, it, expect } from "vitest";
import { middleTruncate } from "./directories";

describe("middleTruncate – various inputs", () => {
  it("returns short strings unchanged", () => {
    expect(middleTruncate("hello", 10)).toBe("hello");
  });

  it("returns strings exactly at the threshold unchanged", () => {
    expect(middleTruncate("12345678", 8)).toBe("12345678");
  });

  it("truncates long strings with file extension preserved", () => {
    const result = middleTruncate("verylongfilename.txt", 10);
    expect(result).toContain("...");
    expect(result).toContain("txt");
    expect(result.length).toBeLessThan("verylongfilename.txt".length);
  });

  it("truncates long strings without extension", () => {
    const result = middleTruncate("verylongfilename", 8);
    expect(result).toContain("...");
    expect(result.length).toBeLessThanOrEqual(12);
  });

  it("preserves the extension at the end of truncated output", () => {
    const result = middleTruncate("superlongdocumentname.pdf", 12);
    expect(result.endsWith("pdf")).toBe(true);
  });

  it("preserves multi-part extensions (last segment only)", () => {
    const result = middleTruncate("archive.tar.gz", 10);
    expect(result).toContain("...");
    expect(result.endsWith("gz")).toBe(true);
  });

  it("handles very short truncation thresholds", () => {
    const result = middleTruncate("verylongfilename.txt", 5);
    expect(result).toContain("...");
  });

  it("handles strings with no dots as no-extension", () => {
    const result = middleTruncate("abcdefghijklmnopqrstuvwxyz", 10);
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(26);
  });

  it("preserves the last 4 characters of the name part", () => {
    const result = middleTruncate("verylongfilename", 12);
    // The non-extension path keeps the last 4 chars
    expect(result).toContain("...");
  });

  it("handles single character strings", () => {
    expect(middleTruncate("a", 10)).toBe("a");
  });

  it("handles empty string", () => {
    expect(middleTruncate("", 10)).toBe("");
  });

  it("handles strings with dots in the middle (not extension)", () => {
    const result = middleTruncate("file.name.with.dots.txt", 12);
    expect(result).toContain("...");
    expect(result.endsWith("txt")).toBe(true);
  });

  it("truncates a very long filename with extension", () => {
    const longName = "a".repeat(100) + ".json";
    const result = middleTruncate(longName, 20);
    expect(result).toContain("...");
    expect(result.endsWith("json")).toBe(true);
    expect(result.length).toBeLessThan(100);
  });

  it("handles extension-only filenames", () => {
    // ".gitignore" — the extension regex captures "gitignore"
    const result = middleTruncate(".gitignore", 5);
    expect(result).toContain("...");
  });

  it("does not truncate when string length equals threshold", () => {
    expect(middleTruncate("exact", 5)).toBe("exact");
  });

  it("handles large threshold values (no truncation needed)", () => {
    expect(middleTruncate("short.txt", 100)).toBe("short.txt");
  });
});
