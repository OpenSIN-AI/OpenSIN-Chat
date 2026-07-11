// SPDX-License-Identifier: MIT
// Purpose: Command palette — Cmd+K global search with grouped results, keyboard navigation, and accessible semantics.
// Docs: Based on Issue #607 §13 CommandPalette spec + Issue #8.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { File } from "@phosphor-icons/react/dist/csr/File";
import { Notebook } from "@phosphor-icons/react/dist/csr/Notebook";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { cn } from "@/utils/cn";

export type CommandItem = {
  id: string;
  group: "Navigation" | "Unterhaltungen" | "Notizen" | "Dateien" | "Aktionen";
  label: string;
  description?: string;
  keywords?: string[];
  shortcut?: string;
  icon?: React.ReactNode;
  perform: () => void | Promise<void>;
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
}

export function CommandPalette({
  open,
  onOpenChange,
  items,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return items;
    return items.filter((item) => {
      const searchable = [
        item.label,
        item.description ?? "",
        ...(item.keywords ?? []),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return searchable.includes(normalized);
    });
  }, [items, query]);

  const groups = useMemo(() => {
    const grouped = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const current = grouped.get(item.group) ?? [];
      current.push(item);
      grouped.set(item.group, current);
    }
    return grouped;
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [open]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [open, onOpenChange]);

  if (!open) return null;

  async function execute(item: CommandItem) {
    onOpenChange(false);
    await item.perform();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/20 px-3 pt-[12vh] max-[600px]:items-stretch max-[600px]:pt-3"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-label="Suche und Befehle"
        className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-bg-sidebar shadow-2xl max-[600px]:h-full"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-theme-border px-4 py-3">
          <MagnifyingGlass
            size={18}
            className="flex-shrink-0 text-theme-text-muted"
          />
          <input
            ref={inputRef}
            value={query}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={
              filtered[activeIndex]
                ? `command-${filtered[activeIndex].id}`
                : undefined
            }
            placeholder="Suchen oder Befehl eingeben"
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229)
                return;
              if (event.key === "Escape") {
                event.preventDefault();
                onOpenChange(false);
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) =>
                  Math.min(current + 1, filtered.length - 1),
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) => Math.max(current - 1, 0));
              }
              if (event.key === "Enter" && filtered[activeIndex]) {
                event.preventDefault();
                void execute(filtered[activeIndex]);
              }
            }}
            className="min-w-0 flex-1 border-none bg-transparent text-sm text-theme-text-primary outline-none placeholder:text-theme-text-muted"
          />
          <kbd className="flex-shrink-0 rounded border border-theme-border bg-theme-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-theme-text-muted">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div
          id="command-results"
          role="listbox"
          className="max-h-[360px] overflow-y-auto p-2"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <p className="text-sm font-medium text-theme-text-primary">
                Keine Treffer
              </p>
              <p className="mt-1 text-xs text-theme-text-secondary">
                Versuche einen anderen Suchbegriff.
              </p>
            </div>
          ) : (
            Array.from(groups.entries()).map(([group, groupItems]) => (
              <div key={group} className="mb-2">
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
                  {group}
                </div>
                <div role="group" aria-label={group}>
                  {groupItems.map((item) => {
                    const index = filtered.findIndex(
                      (candidate) => candidate.id === item.id,
                    );
                    const active = index === activeIndex;
                    return (
                      <button
                        key={item.id}
                        id={`command-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => void execute(item)}
                        className={cn(
                          "flex min-w-0 w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                          active
                            ? "bg-theme-bg-tertiary text-theme-text-primary"
                            : "text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary",
                        )}
                      >
                        <span className="flex-shrink-0 text-theme-text-muted">
                          {item.icon ?? <File size={16} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {item.label}
                          </span>
                          {item.description && (
                            <span className="block truncate text-xs text-theme-text-secondary">
                              {item.description}
                            </span>
                          )}
                        </span>
                        {item.shortcut && (
                          <kbd className="flex-shrink-0 rounded border border-theme-border bg-theme-bg-secondary px-1.5 py-0.5 text-[10px] text-theme-text-muted">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-theme-border px-4 py-2 text-[10px] text-theme-text-muted">
          <span>
            <kbd className="mr-1">↑↓</kbd>Navigieren
          </span>
          <span>
            <kbd className="mr-1">↵</kbd>Öffnen
          </span>
          <span>
            <kbd className="mr-1">Esc</kbd>Schließen
          </span>
        </div>
      </div>
    </div>
  );
}

export const defaultWorkspaceCommands: CommandItem[] = [
  {
    id: "new-conversation",
    group: "Aktionen",
    label: "Neue Unterhaltung",
    description: "Eine leere Unterhaltung beginnen",
    keywords: ["chat", "new"],
    shortcut: "⌘N",
    icon: <Plus size={16} />,
    perform: () => {},
  },
  {
    id: "open-notes",
    group: "Navigation",
    label: "Notizen öffnen",
    description: "Notizbibliothek und Editor anzeigen",
    keywords: ["notes", "notepad"],
    icon: <Notebook size={16} />,
    perform: () => {},
  },
  {
    id: "open-files",
    group: "Navigation",
    label: "Dateien öffnen",
    description: "Workspace-Dateien anzeigen",
    keywords: ["files", "documents"],
    icon: <File size={16} />,
    perform: () => {},
  },
];
