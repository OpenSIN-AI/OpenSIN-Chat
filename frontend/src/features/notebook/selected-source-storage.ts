// SPDX-License-Identifier: MIT

import {
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
} from "@/utils/safeStorage";

interface SourceSelectionScope {
  notebookSlug?: string | null;
  threadSlug?: string | null;
}

export interface StoredSourceSelection {
  explicit: boolean;
  sourceIds: string[];
}

const STORAGE_PREFIX = "opensin_selected_sources";
export const SOURCE_SELECTION_CHANGE_EVENT =
  "opensin:notebook-sources-change";

export function sourceSelectionStorageKey({
  notebookSlug,
  threadSlug,
}: SourceSelectionScope): string {
  return [STORAGE_PREFIX, notebookSlug || "home", threadSlug || "default"].join(
    ":",
  );
}

function validSourceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (sourceId): sourceId is string =>
      typeof sourceId === "string" && sourceId.trim().length > 0,
  );
}

export function readSelectedSources(
  scope: SourceSelectionScope,
): StoredSourceSelection {
  const raw = safeGetItem(sourceSelectionStorageKey(scope));
  if (!raw) return { explicit: false, sourceIds: [] };

  try {
    const parsed: unknown = JSON.parse(raw);

    // Migration from the legacy string[] format.
    if (Array.isArray(parsed)) {
      return { explicit: true, sourceIds: validSourceIds(parsed) };
    }

    if (!parsed || typeof parsed !== "object") {
      return { explicit: false, sourceIds: [] };
    }

    const value = parsed as { explicit?: unknown; sourceIds?: unknown };
    return {
      explicit: value.explicit === true,
      sourceIds: validSourceIds(value.sourceIds),
    };
  } catch {
    return { explicit: false, sourceIds: [] };
  }
}

export function writeSelectedSources(
  scope: SourceSelectionScope,
  sourceIds: string[],
): boolean {
  const value: StoredSourceSelection = {
    explicit: true,
    sourceIds: [...new Set(validSourceIds(sourceIds))],
  };
  return safeSetItem(sourceSelectionStorageKey(scope), JSON.stringify(value));
}

export function clearSelectedSourcesPreference(
  scope: SourceSelectionScope,
): void {
  safeRemoveItem(sourceSelectionStorageKey(scope));
}

/** Backward-compatible helper for consumers that only need the IDs. */
export function readSelectedSourceIds(scope: SourceSelectionScope): string[] {
  return readSelectedSources(scope).sourceIds;
}
