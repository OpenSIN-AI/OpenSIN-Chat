// SPDX-License-Identifier: MIT

import { useMemo, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { FileArrowUp } from "@phosphor-icons/react/dist/csr/FileArrowUp";
import { Link as LinkIcon } from "@phosphor-icons/react/dist/csr/Link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { X } from "@phosphor-icons/react/dist/csr/X";
import SourceIcon from "./SourceIcon";
import { SOURCE_PROVIDERS, type NotebookSourceProvider } from "./sources";

interface AddSourceModalProps {
  open: boolean;
  onClose: () => void;
  onUploadFiles: () => void;
  onAddUrl: () => void;
  onSelectProvider?: (provider: NotebookSourceProvider) => void;
}

function availabilityLabel(availability: NotebookSourceProvider["availability"]): string | null {
  if (availability === "ready") return null;
  if (availability === "experimental") return "Experimentell";
  return "Demnächst";
}

export default function AddSourceModal({ open, onClose, onUploadFiles, onAddUrl, onSelectProvider }: AddSourceModalProps) {
  const [query, setQuery] = useState("");
  const providers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return SOURCE_PROVIDERS;
    return SOURCE_PROVIDERS.filter(
      (provider) => provider.name.toLowerCase().includes(normalized) || provider.description.toLowerCase().includes(normalized),
    );
  }, [query]);

  if (!open) return null;

  function handleProvider(provider: NotebookSourceProvider) {
    if (provider.id === "upload") { onUploadFiles(); onClose(); return; }
    if (provider.id === "web" || provider.id === "youtube") { onAddUrl(); onClose(); return; }
    if (provider.availability !== "ready") return;
    onSelectProvider?.(provider);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quelle hinzufügen"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-theme-border bg-theme-bg-primary shadow-2xl">
        <header className="flex items-center justify-between border-b border-theme-border px-5 py-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="hidden h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent text-theme-text-secondary hover:bg-theme-bg-secondary sm:flex" aria-label="Zurück">
              <ArrowLeft size={17} />
            </button>
            <div>
              <h2 className="text-base font-semibold text-theme-text-primary">Quelle hinzufügen</h2>
              <p className="mt-0.5 text-xs text-theme-text-secondary">Wähle aus, worauf dieses Notebook zugreifen darf.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary" aria-label="Schließen">
            <X size={17} />
          </button>
        </header>

        <div className="border-b border-theme-border px-5 py-4">
          <div className="flex items-center gap-2 rounded-xl border border-theme-border bg-theme-bg-secondary px-3">
            <MagnifyingGlass size={16} className="text-theme-text-secondary" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dateien, GitHub, Gmail, Notion …" className="h-10 min-w-0 flex-1 border-none bg-transparent text-sm text-theme-text-primary outline-none placeholder:text-theme-text-secondary" />
          </div>
        </div>

        <div className="overflow-y-auto p-3">
          {!query && (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { onUploadFiles(); onClose(); }} className="flex items-center gap-3 rounded-xl border border-theme-border bg-theme-bg-secondary px-4 py-3 text-left hover:bg-theme-bg-tertiary">
                <FileArrowUp size={20} className="text-theme-text-primary" />
                <div>
                  <span className="block text-sm font-medium text-theme-text-primary">Dateien hochladen</span>
                  <span className="block text-[11px] text-theme-text-secondary">PDFs, Dokumente und Bilder</span>
                </div>
              </button>
              <button type="button" onClick={() => { onAddUrl(); onClose(); }} className="flex items-center gap-3 rounded-xl border border-theme-border bg-theme-bg-secondary px-4 py-3 text-left hover:bg-theme-bg-tertiary">
                <LinkIcon size={20} className="text-theme-text-primary" />
                <div>
                  <span className="block text-sm font-medium text-theme-text-primary">Link einfügen</span>
                  <span className="block text-[11px] text-theme-text-secondary">Webseite, Video oder Beitrag</span>
                </div>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {providers.map((provider) => {
              const badge = availabilityLabel(provider.availability);
              return (
                <button
                  key={provider.id}
                  type="button"
                  disabled={provider.availability === "planned"}
                  onClick={() => handleProvider(provider)}
                  className={`flex items-start gap-3 rounded-xl border-none px-3 py-3 text-left ${
                    provider.availability === "planned" ? "cursor-default opacity-55" : "hover:bg-theme-bg-secondary"
                  }`}
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-theme-bg-secondary text-theme-text-primary">
                    <SourceIcon kind={provider.kind} size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-theme-text-primary">{provider.name}</span>
                      {badge && <span className="shrink-0 rounded-full bg-theme-bg-tertiary px-1.5 py-0.5 text-[9px] font-medium text-theme-text-secondary">{badge}</span>}
                    </div>
                    <span className="mt-0.5 block text-[11px] leading-4 text-theme-text-secondary">{provider.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
