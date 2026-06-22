// SPDX-License-Identifier: MIT
const {
  ResilientHttpClient,
  CircuitBreaker,
} = require("../../../utils/helpers/resilientHttpClient");

describe("ResilientHttpClient", () => {
  let client;

  beforeEach(() => {
    client = new ResilientHttpClient({
      timeoutMs: 1000,
      maxRetries: 2,
      retryDelayMs: 10,
      rateLimitDelayMs: 0,
      circuitBreakerThreshold: 3,
      circuitBreakerCooldownMs: 50,
      cacheTtlMs: 1000,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a successful response", async () => {
    const body = { ok: true };
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      clone: function () {
        return this;
      },
      json: async () => body,
    });

    const res = await client.fetch("https://example.com/x");
    expect(res.ok).toBe(true);
  });

  it("retries on 5xx and returns the last response", async () => {
    const okResponse = {
      ok: true,
      status: 200,
      clone: function () {
        return this;
      },
    };
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValueOnce(okResponse);

    const res = await client.fetch("https://example.com/x");
    expect(res.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 4xx", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    });

    const res = await client.fetch("https://example.com/x");
    expect(res.status).toBe(404);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns the last 5xx response after exhausting retries", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: false, status: 503 });

    const res = await client.fetch("https://example.com/x");
    expect(res.status).toBe(503);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("caches successful responses and reuses them", async () => {
    const body = { ok: true };
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      clone: function () {
        return this;
      },
      json: async () => body,
    });

    await client.fetch("https://example.com/x");
    await client.fetch("https://example.com/x");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("circuit breaker opens after repeated failures", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network"));

    await expect(client.fetch("https://example.com/x")).rejects.toThrow();
    await expect(client.fetch("https://example.com/x")).rejects.toThrow();
    await expect(client.fetch("https://example.com/x")).rejects.toThrow();
    expect(client.stats().state).toBe("open");
  });

  it("uses cached stale response when circuit breaker is open", async () => {
    const response = {
      ok: true,
      status: 200,
      clone: function () {
        return this;
      },
      json: async () => ({ cached: true }),
    };
    jest.spyOn(global, "fetch").mockResolvedValue(response);

    await client.fetch("https://example.com/x");
    client.circuitBreaker.state = "open";
    client.circuitBreaker.lastFailure = Date.now();
    const res = await client.fetch("https://example.com/x");
    expect(res.ok).toBe(true);
  });

  it("reset clears the cache and circuit breaker", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      clone: function () {
        return this;
      },
    });

    await client.fetch("https://example.com/x");
    client.reset();
    expect(client.stats().cacheSize).toBe(0);
    expect(client.stats().state).toBe("closed");
  });
});

describe("CircuitBreaker", () => {
  it("opens after threshold failures and closes after cooldown", async () => {
    const cb = new CircuitBreaker(2, 25);
    expect(cb.isOpen()).toBe(false);
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    await new Promise((r) => setTimeout(r, 50));
    expect(cb.isOpen()).toBe(false);
  });

  it("resets to closed on success", () => {
    const cb = new CircuitBreaker(2, 25);
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    cb.recordSuccess();
    expect(cb.state).toBe("closed");
  });
});
