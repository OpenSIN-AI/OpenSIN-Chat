// SPDX-License-Identifier: MIT

export type GlobalSearchType =
  | "workspace"
  | "thread"
  | "chat"
  | "source"
  | "note"
  | "artifact";

export interface GlobalSearchTarget {
  workspaceSlug?: string | null;
  threadSlug?: string | null;
  chatId?: number | null;
  sourceId?: string | null;
  noteId?: string | number | null;
  artifactUuid?: string | null;
  sidebar?: string | null;
  sourcePanel?: string | null;
}

export interface GlobalSearchResult {
  type: GlobalSearchType;
  id: string;
  workspaceId?: number | null;
  workspaceName?: string | null;
  workspaceSlug?: string | null;
  title: string;
  subtitle?: string;
  snippet?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  score?: number;
  target: GlobalSearchTarget;
  metadata?: Record<string, unknown>;
}

export interface GlobalSearchResponse {
  success: boolean;
  query: string;
  results: GlobalSearchResult[];
  counts: Partial<Record<GlobalSearchType, number>>;
  total: number;
  error?: string;
}
