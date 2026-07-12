// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme, resolveDarkMode } from "./useTheme";

const mqlMock = {
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

describe("useTheme", () => {
  beforeEach(() => {
    window.localStorage.getItem.mockImplementation(() => null);
    window.localStorage.setItem.mockImplementation(() => {});
    window.matchMedia = vi.fn().mockReturnValue(mqlMock);
    vi.spyOn(window, "dispatchEvent");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to system theme when no preference is stored", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("system");
    // mqlMock.matches = false → system resolves to light
    expect(result.current.isLight).toBe(true);
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it("migrates legacy 'default' theme to dark", () => {
    window.localStorage.getItem.mockImplementation((key) =>
      key === "theme" ? "default" : null,
    );
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("applies a selected theme", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme("light"));
    expect(result.current.theme).toBe("light");
    expect(result.current.isLight).toBe(true);
    // dispatchEvent only fires when broadcastLogoChange=true (default false)
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });

  it("lists available themes", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.availableThemes).toHaveProperty("system");
    expect(result.current.availableThemes).toHaveProperty("light");
    expect(result.current.availableThemes).toHaveProperty("dark");
  });
});

describe("resolveDarkMode", () => {
  it("treats legacy 'default' as dark", () => {
    window.localStorage.getItem.mockImplementation((key) =>
      key === "theme" ? "default" : null,
    );
    expect(resolveDarkMode()).toBe(true);
  });

  it("follows system preference when set to system", () => {
    window.localStorage.getItem.mockImplementation((key) =>
      key === "theme" ? "system" : null,
    );
    // matches: true → system prefers dark → resolveDarkMode returns true (is dark)
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(resolveDarkMode()).toBe(true);
  });
});
