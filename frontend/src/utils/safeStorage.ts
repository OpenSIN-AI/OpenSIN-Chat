// SPDX-License-Identifier: MIT
import { LEGACY_THEME_KEY, THEME_KEY } from "./constants";

/**
 * Safe localStorage wrappers that never throw.
 *
 * In private browsing mode (Safari) or when storage quota is exceeded,
 * raw localStorage.getItem/setItem can throw a SecurityError or
 * QuotaExceededError. These wrappers catch those exceptions so callers
 * don't need repetitive try-catch blocks.
 */

export function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

/**
 * Reads the theme preference from localStorage, preferring the namespaced
 * `openafd_theme` key and falling back to the legacy `theme` key for
 * backward compatibility. If the legacy key is found, it is migrated
 * to the new key.
 *
 * @returns {string | null} The stored theme value or null.
 */
export function getStoredTheme(): string | null {
  const namespaced = safeGetItem(THEME_KEY);
  if (namespaced !== null) return namespaced;

  const legacy = safeGetItem(LEGACY_THEME_KEY);
  if (legacy !== null) {
    // Migrate legacy key to namespaced key
    safeSetItem(THEME_KEY, legacy);
    safeRemoveItem(LEGACY_THEME_KEY);
    return legacy;
  }
  return null;
}
