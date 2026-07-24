// SPDX-License-Identifier: MIT

const STORAGE_KEY = "opensin_pending_search_navigation";

export interface PendingSearchNavigation {
  workspaceSlug: string;
  threadSlug?: string | null;
  chatId?: number | null;
  sourceId?: string | null;
  noteId?: string | number | null;
  artifactUuid?: string | null;
  sidebar?: string | null;
  createdAt: number;
}

export function setPendingSearchNavigation(
  value: Omit<PendingSearchNavigation, "createdAt">,
) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...value, createdAt: Date.now() }),
  );
}

export function consumePendingSearchNavigation(): PendingSearchNavigation | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (Date.now() - Number(parsed.createdAt || 0) > 30_000) return null;

    return parsed;
  } catch {
    return null;
  }
}
