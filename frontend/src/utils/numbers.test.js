// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";

import {
  numberWithCommas,
  nFormatter,
  dollarFormat,
  toPercentString,
  humanFileSize,
  milliToHms,
  formatDuration,
} from "./numbers";

describe("utils/numbers – numberWithCommas", () => {
  it("inserts commas into 4-digit numbers", () => {
    expect(numberWithCommas(1234)).toBe("1,234");
  });

  it("inserts commas into 7-digit numbers", () => {
    expect(numberWithCommas(1234567)).toBe("1,234,567");
  });

  it("leaves small numbers alone", () => {
    expect(numberWithCommas(999)).toBe("999");
  });

  it("leaves zero alone", () => {
    expect(numberWithCommas(0)).toBe("0");
  });

  it("works on numeric strings", () => {
    expect(numberWithCommas("1000000")).toBe("1,000,000");
  });

  it("handles negative numbers", () => {
    expect(numberWithCommas(-1234567)).toBe("-1,234,567");
  });

  it("does not insert a comma for a 3-digit number", () => {
    expect(numberWithCommas(100)).toBe("100");
  });
});

describe("utils/numbers – nFormatter", () => {
  it("formats thousands in compact notation", () => {
    expect(nFormatter(1500)).toMatch(/1\.5K|2K/);
  });

  it("formats millions", () => {
    expect(nFormatter(2_000_000)).toMatch(/2M/);
  });

  it("formats billions", () => {
    expect(nFormatter(3_000_000_000)).toMatch(/3B/);
  });

  it("leaves small numbers un-suffixed", () => {
    expect(nFormatter(42)).toBe("42");
  });
});

describe("utils/numbers – dollarFormat", () => {
  it("formats whole-dollar amounts", () => {
    expect(dollarFormat(5)).toBe("$5.00");
  });

  it("formats amounts with cents", () => {
    expect(dollarFormat(12.5)).toBe("$12.50");
  });

  it("formats amounts with rounding to 2 decimals", () => {
    expect(dollarFormat(1.999)).toBe("$2.00");
  });

  it("formats zero", () => {
    expect(dollarFormat(0)).toBe("$0.00");
  });

  it("formats negative amounts", () => {
    expect(dollarFormat(-9.99)).toBe("-$9.99");
  });
});

describe("utils/numbers – toPercentString", () => {
  it("returns an empty string for null", () => {
    expect(toPercentString(null)).toBe("");
  });

  it("returns an empty string for NaN", () => {
    expect(toPercentString(NaN)).toBe("");
  });

  it("returns '0%' for input 0", () => {
    expect(toPercentString(0)).toBe("0%");
  });

  it("returns '50%' for input 0.5", () => {
    expect(toPercentString(0.5)).toBe("50%");
  });

  it("returns '100%' for input 1", () => {
    expect(toPercentString(1)).toBe("100%");
  });

  it("rounds to nearest integer by default", () => {
    expect(toPercentString(0.126)).toBe("13%");
  });

  it("respects the decimals argument on the integer part of the percent", () => {
    // toPercentString uses Math.round first, THEN toFixed — so the decimal
    // argument only affects trailing zeros / width, not the precision of the
    // rounding itself. 0.1234 * 100 = 12.34 → round to 12 → "12.00%".
    expect(toPercentString(0.1234, 2)).toBe("12.00%");
  });

  it("respects the decimals argument for values that round to a tenths/decimal place", () => {
    // 0.125 * 100 = 12.5 → round to 13 (half-up), decimals default 0.
    expect(toPercentString(0.125, 0)).toBe("13%");
    // Same rounding, padded to 2 decimals.
    expect(toPercentString(0.125, 2)).toBe("13.00%");
  });

  it("uses 0 decimals when decimals is 0 explicitly", () => {
    expect(toPercentString(0.5, 0)).toBe("50%");
  });
});

describe("utils/numbers – humanFileSize", () => {
  it("formats sub-1KiB values in bytes", () => {
    expect(humanFileSize(500)).toBe("500 B");
  });

  it("formats 0 bytes", () => {
    expect(humanFileSize(0)).toBe("0 B");
  });

  it("formats KiB by default (binary)", () => {
    expect(humanFileSize(1024)).toBe("1.0 KiB");
  });

  it("formats MiB by default (binary)", () => {
    expect(humanFileSize(1024 * 1024)).toBe("1.0 MiB");
  });

  it("formats kB when si=true (decimal)", () => {
    expect(humanFileSize(1000, true)).toBe("1.0 kB");
  });

  it("formats MB when si=true (decimal)", () => {
    expect(humanFileSize(1000 * 1000, true)).toBe("1.0 MB");
  });

  it("respects the dp argument (decimals)", () => {
    expect(humanFileSize(1500, false, 2)).toBe("1.46 KiB");
  });

  it("handles negative bytes", () => {
    // |bytes| < thresh → returns "X B" with the original sign
    expect(humanFileSize(-500)).toBe("-500 B");
  });

  it("promotes units when value crosses the threshold", () => {
    // 1024 * 1024 * 1024 → 1.0 GiB
    expect(humanFileSize(1024 ** 3)).toBe("1.0 GiB");
  });
});

describe("utils/numbers – milliToHms", () => {
  it("formats milliseconds as h/m/s with 2-decimal seconds", () => {
    expect(milliToHms(0)).toBe("");
    expect(milliToHms(1000)).toBe("1.00s");
    // 60_000ms = 60s = 1m. The seconds remainder is 0, which is < 0.01,
    // so the seconds portion is dropped. The minutes are kept (1m).
    expect(milliToHms(60_000)).toBe("1m ");
    // 3_600_000ms = 1h. The minute and second remainders are both 0 and
    // dropped, so the output is just "1h ".
    expect(milliToHms(3_600_000)).toBe("1h ");
  });

  it("combines hours, minutes, seconds", () => {
    // 1h 30m 5s = 3600 + 30*60 + 5 = 5405 seconds = 5_405_000 ms
    expect(milliToHms(5_405_000)).toBe("1h 30m 5.00s");
  });

  it("omits hour label when 0h", () => {
    expect(milliToHms(125_000)).toBe("2m 5.00s");
  });

  it("omits sub-0.01-second remainder", () => {
    // 1.005s = 1005ms → s = 1.005, sDisplay = "1.00s" (since s >= 0.01)
    expect(milliToHms(1005)).toBe("1.00s");
  });
});

describe("utils/numbers – formatDuration", () => {
  it("returns an empty string for negative durations", () => {
    expect(formatDuration(-5)).toBe("");
  });

  it("returns '<n>ms' for sub-1-second durations", () => {
    expect(formatDuration(0.5)).toBe("500ms");
    expect(formatDuration(0.05)).toBe("50ms");
  });

  it("returns '<n>s' for sub-1-minute durations", () => {
    expect(formatDuration(5)).toBe("5.0s");
    expect(formatDuration(59)).toBe("59.0s");
  });

  it("returns '<m>m <s>s' for sub-1-hour durations", () => {
    expect(formatDuration(60)).toBe("1m 0s");
    expect(formatDuration(90)).toBe("1m 30s");
    expect(formatDuration(3599)).toBe("59m 59s");
  });

  it("returns '<h>h <m>m <s>s' for 1h+ durations", () => {
    expect(formatDuration(3600)).toBe("1h 0m 0s");
    expect(formatDuration(3661)).toBe("1h 1m 1s");
    expect(formatDuration(7325)).toBe("2h 2m 5s");
  });

  it("returns an empty string on thrown errors (try/catch fallback)", () => {
    // Pass a value that will throw when methods are called.
    const sym = Symbol("boom");
    expect(formatDuration(sym)).toBe("");
  });
});
