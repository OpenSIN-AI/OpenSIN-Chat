// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import useScrollActiveItemIntoView from "./useScrollActiveItemIntoView";

describe("useScrollActiveItemIntoView", () => {
  let scrollIntoViewMock;

  beforeEach(() => {
    vi.clearAllMocks();
    scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a ref object", () => {
    const { result } = renderHook(() =>
      useScrollActiveItemIntoView({
        isActive: false,
        behavior: "smooth",
        block: "nearest",
      }),
    );
    expect(result.current.ref).toBeDefined();
    expect(result.current.ref.current).toBeNull();
  });

  it("calls scrollIntoView when isActive becomes true with ref attached", () => {
    const { result, rerender } = renderHook(
      ({ isActive }) =>
        useScrollActiveItemIntoView({
          isActive,
          behavior: "smooth",
          block: "center",
        }),
      { initialProps: { isActive: false } },
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    const fakeEl = document.createElement("div");
    result.current.ref.current = fakeEl;

    rerender({ isActive: true });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
  });

  it("does NOT call scrollIntoView when isActive is false", () => {
    renderHook(() =>
      useScrollActiveItemIntoView({
        isActive: false,
        behavior: "smooth",
        block: "center",
      }),
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it("passes correct behavior and block options", () => {
    const { result, rerender } = renderHook(
      ({ isActive }) =>
        useScrollActiveItemIntoView({
          isActive,
          behavior: "instant",
          block: "start",
        }),
      { initialProps: { isActive: false } },
    );

    const fakeEl = document.createElement("div");
    result.current.ref.current = fakeEl;

    rerender({ isActive: true });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "instant",
      block: "start",
    });
  });

  it("handles undefined behavior and block gracefully", () => {
    const { result, rerender } = renderHook(
      ({ isActive }) =>
        useScrollActiveItemIntoView({
          isActive,
          behavior: undefined,
          block: undefined,
        }),
      { initialProps: { isActive: false } },
    );

    const fakeEl = document.createElement("div");
    result.current.ref.current = fakeEl;

    rerender({ isActive: true });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: undefined,
      block: undefined,
    });
  });

  it("does not throw when ref.current is null and isActive is true", () => {
    expect(() => {
      renderHook(() =>
        useScrollActiveItemIntoView({
          isActive: true,
          behavior: "smooth",
          block: "center",
        }),
      );
    }).not.toThrow();
  });

  it("re-triggers when isActive changes from false to true", () => {
    const { result, rerender } = renderHook(
      ({ isActive }) =>
        useScrollActiveItemIntoView({
          isActive,
          behavior: "smooth",
          block: "center",
        }),
      { initialProps: { isActive: false } },
    );

    expect(scrollIntoViewMock).not.toHaveBeenCalled();

    const fakeEl = document.createElement("div");
    result.current.ref.current = fakeEl;

    rerender({ isActive: true });

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
  });

  it("does not re-trigger when isActive stays false", () => {
    const { rerender } = renderHook(
      ({ isActive }) =>
        useScrollActiveItemIntoView({
          isActive,
          behavior: "smooth",
          block: "center",
        }),
      { initialProps: { isActive: false } },
    );

    rerender({ isActive: false });

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });
});
