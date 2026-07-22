// SPDX-License-Identifier: MIT

import { ArrowUpRight } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import HighlightedText from "./HighlightedText";
import SearchResultIcon from "./SearchResultIcon";
import type { GlobalSearchResult } from "./types";

export default function SearchResultRow({
  result,
  query,
  active,
  onSelect,
}: {
  result: GlobalSearchResult;
  query: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={[
        "group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left",
        active
          ? "bg-theme-bg-secondary"
          : "hover:bg-theme-bg-secondary",
      ].join(" ")}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-theme-bg-tertiary text-theme-text-secondary">
        <SearchResultIcon type={result.type} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-theme-text-primary">
            <HighlightedText text={result.title} query={query} />
          </span>
          {result.workspaceName && (
            <span className="hidden shrink-0 truncate text-[10px] text-theme-text-muted sm:block">
              {result.workspaceName}
            </span>
          )}
        </div>
        {result.snippet && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-theme-text-secondary">
            <HighlightedText text={result.snippet} query={query} />
          </p>
        )}
      </div>

      <ArrowUpRight
        size={13}
        className="mt-1 shrink-0 text-theme-text-muted opacity-0 transition-opacity group-hover:opacity-100"
      />
    </button>
  );
}
