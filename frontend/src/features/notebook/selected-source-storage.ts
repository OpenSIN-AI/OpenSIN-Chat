// SPDX-License-Identifier: MIT

interface SourceSelectionScope {
  notebookSlug?: string | null;
  threadSlug?: string | null;
}

export interface StoredSourceSelection {
  explicit: boolean;
  sourceIds: string[];
}

const STORAGE_PREFIX = "opensin_selected_sources";

function storageKey({ notebookSlug, threadSlug }: SourceSelectionScope): string {
  return [STORAGE_PREFIX, notebookSlug || "home", threadSlug || "default"].join(":");
}

export function readSelectedSources(scope: SourceSelectionScope): StoredSourceSelection {
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return { explicit: false, sourceIds: [] };

    const parsed = JSON.parse(raw);

    // Migration from old string[] format.
    if (Array.isArray(parsed)) {
      return {
        explicit: true,
        sourceIds: parsed.filter((value): value is string => typeof value === "string"),
      };
    }

    if (!parsed || typeof parsed !== "object") return { explicit: false, sourceIds: [] };

    return {
      explicit: parsed.explicit === true,
      sourceIds: Array.isArray(parsed.sourceIds)
        ? parsed.sourceIds.filter((value: unknown): value is string => typeof value === "string")
        : [],
    };
  } catch {
    return { explicit: false, sourceIds: [] };
  }
}

export function writeSelectedSources(scope: SourceSelectionScope, sourceIds: string[]) {
  const value: StoredSourceSelection = {
    explicit: true,
    sourceIds: [...new Set(sourceIds)],
  };
  window.localStorage.setItem(storageKey(scope), JSON.stringify(value));
}

export function clearSelectedSourcesPreference(scope: SourceSelectionScope) {
  window.localStorage.removeItem(storageKey(scope));
}

/**
 * Backward-compatible helper that returns just the source IDs array.
 * Prefer `readSelectedSources` for new code that needs the `explicit` flag.
 */
export function readSelectedSourceIds(scope: SourceSelectionScope): string[] {
  return readSelectedSources(scope).sourceIds;
}
