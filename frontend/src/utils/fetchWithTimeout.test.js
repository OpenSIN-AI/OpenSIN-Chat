// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

describe("fetchWithTimeout", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("returns response on successful fetch", async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchWithTimeout("https://example.com/api");
    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("throws localized timeout message on timeout", async () => {
    let capturedSignal;
    global.fetch = vi.fn().mockImplementation((_url, opts) => {
      capturedSignal = opts.signal;
      return new Promise((_, reject) => {
        capturedSignal.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const promise = fetchWithTimeout("https://example.com/api", {
      timeoutMs: 5000,
    });
    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow("Zeitüberschreitung");
  });

  it("re-throws original AbortError when external signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    global.fetch = vi.fn().mockImplementation((_url, opts) => {
      return Promise.reject(
        new DOMException("The operation was aborted.", "AbortError"),
      );
    });

    await expect(
      fetchWithTimeout("https://example.com/api", {
        signal: controller.signal,
      }),
    ).rejects.toThrow("The operation was aborted");
  });

  it("re-throws AbortError when external signal aborts during request", async () => {
    const controller = new AbortController();
    let capturedSignal;

    global.fetch = vi.fn().mockImplementation((_url, opts) => {
      capturedSignal = opts.signal;
      return new Promise((_, reject) => {
        capturedSignal.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const promise = fetchWithTimeout("https://example.com/api", {
      timeoutMs: 30000,
      signal: controller.signal,
    });

    controller.abort();

    await expect(promise).rejects.toThrow("The operation was aborted");
  });

  it("defaults timeout to 8000ms", async () => {
    let capturedSignal;
    global.fetch = vi.fn().mockImplementation((_url, opts) => {
      capturedSignal = opts.signal;
      return new Promise((_, reject) => {
        capturedSignal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const promise = fetchWithTimeout("https://example.com/api");

    vi.advanceTimersByTime(7999);
    expect(capturedSignal.aborted).toBe(false);

    vi.advanceTimersByTime(1);
    await expect(promise).rejects.toThrow("Zeitüberschreitung");
  });

  it("respects custom timeoutMs", async () => {
    let capturedSignal;
    global.fetch = vi.fn().mockImplementation((_url, opts) => {
      capturedSignal = opts.signal;
      return new Promise((_, reject) => {
        capturedSignal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const promise = fetchWithTimeout("https://example.com/api", {
      timeoutMs: 2000,
    });

    vi.advanceTimersByTime(1999);
    expect(capturedSignal.aborted).toBe(false);

    vi.advanceTimersByTime(1);
    await expect(promise).rejects.toThrow("Zeitüberschreitung");
  });

  it("propagates network errors", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchWithTimeout("https://example.com/api")).rejects.toThrow(
      "Failed to fetch",
    );
  });

  it("clears timeout timer after successful fetch", async () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    const mockResponse = new Response("ok", { status: 200 });
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await fetchWithTimeout("https://example.com/api");
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
