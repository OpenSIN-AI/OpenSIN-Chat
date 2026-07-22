// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  readSelectedSources,
  SOURCE_SELECTION_CHANGE_EVENT,
  sourceSelectionStorageKey,
  writeSelectedSources,
} from "./selected-source-storage";

interface UseSelectedSourcesOptions {
  notebookSlug?: string | null;
  threadSlug?: string | null;
  sourceIds: string[];
}

interface SourceSelectionChangeDetail {
  notebookSlug?: string | null;
  threadSlug?: string | null;
  sourceIds?: unknown;
}

function normalizeSelection(value: unknown, availableIds: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value)].filter(
    (sourceId): sourceId is string =>
      typeof sourceId === "string" && availableIds.has(sourceId),
  );
}

export default function useSelectedSources({
  notebookSlug,
  threadSlug,
  sourceIds,
}: UseSelectedSourcesOptions) {
  const scope = useMemo(
    () => ({ notebookSlug, threadSlug }),
    [notebookSlug, threadSlug],
  );
  const storageKey = useMemo(
    () => sourceSelectionStorageKey(scope),
    [scope],
  );
  const availableIds = useMemo(() => new Set(sourceIds), [sourceIds]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const stored = readSelectedSources(scope);
    return stored.explicit
      ? normalizeSelection(stored.sourceIds, new Set(sourceIds))
      : sourceIds;
  });

  useEffect(() => {
    const stored = readSelectedSources(scope);
    setSelectedIds(
      stored.explicit
        ? normalizeSelection(stored.sourceIds, availableIds)
        : sourceIds,
    );
  }, [availableIds, scope, sourceIds]);

  useEffect(() => {
    function applySelection(value: unknown) {
      setSelectedIds(normalizeSelection(value, availableIds));
    }

    function handleChange(event: Event) {
      const detail = (event as CustomEvent<SourceSelectionChangeDetail>).detail;
      const sameNotebook =
        (detail?.notebookSlug || null) === (notebookSlug || null);
      const sameThread = (detail?.threadSlug || null) === (threadSlug || null);
      if (sameNotebook && sameThread) applySelection(detail?.sourceIds);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      const stored = readSelectedSources(scope);
      setSelectedIds(
        stored.explicit
          ? normalizeSelection(stored.sourceIds, availableIds)
          : sourceIds,
      );
    }

    window.addEventListener(SOURCE_SELECTION_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(SOURCE_SELECTION_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [availableIds, notebookSlug, scope, sourceIds, storageKey, threadSlug]);

  const persist = useCallback(
    (nextIds: string[]) => {
      const unique = normalizeSelection(nextIds, availableIds);
      setSelectedIds(unique);
      writeSelectedSources(scope, unique);
      window.dispatchEvent(
        new CustomEvent(SOURCE_SELECTION_CHANGE_EVENT, {
          detail: {
            notebookSlug: notebookSlug || null,
            threadSlug: threadSlug || null,
            sourceIds: unique,
          },
        }),
      );
    },
    [availableIds, notebookSlug, scope, threadSlug],
  );

  const toggleSource = useCallback(
    (sourceId: string) => {
      if (!availableIds.has(sourceId)) return;
      persist(
        selectedIds.includes(sourceId)
          ? selectedIds.filter((id) => id !== sourceId)
          : [...selectedIds, sourceId],
      );
    },
    [availableIds, persist, selectedIds],
  );

  const selectAll = useCallback(() => persist(sourceIds), [persist, sourceIds]);
  const clearAll = useCallback(() => persist([]), [persist]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return {
    selectedIds,
    selectedSet,
    allSelected: sourceIds.length > 0 && selectedIds.length === sourceIds.length,
    noneSelected: selectedIds.length === 0,
    toggleSource,
    selectAll,
    clearAll,
    setSelectedIds: persist,
  };
}
