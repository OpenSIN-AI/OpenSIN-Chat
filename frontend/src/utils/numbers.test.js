import { describe, it, expect } from "vitest";
import {
  numberWithCommas,
  toPercentString,
  humanFileSize,
  milliToHms,
  formatDuration,
} from "./numbers";

describe("numberWithCommas", () => {
  it("inserts thousands separators", () => {
    expect(numberWithCommas(1000)).toBe("1,000");
    expect(numberWithCommas(1234567)).toBe("1,234,567");
  });

  it("leaves numbers under 1000 untouched", () => {
    expect(numberWithCommas(999)).toBe("999");
    expect(numberWithCommas(0)).toBe("0");
  });
});

describe("toPercentString", () => {
  it("converts a ratio to a percent string", () => {
    expect(toPercentString(0.5)).toBe("50%");
    expect(toPercentString(1)).toBe("100%");
  });

  it("pads with the requested number of decimals (value is rounded to whole percent first)", () => {
    // Note: toPercentString rounds to a whole percent before padding,
    // so the decimals are always zeros. This documents current behaviour.
    expect(toPercentString(0.1234, 2)).toBe("12.00%");
    expect(toPercentString(0.5, 2)).toBe("50.00%");
  });

  it("returns an empty string for null or NaN input", () => {
    expect(toPercentString(null)).toBe("");
    expect(toPercentString("not-a-number")).toBe("");
    expect(toPercentString()).toBe("");
  });
});

describe("humanFileSize", () => {
  it("returns bytes below the threshold", () => {
    expect(humanFileSize(500)).toBe("500 B");
  });

  it("formats using binary units by default", () => {
    expect(humanFileSize(1024)).toBe("1.0 KiB");
    expect(humanFileSize(1024 * 1024)).toBe("1.0 MiB");
  });

  it("formats using SI units when requested", () => {
    expect(humanFileSize(1000, true)).toBe("1.0 kB");
    expect(humanFileSize(1_000_000, true)).toBe("1.0 MB");
  });
});

describe("milliToHms", () => {
  it("formats hours, minutes and seconds", () => {
    expect(milliToHms(3_661_000)).toBe("1h 1m 1.00s");
  });

  it("omits empty leading units", () => {
    expect(milliToHms(5_000)).toBe("5.00s");
  });
});

describe("formatDuration", () => {
  it("returns an empty string for negative durations", () => {
    expect(formatDuration(-1)).toBe("");
  });

  it("shows milliseconds below one second", () => {
    expect(formatDuration(0.05)).toBe("50ms");
  });

  it("shows seconds below one minute", () => {
    expect(formatDuration(5)).toBe("5.0s");
  });

  it("shows minutes and seconds below one hour", () => {
    expect(formatDuration(90)).toBe("1m 30s");
  });

  it("shows hours, minutes and seconds at or above one hour", () => {
    expect(formatDuration(3665)).toBe("1h 1m 5s");
  });
});
