// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_PREFIX = "opensin_selected_code_runner";

export const CODE_RUNNER_CHANGE_EVENT = "opensin:code-runner-change";

interface CodeRunnerChangeDetail {
  notebookSlug?: string | null;
  runnerId?: unknown;
}

export function codeRunnerStorageKey(notebookSlug?: string | null): string {
  return [STORAGE_PREFIX, notebookSlug || "home"].join(":");
}

export function readSelectedCodeRunnerId(notebookSlug?: string | null): string | null {
  try {
    const value = window.localStorage.getItem(codeRunnerStorageKey(notebookSlug));
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export default function useSelectedCodeRunner(notebookSlug?: string | null) {
  const storageKey = useMemo(() => codeRunnerStorageKey(notebookSlug), [notebookSlug]);
  const [runnerId, setRunnerIdState] = useState<string | null>(() =>
    readSelectedCodeRunnerId(notebookSlug),
  );

  useEffect(() => {
    setRunnerIdState(readSelectedCodeRunnerId(notebookSlug));
  }, [notebookSlug, storageKey]);

  useEffect(() => {
    function handleChange(event: Event) {
      const detail = (event as CustomEvent<CodeRunnerChangeDetail>).detail;
      const sameNotebook = (detail?.notebookSlug || null) === (notebookSlug || null);
      if (!sameNotebook || typeof detail?.runnerId !== "string") return;
      setRunnerIdState(detail.runnerId);
    }

    window.addEventListener(CODE_RUNNER_CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(CODE_RUNNER_CHANGE_EVENT, handleChange);
  }, [notebookSlug]);

  const setRunnerId = useCallback(
    (nextRunnerId: string) => {
      const normalized = nextRunnerId.trim();
      setRunnerIdState(normalized || null);

      try {
        if (normalized) {
          window.localStorage.setItem(storageKey, normalized);
        } else {
          window.localStorage.removeItem(storageKey);
        }
      } catch {
        // Storage may be unavailable.
      }

      window.dispatchEvent(
        new CustomEvent(CODE_RUNNER_CHANGE_EVENT, {
          detail: { notebookSlug: notebookSlug || null, runnerId: normalized },
        }),
      );
    },
    [notebookSlug, storageKey],
  );

  return { runnerId, setRunnerId };
}
