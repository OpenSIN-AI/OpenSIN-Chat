// SPDX-License-Identifier: MIT
const {
  getCached,
  getStale,
  setCached,
  withCache,
  clearCache,
  deleteCached,
  cacheSize,
  DEFAULT_TTL_MS,
} = require("../../../utils/research/cache");

describe("Research cache", () => {
  beforeEach(() => clearCache());

  describe("getCached / setCached", () => {
    it("returns null for a missing key", () => {
      expect(getCached("nope")).toBeNull();
    });

    it("returns the value after setCached", () => {
      setCached("k", { a: 1 });
      expect(getCached("k")).toEqual({ a: 1 });
    });

    it("returns null when the entry is older than ttl", () => {
      setCached("k", "v");
      expect(getCached("k", 0)).toBeNull();
    });

    it("respects a custom ttl", () => {
      setCached("k", "v");
      expect(getCached("k", 100)).toBe("v");
    });

    it("uses DEFAULT_TTL_MS (60 000) when no ttl given", () => {
      expect(DEFAULT_TTL_MS).toBe(60_000);
      setCached("k", "v");
      expect(getCached("k")).toBe("v");
    });
  });

  describe("getStale", () => {
    it("returns a value even when past ttl", () => {
      setCached("k", "v");
      expect(getStale("k")).toBe("v");
      expect(getCached("k", 0)).toBeNull();
    });

    it("returns null for a missing key", () => {
      expect(getStale("missing")).toBeNull();
    });
  });

  describe("deleteCached", () => {
    it("removes a single entry", () => {
      setCached("a", 1);
      setCached("b", 2);
      deleteCached("a");
      expect(getCached("a")).toBeNull();
      expect(getCached("b")).toBe(2);
    });
  });

  describe("cacheSize", () => {
    it("tracks the number of entries", () => {
      expect(cacheSize()).toBe(0);
      setCached("a", 1);
      expect(cacheSize()).toBe(1);
      setCached("b", 2);
      expect(cacheSize()).toBe(2);
      clearCache();
      expect(cacheSize()).toBe(0);
    });
  });

  describe("withCache", () => {
    it("calls fn on a cache miss and caches the result", async () => {
      const fn = jest.fn().mockResolvedValue("result");
      const val = await withCache("k", fn, 60_000);
      expect(val).toBe("result");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("returns the cached value without calling fn on a cache hit", async () => {
      const fn = jest.fn().mockResolvedValue("first");
      await withCache("k", fn, 60_000);
      const fn2 = jest.fn().mockResolvedValue("second");
      const val = await withCache("k", fn2, 60_000);
      expect(val).toBe("first");
      expect(fn2).not.toHaveBeenCalled();
    });

    it("returns the stale value and triggers background revalidation", async () => {
      const fn1 = jest.fn().mockResolvedValue("old");
      await withCache("k", fn1, 60_000);

      const fn2 = jest.fn().mockResolvedValue("new");
      const val = await withCache("k", fn2, 0);

      expect(val).toBe("old");
      expect(fn2).toHaveBeenCalledTimes(1);

      await new Promise((r) => setTimeout(r, 10));
      expect(getCached("k", 60_000)).toBe("new");
    });

    it("does not cache null results (always re-fetches)", async () => {
      const fn = jest.fn().mockResolvedValue(null);
      await withCache("k", fn, 60_000);
      await withCache("k", fn, 60_000);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("propagates fn errors on a cache miss", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("boom"));
      await expect(withCache("k", fn, 60_000)).rejects.toThrow("boom");
    });
  });
});
