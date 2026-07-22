// SPDX-License-Identifier: MIT

import { safeGetItem, safeSetItem } from "@/utils/safeStorage";
import { isNotebookModeId, type NotebookModeId } from "./modes";

export interface NotebookModeScope {
  notebookSlug?: string | null;
  threadSlug?: string | null;
}

const STORAGE_PREFIX = "opensin_notebook_mode";
export const NOTEBOOK_MODE_CHANGE_EVENT = "opensin:notebook-mode-change";

export function notebookModeStorageKey({
  notebookSlug,
  threadSlug,
}: NotebookModeScope): string {
  return [STORAGE_PREFIX, notebookSlug || "home", threadSlug || "default"].join(
    ":",
  );
}

export function readNotebookMode(scope: NotebookModeScope): NotebookModeId {
  const value = safeGetItem(notebookModeStorageKey(scope));
  return isNotebookModeId(value) ? value : "chat";
}

export function writeNotebookMode(
  scope: NotebookModeScope,
  mode: NotebookModeId,
): boolean {
  return safeSetItem(notebookModeStorageKey(scope), mode);
}
