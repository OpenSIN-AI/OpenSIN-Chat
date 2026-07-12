// SPDX-License-Identifier: MIT
// Purpose: Notepad workspace — library (search, filters, list) + editor pane, responsive (list OR editor on narrow viewports).
// Docs: Based on Issue #607 §12 NotepadWorkspace spec + Issue #6.
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { UtilityPanel } from "@/components/ui/UtilityPanel";
import { NoteListItem } from "./NoteListItem";

type Note = {
  id: number;
  title: string;
  plainText: string;
  content: string;
  tags: string[];
  folder: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

type NoteFilter = "all" | "pinned" | "tasks" | "links" | "images" | "trash";
type NoteSort = "updated" | "created" | "alphabetical";

interface NotepadWorkspaceProps {
  notes: Note[];
  loading: boolean;
  onCreate: () => Promise<Note>;
  onUpdate: (id: number, update: Partial<Note>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRestore: (id: number) => Promise<void>;
  onClose?: () => void;
  renderEditor: (
    note: Note,
    onUpdate: (update: Partial<Note>) => Promise<void>,
  ) => React.ReactNode;
}

export function NotepadWorkspace({
  notes,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRestore,
  onClose,
  renderEditor,
}: NotepadWorkspaceProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NoteFilter>("all");
  const [sort, setSort] = useState<NoteSort>("updated");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = notes.filter((note) => {
      const deleted = Boolean(note.deletedAt);
      if (filter === "trash" && !deleted) return false;
      if (filter !== "trash" && deleted) return false;
      if (filter === "pinned" && !note.pinned) return false;
      if (filter === "tasks" && !note.content.includes("taskItem"))
        return false;
      if (filter === "links" && !note.content.includes("http")) return false;
      if (filter === "images" && !note.content.includes('"image"'))
        return false;
      if (!q) return true;
      return [
        note.title,
        note.plainText,
        note.folder ?? "",
        note.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (sort === "alphabetical") return a.title.localeCompare(b.title);
      const first = sort === "created" ? a.createdAt : a.updatedAt;
      const second = sort === "created" ? b.createdAt : b.updatedAt;
      return new Date(second).getTime() - new Date(first).getTime();
    });
  }, [notes, query, filter, sort]);

  async function createNote() {
    const note = await onCreate();
    setSelectedId(note.id);
  }

  // On narrow viewports, show either list or editor
  const showEditorOnly =
    selectedNote && typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <UtilityPanel
      title="Notizblock"
      count={notes.length}
      onClose={onClose}
      actions={
        <IconButton
          icon={<Plus size={16} />}
          label="Neue Notiz"
          onClick={() => void createNote()}
          size="sm"
        />
      }
    >
      {showEditorOnly ? (
        <div className="flex h-full flex-col">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-2 border-b border-theme-border px-3 py-2 text-xs text-theme-text-secondary hover:bg-theme-bg-tertiary"
          >
            <ArrowLeft size={14} />
            Zur Notizliste
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {renderEditor(selectedNote, (u) => onUpdate(selectedNote.id, u))}
          </div>
        </div>
      ) : (
        <div className="flex h-full">
          {/* Note list */}
          <div className="flex h-full w-full flex-col border-r border-theme-border md:w-64">
            {/* Filters */}
            <div className="flex items-center gap-1 border-b border-theme-border px-2 py-2">
              <NoteFilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                Alle
              </NoteFilterButton>
              <NoteFilterButton
                active={filter === "pinned"}
                onClick={() => setFilter("pinned")}
              >
                Angeheftet
              </NoteFilterButton>
              <NoteFilterButton
                active={filter === "trash"}
                onClick={() => setFilter("trash")}
              >
                <Trash size={12} />
              </NoteFilterButton>
            </div>

            {/* Search */}
            <div className="px-2 py-2">
              <SearchInput
                placeholder="Notizen suchen..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onClear={() => setQuery("")}
              />
            </div>

            {/* List */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <LoadingState label="Notizen werden geladen" rows={4} />
              ) : filteredNotes.length === 0 ? (
                <EmptyState
                  compact
                  title={
                    query
                      ? "Keine Treffer"
                      : filter === "trash"
                        ? "Papierkorb ist leer"
                        : "Noch keine Notizen"
                  }
                  description={
                    query ? `Keine Notiz passt zu „${query}".` : undefined
                  }
                  action={
                    !query && filter !== "trash" ? (
                      <Button size="sm" onClick={() => void createNote()}>
                        Notiz erstellen
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                filteredNotes.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    active={selectedId === note.id}
                    onSelect={() => setSelectedId(note.id)}
                    onPin={() =>
                      void onUpdate(note.id, { pinned: !note.pinned })
                    }
                    onDelete={() => void onDelete(note.id)}
                    onRestore={
                      note.deletedAt ? () => void onRestore(note.id) : undefined
                    }
                  />
                ))
              )}
            </div>
          </div>

          {/* Editor pane — hidden on narrow viewports */}
          <div className="hidden min-h-0 flex-1 md:block">
            {selectedNote ? (
              <div className="h-full overflow-y-auto">
                {renderEditor(selectedNote, (u) =>
                  onUpdate(selectedNote.id, u),
                )}
              </div>
            ) : (
              <EmptyState
                title={t("notepad.selectNote")}
                description={t("notepad.selectNoteDescription")}
                action={
                  <Button onClick={() => void createNote()}>
                    {t("notepad.newNote")}
                  </Button>
                }
              />
            )}
          </div>
        </div>
      )}
    </UtilityPanel>
  );
}

function NoteFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(active ? "notepad-filter-active" : "", "notepad-filter")}
    >
      {children}
    </button>
  );
}
