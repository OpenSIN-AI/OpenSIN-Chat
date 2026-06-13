// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import usePolling from "./usePolling";

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the callback on interval while visible", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 1000));
    vi.advanceTimersByTime(2500);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("pauses when disabled", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 1000, false));
    vi.advanceTimersByTime(2500);
    expect(callback).not.toHaveBeenCalled();
  });

  it("pauses when hidden and resumes when visible", () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 1000));
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(1000);
    // no extra calls while hidden
    expect(callback).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
