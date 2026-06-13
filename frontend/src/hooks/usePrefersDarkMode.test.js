// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import usePrefersDarkMode from "./usePrefersDarkMode";

describe("usePrefersDarkMode", () => {
  it("returns true when the OS prefers dark", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(usePrefersDarkMode()).toBe(true);
  });

  it("returns false when the OS prefers light", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(usePrefersDarkMode()).toBe(false);
  });

  it("returns false when matchMedia is unavailable", () => {
    window.matchMedia = undefined;
    expect(usePrefersDarkMode()).toBe(false);
  });
});
