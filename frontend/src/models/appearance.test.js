// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import Appearance from "@/models/appearance";
import { APPEARANCE_SETTINGS } from "@/utils/constants";

function storageWith(value) {
  return {
    getItem: vi.fn((key) => (key === APPEARANCE_SETTINGS ? value : null)),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
}

describe("Appearance", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("defaultSettings", () => {
    it("exposes the expected defaults", () => {
      expect(Appearance.defaultSettings).toEqual({
        showScrollbar: false,
        autoSubmitSttInput: true,
        autoPlayAssistantTtsResponse: false,
        enableSpellCheck: true,
        renderHTML: false,
      });
    });
  });

  describe("getSettings", () => {
    it("returns the default settings when localStorage is empty", () => {
      window.localStorage = storageWith(null);
      const settings = Appearance.getSettings();
      expect(settings).toEqual(Appearance.defaultSettings);
    });

    it("returns the stored settings when present", () => {
      const stored = { showScrollbar: true, enableSpellCheck: false };
      window.localStorage = storageWith(JSON.stringify(stored));
      const settings = Appearance.getSettings();
      expect(settings).toEqual(stored);
    });

    it("falls back to defaults when the stored value is malformed JSON", () => {
      window.localStorage = storageWith("{not-json");
      const settings = Appearance.getSettings();
      expect(settings).toEqual(Appearance.defaultSettings);
    });
  });

  describe("get", () => {
    it("returns the stored value when the key exists", () => {
      window.localStorage = storageWith(
        JSON.stringify({ showScrollbar: true }),
      );
      expect(Appearance.get("showScrollbar")).toBe(true);
    });

    it("returns the default value when the key is missing", () => {
      window.localStorage = storageWith(null);
      expect(Appearance.get("autoSubmitSttInput")).toBe(
        Appearance.defaultSettings.autoSubmitSttInput,
      );
    });

    it("returns the default value when settings is an object missing the key", () => {
      window.localStorage = storageWith(JSON.stringify({}));
      expect(Appearance.get("renderHTML")).toBe(
        Appearance.defaultSettings.renderHTML,
      );
    });
  });

  describe("set", () => {
    it("writes the new value to localStorage and returns the merged settings", () => {
      const setItem = vi.fn();
      window.localStorage = {
        getItem: vi.fn(() => null),
        setItem,
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      const result = Appearance.set("showScrollbar", true);
      expect(setItem).toHaveBeenCalled();
      const [, written] = setItem.mock.calls[0];
      const parsed = JSON.parse(written);
      expect(parsed.showScrollbar).toBe(true);
      // Other defaults are preserved
      expect(parsed.enableSpellCheck).toBe(
        Appearance.defaultSettings.enableSpellCheck,
      );
      expect(result.showScrollbar).toBe(true);
    });

    it("overrides an existing value when set is called again", () => {
      let store = JSON.stringify({ showScrollbar: false });
      window.localStorage = {
        getItem: vi.fn(() => store),
        setItem: vi.fn((_, value) => {
          store = value;
        }),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      Appearance.set("showScrollbar", true);
      const parsed = JSON.parse(store);
      expect(parsed.showScrollbar).toBe(true);
    });
  });

  describe("updateSettings", () => {
    it("merges the new settings with the existing stored settings", () => {
      window.localStorage = storageWith(
        JSON.stringify({ showScrollbar: true, renderHTML: false }),
      );
      const updated = Appearance.updateSettings({ renderHTML: true });
      expect(updated.renderHTML).toBe(true);
      // Pre-existing settings are preserved
      expect(updated.showScrollbar).toBe(true);
    });

    it("persists the merged object to localStorage", () => {
      const setItem = vi.fn();
      window.localStorage = {
        getItem: vi.fn(() => null),
        setItem,
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      Appearance.updateSettings({ showScrollbar: true });
      expect(setItem).toHaveBeenCalledWith(
        APPEARANCE_SETTINGS,
        expect.stringContaining('"showScrollbar":true'),
      );
    });

    it("returns the merged settings object", () => {
      window.localStorage = storageWith(null);
      const result = Appearance.updateSettings({ enableSpellCheck: false });
      expect(result.enableSpellCheck).toBe(false);
      // Other defaults still in place
      expect(result.showScrollbar).toBe(
        Appearance.defaultSettings.showScrollbar,
      );
    });
  });
});
