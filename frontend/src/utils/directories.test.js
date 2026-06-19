// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
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

  it("falls back to today for invalid date", () => {
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    expect(formatDate("not-a-date")).toBe(today);
  });
});

describe("formatDateTimeAsMoment", () => {
  it("returns current moment for null input", () => {
    const result = formatDateTimeAsMoment(null, "YYYY-MM-DD");
    const today = dayjs().format("YYYY-MM-DD");
    expect(result).toBe(today);
  });

  it("formats a valid date with the given format", () => {
    const result = formatDateTimeAsMoment("2025-06-08T14:30:00Z", "YYYY-MM-DD");
    expect(result).toBe("2025-06-08");
  });

  it('returns "Invalid Date" for unparseable input (dayjs does not throw)', () => {
    const result = formatDateTimeAsMoment("garbage", "YYYY-MM-DD");
    expect(result).toBe("Invalid Date");
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
