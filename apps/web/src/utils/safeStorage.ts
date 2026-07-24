// SPDX-License-Identifier: MIT
import { LEGACY_KEY_MAP } from "./constants";

/**
 * Safe localStorage wrappers that never throw.
 *
 * Browser storage can be unavailable during SSR/tests, in private browsing,
 * or when access/quota policies block it. Callers therefore receive a safe
 * fallback instead of a render-breaking exception.
 *
 * Legacy aliases are migrated transparently to their current key names.
 */

const REVERSE_LEGACY_MAP: Record<string, string> = {};
for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_MAP)) {
  REVERSE_LEGACY_MAP[newKey] = oldKey;
}

function browserStorageOrNull(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function localStorageOrNull(): Storage | null {
  return browserStorageOrNull("local");
}

function sessionStorageOrNull(): Storage | null {
  return browserStorageOrNull("session");
}

function migrateLegacyKey(storage: Storage, key: string): string | null {
  const legacyKey = REVERSE_LEGACY_MAP[key];
  if (!legacyKey) return null;

  try {
    const value = storage.getItem(legacyKey);
    if (value !== null) {
      storage.setItem(key, value);
      storage.removeItem(legacyKey);
    }
    return value;
  } catch {
    return null;
  }
}

export function safeGetItem(key: string): string | null {
  const storage = localStorageOrNull();
  if (!storage) return null;

  try {
    const value = storage.getItem(key);
    return value !== null ? value : migrateLegacyKey(storage, key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  const storage = localStorageOrNull();
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  const storage = localStorageOrNull();
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Storage failures must not break logout or cleanup flows.
  }
}

export function safeGetSessionItem(key: string): string | null {
  const storage = sessionStorageOrNull();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetSessionItem(key: string, value: string): boolean {
  const storage = sessionStorageOrNull();
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveSessionItem(key: string): void {
  const storage = sessionStorageOrNull();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Storage failures must not break navigation or cleanup flows.
  }
}
