// SPDX-License-Identifier: MIT

import { ArrowSquareOut, FileText, X } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { parseChunkSource } from "@/components/WorkspaceChat/ChatContainer/ChatHistory/Citation";

interface CitationPopoverProps {
  source: any;
  number: number;
  workspaceSlug?: string;
  onClose: () => void;
}

export default function CitationPopover({ source, number, onClose }: CitationPopoverProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    }
    window.addEventListener("mousedown", closeOnOutside);
    return () => window.removeEventListener("mousedown", closeOnOutside);
  }, [onClose]);

  const parsed = parseChunkSource(source);
  const firstChunk = source?.chunks?.[0];
  const excerpt = (firstChunk?.text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={`Quelle ${number}`}
      className="absolute bottom-full left-1/2 z-50 mb-2 w-[min(360px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl border border-theme-border bg-theme-bg-primary p-3 text-left shadow-2xl"
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-theme-bg-secondary text-theme-text-secondary">
          <FileText size={15} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-theme-text-primary">
            {source.title || parsed.text || `Quelle ${number}`}
          </p>
          {parsed.href && (
            <p className="mt-0.5 truncate text-[10px] text-theme-text-muted">{parsed.href}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-theme-text-muted hover:bg-theme-bg-secondary"
          aria-label="Schließen"
        >
          <X size={14} />
        </button>
      </div>

      {excerpt && (
        <p className="mt-3 line-clamp-6 text-xs leading-5 text-theme-text-secondary">
          {excerpt}
          {excerpt.length >= 360 ? "…" : ""}
        </p>
      )}

      {parsed.href && (
        <a
          href={parsed.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-theme-text-primary no-underline hover:underline"
        >
          Quelle öffnen
          <ArrowSquareOut size={13} />
        </a>
      )}
    </div>
  );
}
