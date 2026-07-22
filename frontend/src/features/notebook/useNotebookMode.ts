// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useMemo, useState } from "react";
import { getNotebookMode, isNotebookModeId, type NotebookModeId } from "./modes";
import {
  NOTEBOOK_MODE_CHANGE_EVENT,
  notebookModeStorageKey,
  readNotebookMode,
  writeNotebookMode,
} from "./notebook-mode-storage";

interface UseNotebookModeOptions {
  notebookSlug?: string | null;
  threadSlug?: string | null;
}

interface NotebookModeChangeDetail {
  mode?: unknown;
  notebookSlug?: string | null;
  threadSlug?: string | null;
}

export default function useNotebookMode(options: UseNotebookModeOptions) {
  const scope = useMemo(
    () => ({
      notebookSlug: options.notebookSlug,
      threadSlug: options.threadSlug,
    }),
    [options.notebookSlug, options.threadSlug],
  );
  const storageKey = useMemo(
    () => notebookModeStorageKey(scope),
    [scope],
  );
  const [modeId, setModeIdState] = useState<NotebookModeId>(() =>
    readNotebookMode(scope),
  );

  useEffect(() => {
    setModeIdState(readNotebookMode(scope));
  }, [scope]);

  useEffect(() => {
    function handleModeChange(event: Event) {
      const detail = (event as CustomEvent<NotebookModeChangeDetail>).detail;
      if (!isNotebookModeId(detail?.mode)) return;

      const sameNotebook =
        (detail.notebookSlug || null) === (options.notebookSlug || null);
      const sameThread =
        (detail.threadSlug || null) === (options.threadSlug || null);
      if (sameNotebook && sameThread) setModeIdState(detail.mode);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      setModeIdState(isNotebookModeId(event.newValue) ? event.newValue : "chat");
    }

    window.addEventListener(NOTEBOOK_MODE_CHANGE_EVENT, handleModeChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(NOTEBOOK_MODE_CHANGE_EVENT, handleModeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [options.notebookSlug, options.threadSlug, storageKey]);

  const setModeId = useCallback(
    (nextMode: NotebookModeId) => {
      setModeIdState(nextMode);
      writeNotebookMode(scope, nextMode);
      window.dispatchEvent(
        new CustomEvent(NOTEBOOK_MODE_CHANGE_EVENT, {
          detail: {
            mode: nextMode,
            notebookSlug: options.notebookSlug || null,
            threadSlug: options.threadSlug || null,
          },
        }),
      );
    },
    [options.notebookSlug, options.threadSlug, scope],
  );

  return { modeId, mode: getNotebookMode(modeId), setModeId };
}
