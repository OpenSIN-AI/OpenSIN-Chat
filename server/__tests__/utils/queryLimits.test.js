// SPDX-License-Identifier: MIT
const {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  clampLimit,
  clampOffset,
  paginate,
} = require("../../utils/database/queryLimits");

describe("queryLimits.clampLimit", () => {
  it("returns the default fallback for null/undefined", () => {
    expect(clampLimit(null)).toBe(DEFAULT_LIST_LIMIT);
    expect(clampLimit(undefined)).toBe(DEFAULT_LIST_LIMIT);
  });

  it("returns the fallback for non-numeric or non-positive values", () => {
    expect(clampLimit("abc")).toBe(DEFAULT_LIST_LIMIT);
    expect(clampLimit(0)).toBe(DEFAULT_LIST_LIMIT);
    expect(clampLimit(-5)).toBe(DEFAULT_LIST_LIMIT);
    expect(clampLimit(NaN)).toBe(DEFAULT_LIST_LIMIT);
  });

  it("passes through valid values within range", () => {
    expect(clampLimit(25)).toBe(25);
    expect(clampLimit("50")).toBe(50);
  });

  it("floors fractional values", () => {
    expect(clampLimit(10.9)).toBe(10);
  });

  it("caps values above MAX_LIST_LIMIT", () => {
    expect(clampLimit(999999)).toBe(MAX_LIST_LIMIT);
  });

  it("honors a custom max ceiling", () => {
    expect(clampLimit(500, { max: 50 })).toBe(50);
  });

  it("honors a custom fallback but never exceeds max", () => {
    expect(clampLimit(null, { fallback: 10 })).toBe(10);
    expect(clampLimit(null, { fallback: 999, max: 50 })).toBe(50);
  });
});

describe("queryLimits.clampOffset", () => {
  it("returns 0 for missing/invalid offsets", () => {
    expect(clampOffset(null)).toBe(0);
    expect(clampOffset(undefined)).toBe(0);
    expect(clampOffset(-10)).toBe(0);
    expect(clampOffset("nope")).toBe(0);
  });

  it("returns floored positive offsets", () => {
    expect(clampOffset(20)).toBe(20);
    expect(clampOffset("15")).toBe(15);
    expect(clampOffset(12.7)).toBe(12);
  });
});

describe("queryLimits.paginate", () => {
  it("always includes a bounded take", () => {
    expect(paginate(null)).toEqual({ take: DEFAULT_LIST_LIMIT });
    expect(paginate(999999)).toEqual({ take: MAX_LIST_LIMIT });
  });

  it("includes skip only for positive offsets", () => {
    expect(paginate(10, 0)).toEqual({ take: 10 });
    expect(paginate(10, 20)).toEqual({ take: 10, skip: 20 });
  });

  it("respects custom options", () => {
    expect(paginate(null, null, { fallback: 5, max: 10 })).toEqual({ take: 5 });
  });
});
