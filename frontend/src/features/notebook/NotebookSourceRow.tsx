// SPDX-License-Identifier: MIT

import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { Check } from "@phosphor-icons/react/dist/csr/Check";
import { DotsThree } from "@phosphor-icons/react/dist/csr/DotsThree";
import SourceIcon from "./SourceIcon";
import type { NotebookSource } from "./sources";

interface NotebookSourceRowProps {
  source: NotebookSource;
  selected: boolean;
  onToggle: () => void;
  onOpen?: () => void;
}

function sourceSubtitle(source: NotebookSource): string {
  if (source.uri) {
    try {
      const url = new URL(source.uri);
      return url.hostname.replace(/^www\./, "");
    } catch {
      return source.uri;
    }
  }
  switch (source.kind) {
    case "file": return "Datei";
    case "repository": return "Repository";
    case "youtube": return "YouTube";
    case "social": return "Social Media";
    default: return source.provider;
  }
}

export default function NotebookSourceRow({ source, selected, onToggle, onOpen }: NotebookSourceRowProps) {
  return (
    <article
      className={`group flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-theme-bg-secondary ${
        selected ? "text-theme-text-primary" : "text-theme-text-secondary"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        aria-label={selected ? `${source.title} deaktivieren` : `${source.title} aktivieren`}
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
          selected ? "border-theme-text-primary bg-theme-text-primary text-theme-bg-primary" : "border-theme-border bg-transparent"
        }`}
      >
        {selected && <Check size={12} weight="bold" />}
      </button>

      <div className="mt-0.5 shrink-0 text-theme-text-secondary">
        <SourceIcon kind={source.kind} />
      </div>

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 border-none bg-transparent p-0 text-left">
        <span className="block truncate text-sm font-medium text-theme-text-primary">{source.title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-theme-text-secondary">{sourceSubtitle(source)}</span>
      </button>

      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
        {source.uri?.startsWith("http") && (
          <a
            href={source.uri}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Quelle öffnen"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary"
          >
            <ArrowSquareOut size={14} />
          </a>
        )}
        <button
          type="button"
          aria-label="Weitere Optionen"
          className="flex h-7 w-7 items-center justify-center rounded-lg border-none bg-transparent text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary"
        >
          <DotsThree size={17} weight="bold" />
        </button>
      </div>
    </article>
  );
}
