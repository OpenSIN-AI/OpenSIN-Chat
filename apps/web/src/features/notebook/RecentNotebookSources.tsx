// SPDX-License-Identifier: MIT

import { useMemo } from "react";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import useDocument from "@/hooks/useDocument";
import { workspaceDocumentsToNotebookSources } from "./source-adapter";
import SourceIcon from "./SourceIcon";

interface RecentNotebookSourcesProps {
  workspace: any;
  onOpenSources: () => void;
  threadSlug?: string | null;
}

function sourceIdentity(document: any): string {
  return String(
    document?.docId ||
      document?.id ||
      document?.docpath ||
      document?.location ||
      document?.filename ||
      document?.title ||
      "",
  );
}

export default function RecentNotebookSources({
  workspace,
  onOpenSources,
  threadSlug = null,
}: RecentNotebookSourcesProps) {
  const notebookSlug = workspace?.slug || "notebook";
  const { document: parsedContext, isLoading } = useDocument(
    workspace?.slug,
    threadSlug,
  );

  const sources = useMemo(() => {
    const workspaceDocuments = Array.isArray(workspace?.documents)
      ? workspace.documents
      : [];
    const parsedFiles = Array.isArray(parsedContext?.files)
      ? parsedContext.files.map((file: any) => ({
          ...file,
          filename: file.filename || file.title,
          docpath: file.docpath || file.location,
        }))
      : [];
    const seen = new Set<string>();
    const documents = [...workspaceDocuments, ...parsedFiles].filter(
      (document) => {
        const identity = sourceIdentity(document);
        if (!identity || seen.has(identity)) return false;
        seen.add(identity);
        return true;
      },
    );
    return workspaceDocumentsToNotebookSources(documents, notebookSlug).slice(
      0,
      4,
    );
  }, [notebookSlug, parsedContext?.files, workspace?.documents]);

  const totalSourceCount = useMemo(() => {
    const identities = new Set<string>();
    for (const document of workspace?.documents || []) {
      const identity = sourceIdentity(document);
      if (identity) identities.add(identity);
    }
    for (const file of parsedContext?.files || []) {
      const identity = sourceIdentity(file);
      if (identity) identities.add(identity);
    }
    return identities.size;
  }, [parsedContext?.files, workspace?.documents]);

  return (
    <section className="w-full">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[11px] font-medium text-theme-text-secondary">
          Quellen
        </h2>
        <button
          type="button"
          onClick={onOpenSources}
          className="text-[11px] font-medium text-theme-text-secondary hover:text-theme-text-primary"
        >
          {sources.length > 0 ? "Alle anzeigen" : "Hinzufügen"}
        </button>
      </div>
      {isLoading && sources.length === 0 ? (
        <div className="flex w-full items-center gap-2 rounded-xl border border-theme-border px-4 py-3 text-xs text-theme-text-secondary">
          <CircleNotch size={14} className="animate-spin" aria-hidden="true" />
          Quellen werden geladen …
        </div>
      ) : sources.length === 0 ? (
        <button
          type="button"
          onClick={onOpenSources}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-theme-border px-4 py-3 text-left transition-colors hover:bg-theme-bg-secondary"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-theme-bg-secondary text-theme-text-secondary">
            <Plus size={15} />
          </div>
          <div>
            <span className="block text-xs font-medium text-theme-text-primary">
              Erste Quelle hinzufügen
            </span>
            <span className="mt-0.5 block text-[11px] text-theme-text-secondary">
              PDF, Webseite, Video, Repository oder verbundener Dienst
            </span>
          </div>
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sources.map((source) => (
            <button
              key={source.id}
              type="button"
              title={source.title}
              onClick={onOpenSources}
              className="flex h-8 max-w-full items-center gap-2 rounded-lg border border-theme-border px-2.5 text-xs text-theme-text-secondary transition-colors hover:bg-theme-bg-secondary hover:text-theme-text-primary"
            >
              <SourceIcon kind={source.kind} size={14} />
              <span className="max-w-40 truncate">{source.title}</span>
            </button>
          ))}
          {totalSourceCount > sources.length && (
            <button
              type="button"
              onClick={onOpenSources}
              className="h-8 rounded-lg border border-theme-border px-2.5 text-xs text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary"
            >
              +{totalSourceCount - sources.length}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
