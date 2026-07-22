// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
} from "@/utils/safeStorage";

const STORAGE_PREFIX = "opensin_selected_code_runner";
export const CODE_RUNNER_CHANGE_EVENT = "opensin:code-runner-change";

interface CodeRunnerChangeDetail {
  notebookSlug?: string | null;
  runnerId?: unknown;
}

export function codeRunnerStorageKey(notebookSlug?: string | null): string {
  return [STORAGE_PREFIX, notebookSlug || "home"].join(":");
}

export function readSelectedCodeRunnerId(
  notebookSlug?: string | null,
): string | null {
  return safeGetItem(codeRunnerStorageKey(notebookSlug))?.trim() || null;
}

export default function useSelectedCodeRunner(notebookSlug?: string | null) {
  const storageKey = useMemo(
    () => codeRunnerStorageKey(notebookSlug),
    [notebookSlug],
  );
  const [runnerId, setRunnerIdState] = useState<string | null>(() =>
    readSelectedCodeRunnerId(notebookSlug),
  );

  useEffect(() => {
    setRunnerIdState(readSelectedCodeRunnerId(notebookSlug));
  }, [notebookSlug, storageKey]);

  useEffect(() => {
    function handleChange(event: Event) {
      const detail = (event as CustomEvent<CodeRunnerChangeDetail>).detail;
      const sameNotebook =
        (detail?.notebookSlug || null) === (notebookSlug || null);
      if (!sameNotebook || typeof detail?.runnerId !== "string") return;
      setRunnerIdState(detail.runnerId.trim() || null);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      setRunnerIdState(event.newValue?.trim() || null);
    }

    window.addEventListener(CODE_RUNNER_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(CODE_RUNNER_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [notebookSlug, storageKey]);

  const setRunnerId = useCallback(
    (nextRunnerId: string) => {
      const normalized = nextRunnerId.trim();
      setRunnerIdState(normalized || null);

      if (normalized) safeSetItem(storageKey, normalized);
      else safeRemoveItem(storageKey);

      window.dispatchEvent(
        new CustomEvent(CODE_RUNNER_CHANGE_EVENT, {
          detail: {
            notebookSlug: notebookSlug || null,
            runnerId: normalized,
          },
        }),
      );
    },
    [notebookSlug, storageKey],
  );

  return { runnerId, setRunnerId };
}
