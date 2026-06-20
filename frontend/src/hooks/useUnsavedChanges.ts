// SPDX-License-Identifier: MIT
// Docs: useUnsavedChanges.doc.md
// Purpose: Reusable hook that blocks navigation when a form has unsaved changes.
// Uses React Router's useBlocker (v6.30+) + beforeunload for tab/window close.
import { useCallback, useEffect, useMemo } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Block route navigation and tab close when `hasChanges` is true.
 *
 * Returns the blocker so the calling component can render a
 * confirmation dialog when `blocker.state === "blocking"`.
 *
 * @param hasChanges - whether the current form has unsaved edits
 * @param message - optional message for the beforeunload event (some browsers ignore custom text)
 */
export function useUnsavedChanges(hasChanges: boolean, message?: string) {
  const blocker = useBlocker(useCallback(() => hasChanges, [hasChanges]));

  // Sync beforeunload for tab/window close
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message ?? "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges, message]);

  return blocker;
}

/**
 * Convenience wrapper that returns a stable object so callers
 * don't need to import useBlocker types.
 */
export function useUnsavedChangesGuard(hasChanges: boolean) {
  const blocker = useUnsavedChanges(hasChanges);
  return useMemo(
    () => ({
      isBlocking: blocker.state === "blocking",
      reset: () => blocker.reset(),
      proceed: () => blocker.proceed(),
    }),
    [blocker],
  );
}
