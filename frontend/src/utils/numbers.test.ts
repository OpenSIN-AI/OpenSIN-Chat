// SPDX-License-Identifier: MIT
// Tests for milliToHms — millisecond to h/m/s formatting.
// Issue #391
import { describe, it, expect } from "vitest";
import { milliToHms } from "./numbers";

describe("milliToHms – various inputs", () => {
  it("returns '0.00s' for 0 milliseconds", () => {
    // s=0, s>=0 is true, so sDisplay="0.00s"
    expect(milliToHms(0)).toBe("0.00s");
  });

  it("returns '0.00s' for default parameter (no argument)", () => {
    expect(milliToHms()).toBe("0.00s");
  });

  it("formats 1 second (1000ms)", () => {
    expect(milliToHms(1000)).toBe("1.00s");
  });

  it("formats sub-second values with 2 decimal places", () => {
    expect(milliToHms(500)).toBe("0.50s");
  });

  it("formats 5.5 seconds", () => {
    expect(milliToHms(5500)).toBe("5.50s");
  });

  it("formats exactly 1 minute (60s) with zero seconds shown", () => {
    // 60_000ms = 60s = 1m 0.00s. The s >= 0 check always includes seconds.
    expect(milliToHms(60_000)).toBe("1m 0.00s");
  });

  it("formats 1 minute 30 seconds", () => {
    expect(milliToHms(90_000)).toBe("1m 30.00s");
  });

  it("formats 2 minutes 5 seconds", () => {
    expect(milliToHms(125_000)).toBe("2m 5.00s");
  });

  it("formats exactly 1 hour (3600s) with zero seconds shown", () => {
    // 3_600_000ms = 1h. m=0 so mDisplay omitted, s=0 so sDisplay="0.00s".
    expect(milliToHms(3_600_000)).toBe("1h 0.00s");
  });

  it("formats 1 hour 30 minutes 5 seconds", () => {
    expect(milliToHms(5_405_000)).toBe("1h 30m 5.00s");
  });

  it("formats 2 hours 0 minutes 0 seconds", () => {
    // m=0 so mDisplay omitted, s=0 so sDisplay="0.00s"
    expect(milliToHms(7_200_000)).toBe("2h 0.00s");
  });

  it("formats 2 hours 15 minutes 30 seconds", () => {
    // 2*3600 + 15*60 + 30 = 7200 + 900 + 30 = 8130 seconds = 8_130_000 ms
    expect(milliToHms(8_130_000)).toBe("2h 15m 30.00s");
  });

  it("omits hours label when 0 hours", () => {
    expect(milliToHms(125_000)).toBe("2m 5.00s");
    expect(milliToHms(125_000)).not.toContain("h");
  });

  it("omits minutes label when 0 minutes (but has hours)", () => {
    // 1h 0m 5s = 3605 seconds = 3_605_000 ms. m=0 so mDisplay="".
    expect(milliToHms(3_605_000)).toBe("1h 5.00s");
  });

  it("handles very small millisecond values", () => {
    expect(milliToHms(1)).toBe("0.00s");
  });

  it("handles fractional seconds correctly", () => {
    // 1500ms = 1.5s
    expect(milliToHms(1500)).toBe("1.50s");
  });

  it("handles large values (24 hours)", () => {
    // 24 * 3_600_000 = 86_400_000 ms. m=0, s=0.
    expect(milliToHms(86_400_000)).toBe("24h 0.00s");
  });

  it("handles string numeric input", () => {
    expect(milliToHms("1000" as any)).toBe("1.00s");
  });

  it("trims trailing whitespace from output", () => {
    const result = milliToHms(60_000);
    // The function trims the final result — no trailing whitespace
    expect(result).toBe(result.trim());
  });

  it("formats 10 minutes correctly", () => {
    // 10 * 60 * 1000 = 600_000 ms = 600s = 10m 0.00s
    expect(milliToHms(600_000)).toBe("10m 0.00s");
  });

  it("formats 59 minutes 59 seconds", () => {
    // 59*60 + 59 = 3599 seconds = 3_599_000 ms
    expect(milliToHms(3_599_000)).toBe("59m 59.00s");
  });
});
