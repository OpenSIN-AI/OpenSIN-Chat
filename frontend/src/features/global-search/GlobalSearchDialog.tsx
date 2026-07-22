// SPDX-License-Identifier: MIT

import { useEffect, useRef, useState } from "react";
import { ClockCounterClockwise } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useNavigate } from "react-router";
import ModalWrapper from "@/components/ModalWrapper";
import { SEARCH_FILTERS } from "./filters";
import {
  clearRecentSearches,
  readRecentSearches,
  rememberSearch,
} from "./recent-searches";
import { navigateToSearchResult } from "./navigation";
import SearchResultRow from "./SearchResultRow";
import useGlobalSearch from "./useGlobalSearch";

export default function GlobalSearchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeFilterId, setActiveFilterId] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  const activeFilter =
    SEARCH_FILTERS.find((filter) => filter.id === activeFilterId) ||
    SEARCH_FILTERS[0];

  const { results, loading, error } = useGlobalSearch({
    query,
    types: activeFilter.types,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setRecent(readRecentSearches());
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, activeFilterId]);

  const selectableCount = results.length;

  function selectResult(index: number) {
    const result = results[index];
    if (!result) return;
    rememberSearch(query);
    navigateToSearchResult({ result, navigate });
    onClose();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(current + 1, Math.max(selectableCount - 1, 0)),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && results.length) {
      event.preventDefault();
      selectResult(activeIndex);
    }
  }

  const showRecent = query.trim().length < 2;

  return (
    <ModalWrapper isOpen={open} closeModal={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="OpenSIN durchsuchen"
        onKeyDown={handleKeyDown}
        className="flex max-h-[min(720px,calc(100vh-32px))] w-[min(720px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-theme-border bg-theme-bg-primary shadow-2xl"
      >
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-theme-border px-4">
          <MagnifyingGlass
            size={18}
            className="shrink-0 text-theme-text-muted"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="In OpenSIN suchen …"
            aria-label="Suche"
            className="min-w-0 flex-1 border-none bg-transparent text-base text-theme-text-primary outline-none placeholder:text-theme-text-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Suche löschen"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-theme-text-muted hover:bg-theme-bg-secondary hover:text-theme-text-primary"
            >
              <X size={15} />
            </button>
          )}
          <kbd className="hidden rounded-md border border-theme-border bg-theme-bg-secondary px-1.5 py-0.5 text-[10px] text-theme-text-muted sm:block">
            Esc
          </kbd>
        </header>

        <nav className="no-scroll flex shrink-0 gap-1 overflow-x-auto border-b border-theme-border px-3 py-2">
          {SEARCH_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilterId(filter.id)}
              className={[
                "h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors",
                activeFilterId === filter.id
                  ? "bg-theme-bg-secondary text-theme-text-primary"
                  : "text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary",
              ].join(" ")}
            >
              {filter.label}
            </button>
          ))}
        </nav>

        <div
          role="listbox"
          className="min-h-0 flex-1 overflow-y-auto p-2"
        >
          {showRecent ? (
            recent.length ? (
              <section>
                <div className="mb-1 flex items-center justify-between px-2 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
                    Letzte Suchen
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      clearRecentSearches();
                      setRecent([]);
                    }}
                    className="text-[10px] text-theme-text-muted hover:text-theme-text-primary"
                  >
                    Löschen
                  </button>
                </div>
                {recent.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuery(item)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-theme-bg-secondary"
                  >
                    <ClockCounterClockwise
                      size={16}
                      className="text-theme-text-muted"
                    />
                    <span className="truncate text-sm text-theme-text-secondary">
                      {item}
                    </span>
                  </button>
                ))}
              </section>
            ) : (
              <div className="flex h-52 flex-col items-center justify-center text-center">
                <MagnifyingGlass
                  size={24}
                  className="text-theme-text-muted"
                />
                <p className="mt-3 text-sm font-medium text-theme-text-primary">
                  Alles durchsuchen
                </p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-theme-text-secondary">
                  Finde Notebooks, Chats, Nachrichten, Quellen, Notizen und
                  Ergebnisse.
                </p>
              </div>
            )
          ) : loading && results.length === 0 ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl bg-theme-bg-secondary"
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex h-52 items-center justify-center px-6 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-theme-text-primary">
                Keine Ergebnisse
              </p>
              <p className="mt-1 text-xs text-theme-text-secondary">
                Versuche einen anderen Suchbegriff oder Filter.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {results.map((result, index) => (
                <SearchResultRow
                  key={`${result.type}:${result.id}`}
                  result={result}
                  query={query}
                  active={index === activeIndex}
                  onSelect={() => selectResult(index)}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="hidden h-10 shrink-0 items-center gap-4 border-t border-theme-border px-4 text-[10px] text-theme-text-muted sm:flex">
          <span>↑↓ auswählen</span>
          <span>↵ öffnen</span>
          <span>Esc schließen</span>
        </footer>
      </div>
    </ModalWrapper>
  );
}
