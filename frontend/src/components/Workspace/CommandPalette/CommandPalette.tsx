// SPDX-License-Identifier: MIT
// Purpose: Global command hub with grouped live results and keyboard-first navigation.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { File } from "@phosphor-icons/react/dist/csr/File";
import { cn } from "@/utils/cn";

export type CommandGroup =
  | "recent"
  | "quickActions"
  | "workspaces"
  | "navigation";

export type CommandItem = {
  id: string;
  group: CommandGroup;
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

const GROUP_ORDER: CommandGroup[] = [
  "recent",
  "quickActions",
  "workspaces",
  "navigation",
];

export function CommandPalette({
  open,
  onOpenChange,
  items,
}: CommandPaletteProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return items;
    return items.filter((item) =>
      [item.label, item.description ?? "", ...(item.keywords ?? [])]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized),
    );
  }, [items, query]);

  const groups = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        items: filtered.filter((item) => item.group === group),
      })).filter((entry) => entry.items.length > 0),
    [filtered],
  );

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement;
    setQuery("");
    setActiveIndex(0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [open]);

  useEffect(() => {
    if (filtered.length === 0) return;
    setActiveIndex((current) => Math.min(current, filtered.length - 1));
  }, [filtered.length]);

  useEffect(() => {
    const active = filtered[activeIndex];
    if (active) itemRefs.current.get(active.id)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, filtered]);

  if (!open) return null;

  async function execute(item: CommandItem) {
    onOpenChange(false);
    await item.perform();
  }

  function close() {
    onOpenChange(false);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-theme-overlay px-3 pt-[10vh] backdrop-blur-[2px] max-[600px]:items-stretch max-[600px]:p-0"
      role="presentation"
      onMouseDown={(event) => event.currentTarget === event.target && close()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-hub-title"
        className="flex max-h-[min(620px,80vh)] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-theme-modal-border bg-theme-bg-sidebar shadow-2xl max-[600px]:mt-14 max-[600px]:max-h-none max-[600px]:rounded-none max-[600px]:border-x-0"
      >
        <h2 id="command-hub-title" className="sr-only">
          {t("commandHub.title")}
        </h2>
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-theme-modal-border px-4">
          <MagnifyingGlass size={19} className="shrink-0 text-theme-text-muted" />
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
            placeholder={t("commandHub.placeholder")}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) return;
              if (event.key === "Escape") {
                event.preventDefault();
                close();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((current) =>
                  filtered.length ? (current + 1) % filtered.length : 0,
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((current) =>
                  filtered.length
                    ? (current - 1 + filtered.length) % filtered.length
                    : 0,
                );
              } else if (event.key === "Tab") {
                event.preventDefault();
                setActiveIndex((current) =>
                  filtered.length
                    ? (current + (event.shiftKey ? -1 : 1) + filtered.length) %
                      filtered.length
                    : 0,
                );
              } else if (event.key === "Enter" && filtered[activeIndex]) {
                event.preventDefault();
                void execute(filtered[activeIndex]);
              }
            }}
            className="min-w-0 flex-1 border-none bg-transparent text-sm text-theme-text-primary outline-none placeholder:text-theme-text-muted"
          />
          <kbd className="shrink-0 rounded-md border border-theme-modal-border bg-theme-bg-tertiary px-2 py-1 text-[10px] font-medium text-theme-text-muted">
            Esc
          </kbd>
        </div>

        <div
          id="command-results"
          role="listbox"
          className="no-scroll min-h-0 flex-1 overflow-y-auto p-2"
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-12 text-center">
              <MagnifyingGlass size={22} className="text-theme-text-muted" />
              <p className="text-sm font-medium text-theme-text-primary">
                {t("commandHub.emptyTitle")}
              </p>
              <p className="text-xs text-theme-text-secondary">
                {t("commandHub.emptyDescription")}
              </p>
            </div>
          ) : (
            groups.map(({ group, items: groupItems }) => (
              <div key={group} className="flex flex-col gap-0.5 pb-2 last:pb-0">
                <div className="px-2 pb-1 pt-2 text-[11px] font-medium text-theme-text-muted">
                  {t(`commandHub.groups.${group}`)}
                </div>
                <div role="group" aria-label={t(`commandHub.groups.${group}`)}>
                  {groupItems.map((item) => {
                    const index = filtered.findIndex(
                      (candidate) => candidate.id === item.id,
                    );
                    const active = index === activeIndex;
                    return (
                      <button
                        ref={(node) => {
                          if (node) itemRefs.current.set(item.id, node);
                          else itemRefs.current.delete(item.id);
                        }}
                        key={item.id}
                        id={`command-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => void execute(item)}
                        className={cn(
                          "flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary",
                          active
                            ? "bg-theme-bg-hover text-theme-text-primary"
                            : "text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary",
                        )}
                      >
                        <span className="shrink-0 text-theme-text-muted">
                          {item.icon ?? <File size={17} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {item.label}
                          </span>
                          {item.description && (
                            <span className="block truncate text-xs text-theme-text-muted">
                              {item.description}
                            </span>
                          )}
                        </span>
                        {item.shortcut && (
                          <kbd className="shrink-0 rounded-md border border-theme-modal-border bg-theme-bg-secondary px-1.5 py-0.5 text-[10px] text-theme-text-muted">
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

        <footer className="flex shrink-0 items-center gap-4 border-t border-theme-modal-border px-4 py-2 text-[10px] text-theme-text-muted max-[420px]:hidden">
          <span><kbd className="mr-1">↑↓</kbd>{t("commandHub.footer.navigate")}</span>
          <span><kbd className="mr-1">↵</kbd>{t("commandHub.footer.open")}</span>
          <span className="ml-auto"><kbd className="mr-1">Esc</kbd>{t("commandHub.footer.close")}</span>
        </footer>
      </section>
    </div>
  );
}
