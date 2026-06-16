// SPDX-License-Identifier: MIT
import { REFETCH_LOGO_EVENT } from "@/LogoContext";
import { useState, useEffect, useRef } from "react";

const availableThemes = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/**
 * Resolves the stored theme preference into a concrete "light" or "dark"
 * value. Handles the legacy "default" value (treated as dark) and the
 * "system" value (resolved against the OS preference). Pure helper usable
 * outside of React (e.g. in LogoContext and the system API model).
 * @returns {boolean} Whether the resolved theme is dark mode.
 */
export function resolveDarkMode(): boolean {
  const stored = localStorage.getItem("theme");
  let theme = stored === "default" ? "dark" : stored || "system";
  if (theme === "system") {
    theme = window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return theme !== "light";
}

/**
 * @typedef {'system' | 'light' | 'dark'} ThemeOption
 */

/**
 * @typedef {Object} UseThemeResult
 * @property {ThemeOption} theme - The current theme preference stored in localStorage.
 * @property {(newTheme: ThemeOption) => void} setTheme - Sets the theme preference.
 * @property {{system: string, light: string, dark: string}} availableThemes - Map of theme keys to display names.
 * @property {boolean} isLight - Whether the resolved theme is light (explicitly or via system preference).
 */

/**
 * Determines the current theme of the application.
 * "system" follows the OS preference, "light" and "dark" force that mode.
 * @returns {UseThemeResult}
 */
export function useTheme({ broadcastLogoChange = false } = {}) {
  const [theme, _setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "default") return "dark"; // migrate legacy value
    return stored || "system";
  });

  const [systemTheme, setSystemTheme] = useState(() =>
    window.matchMedia?.("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark",
  );
  const hasMountedRef = useRef(false);

  // Listen for OS level theme changes
  useEffect(() => {
    if (!window.matchMedia) return;
    const mql: any = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e) => setSystemTheme(e.matches ? "light" : "dark");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.body.classList.toggle("light", resolvedTheme === "light");
    localStorage.setItem("theme", theme);
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (broadcastLogoChange) {
      window.dispatchEvent(new Event(REFETCH_LOGO_EVENT));
    }
  }, [broadcastLogoChange, resolvedTheme, theme]);

  // In development, attach keybind combinations to toggle theme
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    function toggleOnKeybind(e) {
      if (e.metaKey && e.key === ".") {
        e.preventDefault();
        _setTheme((prev) => (prev === "light" ? "dark" : "light"));
      }
    }
    document.addEventListener("keydown", toggleOnKeybind);
    return () => document.removeEventListener("keydown", toggleOnKeybind);
  }, []);

  /**
   * Sets the theme of the application and runs any
   * other necessary side effects
   * @param {ThemeOption} newTheme The new theme to set
   */
  function setTheme(newTheme) {
    _setTheme(newTheme);
    window.dispatchEvent(new Event(REFETCH_LOGO_EVENT));
  }

  return {
    theme,
    setTheme,
    availableThemes,
    isLight: resolvedTheme === "light",
  };
}
