// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useMemo, useState } from "react";

interface UseSelectedSourcesOptions {
  notebookSlug?: string | null;
  threadSlug?: string | null;
  sourceIds: string[];
}

const STORAGE_PREFIX = "opensin_selected_sources";

function makeStorageKey({ notebookSlug, threadSlug }: Pick<UseSelectedSourcesOptions, "notebookSlug" | "threadSlug">): string {
  return [STORAGE_PREFIX, notebookSlug || "home", threadSlug || "default"].join(":");
}

function readStoredSelection(key: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return null;
  }
}

export default function useSelectedSources({ notebookSlug, threadSlug, sourceIds }: UseSelectedSourcesOptions) {
  const key = useMemo(() => makeStorageKey({ notebookSlug, threadSlug }), [notebookSlug, threadSlug]);
  const availableIds = useMemo(() => new Set(sourceIds), [sourceIds]);
  const [selectedIds, setSelectedIds] = useState<string[]>(sourceIds);

  useEffect(() => {
    const stored = readStoredSelection(key);
    if (stored === null) {
      setSelectedIds(sourceIds);
      return;
    }
    setSelectedIds(stored.filter((id) => availableIds.has(id)));
  }, [key, sourceIds, availableIds]);

  const persist = useCallback(
    (nextIds: string[]) => {
      const unique = Array.from(new Set(nextIds.filter((id) => availableIds.has(id))));
      setSelectedIds(unique);
      try {
        window.localStorage.setItem(key, JSON.stringify(unique));
      } catch {
        // Local persistence is an enhancement, not a requirement.
      }
      window.dispatchEvent(
        new CustomEvent("opensin:notebook-sources-change", {
          detail: { notebookSlug: notebookSlug || null, threadSlug: threadSlug || null, sourceIds: unique },
        }),
      );
    },
    [availableIds, key, notebookSlug, threadSlug],
  );

  const toggleSource = useCallback(
    (sourceId: string) => {
      if (!availableIds.has(sourceId)) return;
      persist(selectedIds.includes(sourceId) ? selectedIds.filter((id) => id !== sourceId) : [...selectedIds, sourceId]);
    },
    [availableIds, persist, selectedIds],
  );

  const selectAll = useCallback(() => persist(sourceIds), [persist, sourceIds]);
  const clearAll = useCallback(() => persist([]), [persist]);

  return {
    selectedIds,
    selectedSet: new Set(selectedIds),
    allSelected: sourceIds.length > 0 && selectedIds.length === sourceIds.length,
    noneSelected: selectedIds.length === 0,
    toggleSource,
    selectAll,
    clearAll,
    setSelectedIds: persist,
  };
}
