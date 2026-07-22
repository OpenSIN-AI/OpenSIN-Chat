// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useMemo, useState } from "react";
import { getNotebookMode, isNotebookModeId, type NotebookModeId } from "./modes";

const STORAGE_PREFIX = "opensin_notebook_mode";
export const NOTEBOOK_MODE_CHANGE_EVENT = "opensin:notebook-mode-change";

interface UseNotebookModeOptions {
  notebookSlug?: string | null;
  threadSlug?: string | null;
}

interface NotebookModeChangeDetail {
  mode?: unknown;
  notebookSlug?: string | null;
  threadSlug?: string | null;
}

function storageKey({ notebookSlug, threadSlug }: UseNotebookModeOptions): string {
  return [STORAGE_PREFIX, notebookSlug || "home", threadSlug || "default"].join(":");
}

function loadMode(key: string): NotebookModeId {
  if (typeof window === "undefined") return "chat";
  try {
    const value = window.localStorage.getItem(key);
    return isNotebookModeId(value) ? value : "chat";
  } catch {
    return "chat";
  }
}

export default function useNotebookMode(options: UseNotebookModeOptions) {
  const key = useMemo(() => storageKey({ notebookSlug: options.notebookSlug, threadSlug: options.threadSlug }), [options.notebookSlug, options.threadSlug]);
  const [modeId, setModeIdState] = useState<NotebookModeId>(() => loadMode(key));

  useEffect(() => {
    setModeIdState(loadMode(key));
  }, [key]);

  useEffect(() => {
    function handleModeChange(event: Event) {
      const detail = (event as CustomEvent<NotebookModeChangeDetail>).detail;
      if (!isNotebookModeId(detail?.mode)) return;
      const sameNotebook = (detail.notebookSlug || null) === (options.notebookSlug || null);
      const sameThread = (detail.threadSlug || null) === (options.threadSlug || null);
      if (sameNotebook && sameThread) {
        setModeIdState(detail.mode);
      }
    }
    function handleStorage(event: StorageEvent) {
      if (event.key !== key || !isNotebookModeId(event.newValue)) return;
      setModeIdState(event.newValue);
    }
    window.addEventListener(NOTEBOOK_MODE_CHANGE_EVENT, handleModeChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(NOTEBOOK_MODE_CHANGE_EVENT, handleModeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [key, options.notebookSlug, options.threadSlug]);

  const setModeId = useCallback(
    (nextMode: NotebookModeId) => {
      setModeIdState(nextMode);
      try { window.localStorage.setItem(key, nextMode); } catch {}
      window.dispatchEvent(
        new CustomEvent(NOTEBOOK_MODE_CHANGE_EVENT, {
          detail: { mode: nextMode, notebookSlug: options.notebookSlug || null, threadSlug: options.threadSlug || null },
        }),
      );
    },
    [key, options.notebookSlug, options.threadSlug],
  );

  return { modeId, mode: getNotebookMode(modeId), setModeId };
}
