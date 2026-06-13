// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useTimeoutProgress from "./useTimeoutProgress";

describe("useTimeoutProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts at 100% and drains to 0%", () => {
    const { result } = renderHook(() => useTimeoutProgress(1000));
    expect(result.current).toBe(100);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(50);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(0);
  });

  it("calls onTimeout when the timer expires", () => {
    const onTimeout = vi.fn();
    renderHook(() => useTimeoutProgress(1000, { onTimeout }));
    act(() => vi.advanceTimersByTime(1000));
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not run when timeout is null", () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useTimeoutProgress(null, { onTimeout }));
    expect(result.current).toBe(100);
    act(() => vi.advanceTimersByTime(1000));
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("does not run when inactive", () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useTimeoutProgress(1000, { active: false, onTimeout }),
    );
    expect(result.current).toBe(100);
    act(() => vi.advanceTimersByTime(1000));
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
