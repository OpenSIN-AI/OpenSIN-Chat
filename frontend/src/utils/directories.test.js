// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateTimeAsMoment,
  getFileExtension,
  middleTruncate,
} from "./directories";

describe("formatDate", () => {
  it("formats a valid ISO date string", () => {
    const result = formatDate("2025-01-15");
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2025/);
  });

  it("falls back to em-dash for invalid date", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("formatDateTimeAsMoment", () => {
  it("returns em-dash for null input", () => {
    expect(formatDateTimeAsMoment(null, "YYYY-MM-DD")).toBe("—");
  });

  it("formats a valid date with the given format", () => {
    const result = formatDateTimeAsMoment("2025-06-08T14:30:00Z", "YYYY-MM-DD");
    expect(result).toBe("2025-06-08");
  });

  it("returns em-dash for unparseable input (dayjs does not throw)", () => {
    expect(formatDateTimeAsMoment("garbage", "YYYY-MM-DD")).toBe("—");
  });
});

describe("getFileExtension", () => {
  it('returns uppercase extension for "file.txt"', () => {
    expect(getFileExtension("file.txt")).toBe("TXT");
  });

  it('returns "FILE" for name without extension', () => {
    expect(getFileExtension("file")).toBe("FILE");
  });

  it('returns "FILE" for null', () => {
    expect(getFileExtension(null)).toBe("FILE");
  });

  it('returns last extension for "archive.tar.gz"', () => {
    expect(getFileExtension("archive.tar.gz")).toBe("GZ");
  });

  it('returns "FILE" for undefined', () => {
    expect(getFileExtension(undefined)).toBe("FILE");
  });
});

describe("middleTruncate", () => {
  it("leaves short strings unchanged", () => {
    expect(middleTruncate("hello", 10)).toBe("hello");
  });

  it("truncates long strings with extension preserved", () => {
    const result = middleTruncate("verylongfilename.txt", 10);
    expect(result).toContain("...");
    expect(result).toContain("txt");
  });

  it("truncates long strings without extension", () => {
    const result = middleTruncate("verylongfilename", 8);
    expect(result).toContain("...");
    expect(result.length).toBeLessThanOrEqual(12);
  });
});
