// SPDX-License-Identifier: MIT

import { useState } from "react";
import { combineLikeSources, CitationDetailModal, parseChunkSource, SourceTypeCircle } from "@/components/WorkspaceChat/ChatContainer/ChatHistory/Citation";

interface AnswerSourcesProps {
  sources?: any[];
  workspaceSlug?: string;
}

export default function AnswerSources({ sources = [], workspaceSlug }: AnswerSourcesProps) {
  const [selected, setSelected] = useState<any>(null);
  const combined = combineLikeSources(sources);

  if (!combined.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {combined.slice(0, 8).map((source, index) => {
          const parsed = parseChunkSource(source);
          return (
            <button
              key={source.title || index}
              type="button"
              onClick={() => setSelected(source)}
              className="flex h-8 max-w-56 items-center gap-2 rounded-lg border border-theme-border bg-theme-bg-secondary px-2.5 text-left transition-colors hover:bg-theme-bg-tertiary"
            >
              <span className="text-[10px] font-semibold text-theme-text-muted">{index + 1}</span>
              <SourceTypeCircle type={parsed.icon} size={16} iconSize={9} url={parsed.href} />
              <span className="truncate text-xs text-theme-text-secondary">
                {source.title || parsed.text}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <CitationDetailModal
          source={selected}
          workspaceSlug={workspaceSlug}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
