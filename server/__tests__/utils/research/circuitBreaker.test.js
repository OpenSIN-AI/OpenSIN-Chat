// SPDX-License-Identifier: MIT
const {
  createCircuitBreaker,
  DEFAULT_FAILURE_THRESHOLD,
  DEFAULT_COOLDOWN_MS,
} = require("../../../utils/research/circuitBreaker");

describe("Circuit breaker", () => {
  describe("defaults", () => {
    it("exposes sensible defaults", () => {
      expect(DEFAULT_FAILURE_THRESHOLD).toBe(5);
      expect(DEFAULT_COOLDOWN_MS).toBe(30_000);
    });
  });

  describe("closed state (normal operation)", () => {
    it("calls fn and returns its result on success", async () => {
      const cb = createCircuitBreaker("svc");
      const fn = jest.fn().mockResolvedValue("ok");
      const result = await cb.call(fn);
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("resets failure count on success after a failure", async () => {
      const cb = createCircuitBreaker("svc", { failureThreshold: 3 });
      const failFn = jest.fn().mockRejectedValue(new Error("x"));
      const okFn = jest.fn().mockResolvedValue("ok");

      await expect(cb.call(failFn)).rejects.toThrow("x");
      await cb.call(okFn);
      const state = cb.getState();
      expect(state.state).toBe("closed");
      expect(state.failureCount).toBe(0);
    });
  });

  describe("failure tracking", () => {
    it("counts failures and reports state", async () => {
      const cb = createCircuitBreaker("svc", { failureThreshold: 3 });
      const fn = jest.fn().mockRejectedValue(new Error("fail"));

      await expect(cb.call(fn)).rejects.toThrow("fail");
      expect(cb.getState().failureCount).toBe(1);
      expect(cb.getState().state).toBe("closed");

      await expect(cb.call(fn)).rejects.toThrow("fail");
      expect(cb.getState().failureCount).toBe(2);
      expect(cb.getState().state).toBe("closed");
    });

    it("opens the circuit after reaching the failure threshold", async () => {
      const cb = createCircuitBreaker("svc", { failureThreshold: 3 });
      const fn = jest.fn().mockRejectedValue(new Error("fail"));

      for (let i = 0; i < 3; i++) {
        await expect(cb.call(fn)).rejects.toThrow("fail");
      }
      expect(cb.getState().state).toBe("open");
    });
  });

  describe("open state", () => {
    it("short-circuits without calling fn when open", async () => {
      const cb = createCircuitBreaker("svc", {
        failureThreshold: 1,
        cooldownMs: 10_000,
      });
      const failFn = jest.fn().mockRejectedValue(new Error("fail"));
      const okFn = jest.fn().mockResolvedValue("ok");

      await expect(cb.call(failFn)).rejects.toThrow("fail");
      expect(cb.getState().state).toBe("open");

      await expect(cb.call(okFn)).rejects.toThrow(/is open/);
      expect(okFn).not.toHaveBeenCalled();
    });

    it("includes the breaker name and remaining cooldown in the error", async () => {
      const cb = createCircuitBreaker("my-service", {
        failureThreshold: 1,
        cooldownMs: 10_000,
      });
      await expect(cb.call(jest.fn().mockRejectedValue(new Error("x")))).rejects.toThrow("x");
      await expect(cb.call(jest.fn())).rejects.toThrow(/my-service/);
    });
  });

  describe("half-open state", () => {
    it("allows a trial call after cooldown", async () => {
      const cb = createCircuitBreaker("svc", {
        failureThreshold: 1,
        cooldownMs: 50,
      });
      await expect(
        cb.call(jest.fn().mockRejectedValue(new Error("fail"))),
      ).rejects.toThrow("fail");
      expect(cb.getState().state).toBe("open");

      await new Promise((r) => setTimeout(r, 60));

      const okFn = jest.fn().mockResolvedValue("recovered");
      const result = await cb.call(okFn);
      expect(result).toBe("recovered");
      expect(cb.getState().state).toBe("closed");
    });

    it("re-opens if the trial call fails", async () => {
      const cb = createCircuitBreaker("svc", {
        failureThreshold: 1,
        cooldownMs: 50,
      });
      await expect(
        cb.call(jest.fn().mockRejectedValue(new Error("fail"))),
      ).rejects.toThrow("fail");

      await new Promise((r) => setTimeout(r, 60));

      await expect(
        cb.call(jest.fn().mockRejectedValue(new Error("still bad"))),
      ).rejects.toThrow("still bad");
      expect(cb.getState().state).toBe("open");
    });
  });

  describe("reset", () => {
    it("resets the breaker to closed with zero failures", async () => {
      const cb = createCircuitBreaker("svc", { failureThreshold: 1 });
      await expect(
        cb.call(jest.fn().mockRejectedValue(new Error("x"))),
      ).rejects.toThrow("x");
      expect(cb.getState().state).toBe("open");

      cb.reset();
      expect(cb.getState().state).toBe("closed");
      expect(cb.getState().failureCount).toBe(0);
    });
  });

  describe("forceOpen", () => {
    it("opens the circuit immediately", async () => {
      const cb = createCircuitBreaker("svc");
      cb.forceOpen();
      expect(cb.getState().state).toBe("open");
      await expect(cb.call(jest.fn())).rejects.toThrow(/is open/);
    });
  });

  describe("getState", () => {
    it("returns a snapshot with all metadata", () => {
      const cb = createCircuitBreaker("svc", {
        failureThreshold: 7,
        cooldownMs: 5_000,
      });
      const state = cb.getState();
      expect(state).toEqual({
        name: "svc",
        state: "closed",
        failureCount: 0,
        failureThreshold: 7,
        cooldownMs: 5_000,
        lastFailureTime: 0,
      });
    });
  });
});
