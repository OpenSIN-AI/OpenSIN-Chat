// SPDX-License-Identifier: MIT

import { ArrowSquareOut, Globe } from "@phosphor-icons/react";

interface WebSource {
  title: string;
  url: string;
  domain?: string;
}

interface WebSearchSourcesProps {
  sources: WebSource[];
}

export default function WebSearchSources({ sources }: WebSearchSourcesProps) {
  if (!sources.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {sources.slice(0, 8).map((source, index) => (
        <a
          key={`${source.url}-${index}`}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex max-w-56 items-center gap-2 rounded-lg border border-theme-border bg-theme-bg-secondary px-2.5 py-2 no-underline transition-colors hover:bg-theme-bg-tertiary"
        >
          <Globe size={14} className="shrink-0 text-theme-text-secondary" />

          <div className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-theme-text-primary">
              {source.title}
            </span>
            <span className="block truncate text-[10px] text-theme-text-muted">
              {source.domain ||
                (() => {
                  try {
                    return new URL(source.url).hostname;
                  } catch {
                    return source.url;
                  }
                })()}
            </span>
          </div>

          <ArrowSquareOut size={12} className="shrink-0 text-theme-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </a>
      ))}
    </div>
  );
}
