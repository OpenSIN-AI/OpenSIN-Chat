// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLanguageOptions } from "./useLanguageOptions";

vi.mock("@/i18n", () => ({
  default: {
    language: "en",
    changeLanguage: vi.fn(),
  },
}));

import i18n from "@/i18n";

describe("useLanguageOptions", () => {
  it("returns supported languages and a name helper", () => {
    const { result } = renderHook(() => useLanguageOptions());
    expect(result.current.supportedLanguages).toContain("en");
    expect(result.current.getLanguageName("en")).toBe("English");
  });

  it("changeLanguage switches to a supported language", () => {
    const { result } = renderHook(() => useLanguageOptions());
    result.current.changeLanguage("en");
    expect(i18n.changeLanguage).toHaveBeenCalledWith("en");
  });

  it("changeLanguage rejects unsupported languages", () => {
    const { result } = renderHook(() => useLanguageOptions());
    expect(result.current.changeLanguage("xx")).toBe(false);
    expect(i18n.changeLanguage).not.toHaveBeenCalledWith("xx");
  });
});
