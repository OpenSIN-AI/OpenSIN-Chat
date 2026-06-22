// SPDX-License-Identifier: MIT
/**
 * Tests for the sync fallback & retry-queue helpers (Issue #52).
 */

"use strict";

const {
  RETRY_SCHEDULE_MS,
  MAX_RETRIES,
  SYNC_PHASES,
  computeBackoffMs,
  shouldRetry,
  nextRetryAt,
  withFallback,
  defaultIsEmpty,
} = require("../../../utils/politician/syncFallback");

describe("syncFallback: computeBackoffMs", () => {
  test("returns 15min for the first attempt", () => {
    expect(computeBackoffMs(1)).toBe(15 * 60 * 1000);
  });

  test("returns 1h for the second attempt", () => {
    expect(computeBackoffMs(2)).toBe(60 * 60 * 1000);
  });

  test("returns 4h for the third attempt", () => {
    expect(computeBackoffMs(3)).toBe(4 * 60 * 60 * 1000);
  });

  test("clamps attempts beyond the schedule to the longest delay", () => {
    const last = RETRY_SCHEDULE_MS[RETRY_SCHEDULE_MS.length - 1];
    expect(computeBackoffMs(99)).toBe(last);
  });

  test("guards against invalid attempt numbers", () => {
    expect(computeBackoffMs(0)).toBe(RETRY_SCHEDULE_MS[0]);
    expect(computeBackoffMs(-5)).toBe(RETRY_SCHEDULE_MS[0]);
    expect(computeBackoffMs(NaN)).toBe(RETRY_SCHEDULE_MS[0]);
  });
});

describe("syncFallback: shouldRetry", () => {
  test("allows retries below MAX_RETRIES", () => {
    expect(shouldRetry(1)).toBe(true);
    expect(shouldRetry(MAX_RETRIES - 1)).toBe(true);
  });

  test("stops retrying at MAX_RETRIES", () => {
    expect(shouldRetry(MAX_RETRIES)).toBe(false);
    expect(shouldRetry(MAX_RETRIES + 1)).toBe(false);
  });
});

describe("syncFallback: nextRetryAt", () => {
  test("adds the backoff delay to the reference time", () => {
    const now = new Date("2026-06-07T12:00:00.000Z");
    const next = nextRetryAt(1, now);
    expect(next.getTime()).toBe(now.getTime() + 15 * 60 * 1000);
  });
});

describe("syncFallback: defaultIsEmpty", () => {
  test("treats null/undefined as empty", () => {
    expect(defaultIsEmpty(null)).toBe(true);
    expect(defaultIsEmpty(undefined)).toBe(true);
  });

  test("treats empty array as empty", () => {
    expect(defaultIsEmpty([])).toBe(true);
  });

  test("treats non-empty values as non-empty", () => {
    expect(defaultIsEmpty([1])).toBe(false);
    expect(defaultIsEmpty({})).toBe(false);
    expect(defaultIsEmpty("x")).toBe(false);
  });
});

describe("syncFallback: SYNC_PHASES", () => {
  test("exposes the six sync phases", () => {
    expect(SYNC_PHASES).toEqual({
      members: "members",
      abgeordnetenwatch: "abgeordnetenwatch",
      speeches: "speeches",
      mandates: "mandates",
      votes: "votes",
      committees: "committees",
    });
  });
});

describe("syncFallback: withFallback", () => {
  const noop = () => {};

  test("returns primary data when primary succeeds with data", async () => {
    const primary = jest.fn().mockResolvedValue([1, 2, 3]);
    const fallback = jest.fn();
    const res = await withFallback(primary, fallback, { log: noop });
    expect(res).toEqual({ data: [1, 2, 3], usedFallback: false, error: null });
    expect(fallback).not.toHaveBeenCalled();
  });

  test("uses fallback when primary throws", async () => {
    const primary = jest.fn().mockRejectedValue(new Error("API 503"));
    const fallback = jest.fn().mockResolvedValue(["fallback"]);
    const res = await withFallback(primary, fallback, { log: noop });
    expect(res.usedFallback).toBe(true);
    expect(res.data).toEqual(["fallback"]);
    expect(res.error).toBeNull();
  });

  test("uses fallback when primary returns empty", async () => {
    const primary = jest.fn().mockResolvedValue([]);
    const fallback = jest.fn().mockResolvedValue(["from-fallback"]);
    const res = await withFallback(primary, fallback, { log: noop });
    expect(res.usedFallback).toBe(true);
    expect(res.data).toEqual(["from-fallback"]);
  });

  test("surfaces the original error when both sources fail", async () => {
    const primary = jest.fn().mockRejectedValue(new Error("primary down"));
    const fallback = jest.fn().mockRejectedValue(new Error("fallback down"));
    const res = await withFallback(primary, fallback, { log: noop });
    expect(res.data).toBeNull();
    expect(res.error).toBeInstanceOf(Error);
    expect(res.error.message).toBe("primary down");
  });

  test("honours a custom emptiness check", async () => {
    const primary = jest.fn().mockResolvedValue({ count: 0 });
    const fallback = jest.fn().mockResolvedValue({ count: 5 });
    const res = await withFallback(primary, fallback, {
      log: noop,
      isEmpty: (v) => !v || v.count === 0,
    });
    expect(res.usedFallback).toBe(true);
    expect(res.data).toEqual({ count: 5 });
  });
});
