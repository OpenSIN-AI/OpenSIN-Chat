// SPDX-License-Identifier: MIT

import { useCallback, useEffect, useMemo, useState } from "react";
import { CODE_RUNNER_CATALOG } from "./catalog";

const STORAGE_PREFIX = "opensin_code_runner";

export default function useSelectedCodeRunner(notebookSlug?: string | null) {
  const storageKey = useMemo(() => `${STORAGE_PREFIX}:${notebookSlug || "home"}`, [notebookSlug]);
  const [runnerId, setRunnerIdState] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      const exists = CODE_RUNNER_CATALOG.some((runner) => runner.id === saved);
      setRunnerIdState(exists ? saved : null);
    } catch {
      setRunnerIdState(null);
    }
  }, [storageKey]);

  const setRunnerId = useCallback(
    (nextRunnerId: string) => {
      const exists = CODE_RUNNER_CATALOG.some((runner) => runner.id === nextRunnerId);
      if (!exists) return;
      setRunnerIdState(nextRunnerId);
      try {
        window.localStorage.setItem(storageKey, nextRunnerId);
      } catch {
        // Storage is optional.
      }
    },
    [storageKey],
  );

  return {
    runnerId,
    runner: CODE_RUNNER_CATALOG.find((item) => item.id === runnerId) || null,
    setRunnerId,
  };
}
