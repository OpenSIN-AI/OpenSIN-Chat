// SPDX-License-Identifier: MIT

interface SourceSelectionScope {
  notebookSlug?: string | null;
  threadSlug?: string | null;
}

const STORAGE_PREFIX = "opensin_selected_sources";

function storageKey({ notebookSlug, threadSlug }: SourceSelectionScope): string {
  return [STORAGE_PREFIX, notebookSlug || "home", threadSlug || "default"].join(":");
}

export function readSelectedSourceIds(scope: SourceSelectionScope): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}
