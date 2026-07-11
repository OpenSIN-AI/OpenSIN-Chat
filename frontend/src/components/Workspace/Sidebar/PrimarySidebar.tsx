// SPDX-License-Identifier: MIT
// Purpose: Compact, searchable left sidebar — workspace switcher, new chat, search, pinned/recent conversations.
// Docs: Based on Issue #607 §9 PrimarySidebar spec + Issue #3.
import React, { useState } from "react";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { PushPin } from "@phosphor-icons/react/dist/csr/PushPin";
import { ChatCircle } from "@phosphor-icons/react/dist/csr/ChatCircle";
import { SidebarSimple } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { GearSix } from "@phosphor-icons/react/dist/csr/GearSix";
import { cn } from "@/utils/cn";

interface Conversation {
  id: string;
  title: string;
  pinned?: boolean;
  updatedAt?: string;
}

interface PrimarySidebarProps {
  workspaceSlug?: string;
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onOpenSearch: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function PrimarySidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onOpenSearch,
  collapsed = false,
  onToggleCollapse,
  className,
}: PrimarySidebarProps) {
  const [query, setQuery] = useState("");

  const pinned = conversations.filter((c) => c.pinned);
  const recent = conversations
    .filter((c) => !c.pinned)
    .sort((a, b) => {
      if (!a.updatedAt || !b.updatedAt) return 0;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const filteredPinned = query
    ? pinned.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    : pinned;

  const filteredRecent = query
    ? recent.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    : recent;

  if (collapsed) {
    return (
      <aside
        aria-label="Hauptnavigation (eingeklappt)"
        className={cn(
          "flex h-full w-12 flex-shrink-0 flex-col items-center gap-1 border-r border-theme-border bg-theme-bg-sidebar py-3",
          className,
        )}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Navigation öffnen"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
        >
          <SidebarSimple size={18} />
        </button>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Neue Unterhaltung"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Suche (⌘K)"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
        >
          <MagnifyingGlass size={18} />
        </button>
        <div className="my-1 h-px w-5 bg-theme-border" aria-hidden="true" />
        {filteredPinned.slice(0, 5).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectConversation(c.id)}
            aria-label={c.title}
            data-tooltip-id={`sidebar-pin-${c.id}`}
            data-tooltip-content={c.title}
            className={cn(
              "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary",
              activeConversationId === c.id
                ? "bg-theme-bg-hover text-theme-text-primary"
                : "text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary",
            )}
          >
            <PushPin size={16} weight="fill" />
          </button>
        ))}
      </aside>
    );
  }

  return (
    <aside
      aria-label="Hauptnavigation"
      className={cn(
        "flex h-full w-64 flex-shrink-0 flex-col border-r border-theme-border bg-theme-bg-sidebar",
        className,
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-8 items-center gap-2 rounded-lg border border-theme-border bg-theme-bg-secondary px-3 text-xs font-medium text-theme-text-primary transition-colors hover:bg-theme-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
        >
          <Plus size={14} />
          Neue Unterhaltung
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Navigation einklappen"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
        >
          <SidebarSimple size={18} />
        </button>
      </div>

      {/* Search trigger */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-8 w-full items-center gap-2 rounded-lg border border-theme-border bg-theme-bg-secondary px-3 text-xs text-theme-text-muted transition-colors hover:bg-theme-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
        >
          <MagnifyingGlass size={14} />
          Suchen...
          <kbd className="ml-auto rounded border border-theme-border bg-theme-bg-tertiary px-1 py-0.5 text-[9px] text-theme-text-muted">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Conversation list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {filteredPinned.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
              <PushPin size={10} />
              Angeheftet
            </div>
            {filteredPinned.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={activeConversationId === c.id}
                onSelect={() => onSelectConversation(c.id)}
              />
            ))}
          </div>
        )}

        <div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
            Zuletzt verwendet
          </div>
          {filteredRecent.length === 0 && filteredPinned.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-theme-text-muted">
              Noch keine Unterhaltungen
            </p>
          )}
          {filteredRecent.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              active={activeConversationId === c.id}
              onSelect={() => onSelectConversation(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-theme-border px-3 py-2">
        <button
          type="button"
          aria-label="Einstellungen"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
        >
          <GearSix size={16} />
        </button>
      </div>
    </aside>
  );
}

function ConversationItem({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      role="link"
      tabIndex={0}
      aria-current={active ? "page" : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        "text-sm text-theme-text-secondary",
        "hover:bg-theme-bg-tertiary hover:text-theme-text-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary",
        active && "bg-theme-bg-tertiary text-theme-text-primary",
      )}
    >
      <ChatCircle size={16} className="flex-shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
    </div>
  );
}
