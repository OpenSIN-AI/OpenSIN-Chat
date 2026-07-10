// SPDX-License-Identifier: MIT
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_KEY } from "@/utils/constants";
import { useTheme } from "./useTheme";

function installMatchMedia(initiallyDark = false, legacy = false) {
  let matches = initiallyDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    media: "(prefers-color-scheme: dark)",
    get matches() {
      return matches;
    },
    onchange: null,
    addEventListener: legacy
      ? undefined
      : vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) =>
          listeners.add(listener),
        ),
    removeEventListener: legacy
      ? undefined
      : vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) =>
          listeners.delete(listener),
        ),
    addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    ),
    removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
    ),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mediaQuery),
  );

  return {
    mediaQuery,
    change(nextDark: boolean) {
      matches = nextDark;
      const event = { matches: nextDark } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    },
  };
}

describe("useTheme", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.mocked(window.localStorage.getItem).mockImplementation(
      (key) => storage.get(key) ?? null,
    );
    vi.mocked(window.localStorage.setItem).mockImplementation((key, value) => {
      storage.set(key, value);
    });
    vi.mocked(window.localStorage.removeItem).mockImplementation((key) => {
      storage.delete(key);
    });
    vi.mocked(window.localStorage.clear).mockImplementation(() => {
      storage.clear();
    });
    window.localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
    document.body.className = "";
  });

  it("defaults to system and follows live OS changes", async () => {
    const system = installMatchMedia(false);
    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.isLight).toBe(true));
    expect(result.current.theme).toBe("system");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(document.documentElement).toHaveClass("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("system");

    act(() => system.change(true));

    expect(result.current.isLight).toBe(false);
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.body).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("keeps an explicit theme when the OS preference changes", async () => {
    const system = installMatchMedia(false);
    window.localStorage.setItem(THEME_KEY, "light");
    const { result } = renderHook(() => useTheme());

    await waitFor(() => expect(result.current.isLight).toBe(true));
    act(() => system.change(true));

    expect(result.current.theme).toBe("light");
    expect(result.current.isLight).toBe(true);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("persists a manual override from system mode", async () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setTheme("light"));

    await waitFor(() =>
      expect(window.localStorage.getItem(THEME_KEY)).toBe("light"),
    );
    expect(result.current.isLight).toBe(true);
    expect(document.documentElement).toHaveClass("light");
  });

  it("supports the legacy MediaQueryList listener API", () => {
    const system = installMatchMedia(false, true);
    const { unmount } = renderHook(() => useTheme());

    expect(system.mediaQuery.addListener).toHaveBeenCalledOnce();
    unmount();
    expect(system.mediaQuery.removeListener).toHaveBeenCalledOnce();
  });
});
