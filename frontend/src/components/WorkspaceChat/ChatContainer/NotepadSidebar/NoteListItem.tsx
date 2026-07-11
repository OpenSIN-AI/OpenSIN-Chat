// SPDX-License-Identifier: MIT
// Purpose: Compact note list item — title, excerpt, date, pin indicator, context actions.
// Docs: Based on Issue #607 §12 NoteListItem spec.
import React from "react";
import {
  PushPin,
  Trash,
  ArrowCounterClockwise,
} from "@phosphor-icons/react/dist/csr";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/utils/cn";

type Note = {
  id: number;
  title: string;
  plainText: string;
  tags: string[];
  pinned: boolean;
  updatedAt: string;
  deletedAt?: string | null;
};

interface NoteListItemProps {
  note: Note;
  active: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
  onRestore?: () => void;
}

export function NoteListItem({
  note,
  active,
  onSelect,
  onPin,
  onDelete,
  onRestore,
}: NoteListItemProps) {
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
        "group flex min-w-0 cursor-pointer items-start gap-2 px-3 py-2.5 transition-colors",
        "hover:bg-theme-bg-tertiary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-text-secondary",
        active && "bg-theme-bg-tertiary",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {note.pinned && (
            <PushPin
              size={10}
              weight="fill"
              className="flex-shrink-0 text-theme-text-muted"
            />
          )}
          <span className="truncate text-sm font-medium text-theme-text-primary">
            {note.title || "Unbenannte Notiz"}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-theme-text-secondary">
          {note.plainText || "Noch kein Inhalt"}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[10px] text-theme-text-muted">
            {new Date(note.updatedAt).toLocaleDateString()}
          </span>
          {note.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded bg-theme-bg-secondary px-1 py-0.5 text-[9px] text-theme-text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {onRestore ? (
          <IconButton
            icon={<ArrowCounterClockwise size={12} />}
            label="Notiz wiederherstellen"
            onClick={(e) => {
              e.stopPropagation();
              onRestore();
            }}
            size="sm"
          />
        ) : (
          <IconButton
            icon={
              <PushPin size={12} weight={note.pinned ? "fill" : "regular"} />
            }
            label={note.pinned ? "Anheftung lösen" : "Notiz anheften"}
            pressed={note.pinned}
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            size="sm"
          />
        )}
        <IconButton
          icon={<Trash size={12} />}
          label={note.deletedAt ? "Notiz endgültig löschen" : "In Papierkorb"}
          variant={note.deletedAt ? "danger" : "ghost"}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          size="sm"
        />
      </div>
    </div>
  );
}
