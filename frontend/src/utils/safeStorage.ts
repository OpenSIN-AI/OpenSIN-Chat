// SPDX-License-Identifier: MIT
import { LEGACY_KEY_MAP } from "./constants";

/**
 * Safe localStorage wrappers that never throw.
 *
 * In private browsing mode (Safari) or when storage quota is exceeded,
 * raw localStorage.getItem/setItem can throw a SecurityError or
 * QuotaExceededError. These wrappers catch those exceptions so callers
 * don't need repetitive try-catch blocks.
 *
 * Includes transparent migration from legacy `openafd_` keys to `opensin_`
 * keys. When a legacy key is found, its value is copied to the new key and
 * the old key is removed.
 */

// Build a reverse lookup: new key → legacy key
const REVERSE_LEGACY_MAP: Record<string, string> = {};
for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_MAP)) {
  REVERSE_LEGACY_MAP[newKey] = oldKey;
}

function migrateLegacyKey(key: string): string | null {
  const legacyKey = REVERSE_LEGACY_MAP[key];
  if (!legacyKey) return null;
  try {
    const value = window.localStorage.getItem(legacyKey);
    if (value !== null) {
      window.localStorage.setItem(key, value);
      window.localStorage.removeItem(legacyKey);
    }
    return value;
  } catch {
    return null;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
    // Try migrating from legacy key
    return migrateLegacyKey(key);
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
