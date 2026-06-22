// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock react-router-dom — useBlocker returns a fake blocker object
const mockBlocker = {
  state: "unblocked",
  reset: vi.fn(),
  proceed: vi.fn(),
};

vi.mock("react-router-dom", () => ({
  useBlocker: vi.fn(() => mockBlocker),
}));

import { useBlocker } from "react-router-dom";
import { useUnsavedChanges, useUnsavedChangesGuard } from "./useUnsavedChanges";

describe("useUnsavedChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBlocker.state = "unblocked";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls useBlocker with a function that returns hasChanges=true", () => {
    renderHook(() => useUnsavedChanges(true));
    expect(useBlocker).toHaveBeenCalledTimes(1);
    const blockerFn = useBlocker.mock.calls[0][0];
    expect(typeof blockerFn).toBe("function");
    expect(blockerFn()).toBe(true);
  });

  it("calls useBlocker with a function that returns hasChanges=false", () => {
    renderHook(() => useUnsavedChanges(false));
    const blockerFn = useBlocker.mock.calls[0][0];
    expect(blockerFn()).toBe(false);
  });

  it("adds beforeunload listener when hasChanges is true", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => useUnsavedChanges(true));
    expect(addSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    addSpy.mockRestore();
  });

  it("does NOT add beforeunload listener when hasChanges is false", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => useUnsavedChanges(false));
    expect(addSpy).not.toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
    addSpy.mockRestore();
  });

  it("removes beforeunload listener on unmount when hasChanges", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useUnsavedChanges(true));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
    removeSpy.mockRestore();
  });

  it("returns the blocker object from useBlocker", () => {
    const { result } = renderHook(() => useUnsavedChanges(true));
    expect(result.current).toBe(mockBlocker);
  });

  it("uses custom message for beforeunload event", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => useUnsavedChanges(true, "You have unsaved changes!"));
    expect(addSpy).toHaveBeenCalled();
    addSpy.mockRestore();
  });
});

describe("useUnsavedChangesGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBlocker.state = "unblocked";
  });

  it("returns isBlocking=false when blocker state is unblocked", () => {
    mockBlocker.state = "unblocked";
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    expect(result.current.isBlocking).toBe(false);
  });

  it("returns isBlocking=true when blocker state is blocking", () => {
    mockBlocker.state = "blocking";
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    expect(result.current.isBlocking).toBe(true);
  });

  it("exposes reset and proceed functions", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    expect(typeof result.current.reset).toBe("function");
    expect(typeof result.current.proceed).toBe("function");
  });

  it("reset calls blocker.reset", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    result.current.reset();
    expect(mockBlocker.reset).toHaveBeenCalled();
  });

  it("proceed calls blocker.proceed", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    result.current.proceed();
    expect(mockBlocker.proceed).toHaveBeenCalled();
  });
});
