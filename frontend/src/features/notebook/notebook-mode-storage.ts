// SPDX-License-Identifier: MIT

import { isNotebookModeId, type NotebookModeId } from "./modes";

interface NotebookModeScope {
  notebookSlug?: string | null;
  threadSlug?: string | null;
}

const STORAGE_PREFIX = "opensin_notebook_mode";

function storageKey({ notebookSlug, threadSlug }: NotebookModeScope): string {
  return [STORAGE_PREFIX, notebookSlug || "home", threadSlug || "default"].join(":");
}

export function readNotebookMode(scope: NotebookModeScope): NotebookModeId {
  try {
    const value = window.localStorage.getItem(storageKey(scope));
    return isNotebookModeId(value) ? value : "chat";
  } catch {
    return "chat";
  }
}
