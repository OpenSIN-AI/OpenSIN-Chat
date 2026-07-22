// SPDX-License-Identifier: MIT

import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { workspaceDocumentsToNotebookSources } from "./source-adapter";
import SourceIcon from "./SourceIcon";

interface RecentNotebookSourcesProps {
  workspace: any;
  onOpenSources: () => void;
}

export default function RecentNotebookSources({ workspace, onOpenSources }: RecentNotebookSourcesProps) {
  const notebookSlug = workspace?.slug || "notebook";
  const sources = workspaceDocumentsToNotebookSources(workspace?.documents, notebookSlug).slice(0, 4);

  return (
    <section className="w-full">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[11px] font-medium text-theme-text-secondary">Quellen</h2>
        <button type="button" onClick={onOpenSources} className="text-[11px] font-medium text-theme-text-secondary hover:text-theme-text-primary">
          {sources.length > 0 ? "Alle anzeigen" : "Hinzufügen"}
        </button>
      </div>
      {sources.length === 0 ? (
        <button
          type="button"
          onClick={onOpenSources}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-theme-border px-4 py-3 text-left transition-colors hover:bg-theme-bg-secondary"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-theme-bg-secondary text-theme-text-secondary">
            <Plus size={15} />
          </div>
          <div>
            <span className="block text-xs font-medium text-theme-text-primary">Erste Quelle hinzufügen</span>
            <span className="mt-0.5 block text-[11px] text-theme-text-secondary">PDF, Webseite, Video, Repository oder verbundener Dienst</span>
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
          {Array.isArray(workspace?.documents) && workspace.documents.length > sources.length && (
            <button type="button" onClick={onOpenSources} className="h-8 rounded-lg border border-theme-border px-2.5 text-xs text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary">
              +{workspace.documents.length - sources.length}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
