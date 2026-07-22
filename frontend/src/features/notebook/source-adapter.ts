// SPDX-License-Identifier: MIT

import { safeJsonParse } from "@/utils/request";
import type { NotebookSource, NotebookSourceKind } from "./sources";

interface WorkspaceDocument {
  id?: string | number;
  docId?: string;
  filename?: string;
  docpath?: string;
  title?: string;
  metadata?: unknown;
  type?: string;
  createdAt?: string;
  updatedAt?: string;
}

function inferKind(document: WorkspaceDocument, metadata: Record<string, any>): NotebookSourceKind {
  const source = String(
    metadata.source || metadata.sourceUrl || metadata.url || document.docpath || document.filename || "",
  ).toLowerCase();

  if (source.includes("youtube.com") || source.includes("youtu.be") || source.startsWith("youtube://")) {
    return "youtube";
  }
  if (source.startsWith("github://") || source.includes("github.com") || source.startsWith("gitlab://") || source.includes("bitbucket.org")) {
    return "repository";
  }
  if (
    source.includes("twitter.com") ||
    source.includes("x.com") ||
    source.includes("linkedin.com") ||
    source.includes("instagram.com") ||
    source.includes("facebook.com") ||
    source.includes("threads.net") ||
    source.includes("reddit.com")
  ) {
    return "social";
  }
  if (metadata.url || metadata.sourceUrl || /^https?:\/\//i.test(source)) {
    return "web";
  }
  return "file";
}

function sourceProvider(kind: NotebookSourceKind, metadata: Record<string, any>): string {
  if (metadata.provider) return String(metadata.provider);
  switch (kind) {
    case "youtube": return "youtube";
    case "repository": return "repository";
    case "social": return "social";
    case "web": return "web";
    default: return "upload";
  }
}

function sourceUri(document: WorkspaceDocument, metadata: Record<string, any>): string | undefined {
  const value = metadata.url || metadata.sourceUrl || metadata.source || document.docpath;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function workspaceDocumentToNotebookSource(document: WorkspaceDocument, notebookSlug: string): NotebookSource {
  const metadata = safeJsonParse(document.metadata, {}) as Record<string, any>;
  const kind = inferKind(document, metadata);
  const uri = sourceUri(document, metadata);
  const id = String(document.docId || document.id || metadata.id || document.docpath || document.filename || crypto.randomUUID());

  return {
    id,
    notebookSlug,
    kind,
    provider: sourceProvider(kind, metadata),
    title: metadata.title || document.title || document.filename || uri || "Unbenannte Quelle",
    description: metadata.description || metadata.summary || undefined,
    uri,
    status: "connected",
    enabled: true,
    permissions: { read: true, write: false, execute: false },
    metadata: { ...metadata, workspaceDocument: document },
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    lastSyncedAt: metadata.lastSyncedAt || document.updatedAt || undefined,
  };
}

export function workspaceDocumentsToNotebookSources(documents: WorkspaceDocument[] | undefined, notebookSlug: string): NotebookSource[] {
  if (!Array.isArray(documents)) return [];
  return documents.map((document) => workspaceDocumentToNotebookSource(document, notebookSlug));
}
