// SPDX-License-Identifier: MIT
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckSquare,
  FadersHorizontal,
  Folder,
  Image,
  Link,
  MagnifyingGlass,
  Notepad,
  Plus,
  PushPin,
  ShareNetwork,
  Trash,
  X,
} from "@phosphor-icons/react";
import Note from "@/models/note";
import ChatSidebar, { useChatSidebar } from "../ChatSidebar";
import NoteEditor from "./NoteEditor";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type Filter = "all" | "pinned" | "todos" | "links" | "images" | "trash";
type Sort = "updated" | "created" | "alpha";

const parseTags = (value: unknown): string[] => {
  if (Array.isArray(value))
    return value.filter((tag) => typeof tag === "string");
  try {
    return JSON.parse(String(value || "[]"));
  } catch {
    return [];
  }
};

const legacyTitle = (note: any, fallback: string) =>
  note.title?.trim() ||
  note.plainText?.trim().split("\n")[0] ||
  (!String(note.content || "")
    .trim()
    .startsWith("{")
    ? String(note.content || "")
        .trim()
        .split("\n")[0]
    : "") ||
  fallback;

function NotepadSidebar({ workspace }: any) {
  const { t } = useTranslation();
  const { closeSidebar } = useChatSidebar();
  const slug = workspace?.slug;
  const [notes, setNotes] = useState<any[]>([]);
  const [sharedNotes, setSharedNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [activeSharedNote, setActiveSharedNote] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [mobileEditor, setMobileEditor] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const [metaOpen, setMetaOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    note: any;
    permanent: boolean;
  } | null>(null);
  const pendingRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emptyLabel = t("chat_window.empty_note", "Leere Notiz");

  const loadNotes = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    const [own, shared] = await Promise.all([
      Note.forWorkspace(slug, { trash: filter === "trash" }),
      filter === "trash" ? Promise.resolve([]) : Note.getSharedNotes(slug),
    ]);
    setNotes(own);
    setSharedNotes(shared);
    setActiveNote(
      (current: any) =>
        own.find((note: any) => note.id === current?.id) || own[0] || null,
    );
    setIsLoading(false);
  }, [filter, slug]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const observer = new ResizeObserver(([entry]) => {
      setIsCompact(entry.contentRect.width < 560);
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("note-search")?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  const save = useCallback(
    async (id: number, patch: any) => {
      if (!slug) return;
      setSaveState("saving");
      const updated = await Note.update(slug, id, patch);
      if (!updated) {
        setSaveState("error");
        return;
      }
      setNotes((current) =>
        current.map((note) =>
          note.id === id
            ? { ...note, ...patch, updatedAt: updated.updatedAt }
            : note,
        ),
      );
      setActiveNote((current: any) =>
        current?.id === id
          ? { ...current, ...patch, updatedAt: updated.updatedAt }
          : current,
      );
      setSaveState("saved");
    },
    [slug],
  );

  const queueSave = (patch: any) => {
    if (!activeNote) return;
    pendingRef.current = { ...(pendingRef.current || {}), ...patch };
    setActiveNote((current: any) => ({ ...current, ...patch }));
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      save(activeNote.id, pending);
    }, 900);
  };

  const flushSave = () => {
    if (!activeNote || !pendingRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const pending = pendingRef.current;
    pendingRef.current = null;
    save(activeNote.id, pending);
  };

  const createNote = async () => {
    if (!slug || isCreating) return;
    setIsCreating(true);
    const created = await Note.create(slug, {
      title: "",
      content: "",
      plainText: "",
      tags: [],
      pinned: false,
    });
    setIsCreating(false);
    if (!created) return;
    setNotes((current) => [created, ...current]);
    setActiveSharedNote(null);
    setActiveNote(created);
    setMobileEditor(true);
  };

  const selectNote = (note: any) => {
    flushSave();
    setActiveSharedNote(null);
    setActiveNote(note);
    setMobileEditor(true);
  };

  const removeNote = async (note: any) => {
    if (!slug) return;
    const permanent = filter === "trash";
    if (permanent) {
      setDeleteConfirm({ note, permanent: true });
      return;
    }
    if (await Note.delete(slug, note.id, false)) {
      const remaining = notes.filter((item) => item.id !== note.id);
      setNotes(remaining);
      setActiveNote(remaining[0] || null);
    }
  };

  const confirmDelete = async () => {
    if (!slug || !deleteConfirm) return;
    if (
      await Note.delete(slug, deleteConfirm.note.id, deleteConfirm.permanent)
    ) {
      const remaining = notes.filter(
        (item) => item.id !== deleteConfirm.note.id,
      );
      setNotes(remaining);
      setActiveNote(remaining[0] || null);
    }
    setDeleteConfirm(null);
  };

  const restoreNote = async (note: any) => {
    if (slug && (await Note.restore(slug, note.id))) {
      setNotes((current) => current.filter((item) => item.id !== note.id));
      setActiveNote(null);
    }
  };

  const filteredNotes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = notes.filter((note) => {
      const content =
        `${note.title || ""} ${note.plainText || ""} ${parseTags(note.tags).join(" ")}`.toLowerCase();
      if (needle && !content.includes(needle)) return false;
      if (filter === "pinned") return note.pinned;
      if (filter === "todos") return String(note.content).includes("taskList");
      if (filter === "links") return String(note.content).includes('"link"');
      if (filter === "images") return String(note.content).includes('"image"');
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === "alpha")
        return legacyTitle(a, emptyLabel).localeCompare(
          legacyTitle(b, emptyLabel),
        );
      return (
        new Date(sort === "created" ? b.createdAt : b.updatedAt).getTime() -
        new Date(sort === "created" ? a.createdAt : a.updatedAt).getTime()
      );
    });
  }, [emptyLabel, filter, notes, query, sort]);

  const visibleActive = activeNote || activeSharedNote;
  const words = String(visibleActive?.plainText || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <>
      <ChatSidebar isOpen={true} minWidth={380} defaultWidth={620}>
        <section
          ref={panelRef}
          className="flex h-full w-full flex-col overflow-hidden bg-theme-bg-sidebar"
          aria-label={t("chat_window.notepad", "Notizblock")}
        >
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-theme-modal-border px-3">
            <Notepad
              size={18}
              weight="fill"
              className="text-theme-text-secondary"
            />
            <h2 className="flex-1 text-sm font-semibold text-theme-text-primary">
              {t("chat_window.notepad", "Notizblock")}
            </h2>
            <span className="rounded-full bg-theme-bg-tertiary px-2 py-0.5 text-[10px] font-semibold text-theme-text-secondary">
              {notes.length}
            </span>
            <button
              type="button"
              onClick={createNote}
              disabled={isCreating}
              className="notepad-icon-button"
              aria-label={t("chat_window.new_note", "Neue Notiz")}
            >
              <Plus size={17} />
            </button>
            <button
              type="button"
              onClick={closeSidebar}
              className="notepad-icon-button"
              aria-label={t("common.close", "Schließen")}
            >
              <X size={17} />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <aside
              className={`${isCompact && mobileEditor ? "hidden" : "flex"} ${isCompact ? "w-full" : "w-52"} shrink-0 flex-col border-r border-theme-modal-border`}
            >
              <div className="flex flex-col gap-2 border-b border-theme-modal-border p-2">
                <label className="flex h-8 items-center gap-2 rounded-lg border border-theme-modal-border bg-theme-bg-primary px-2 text-theme-text-secondary focus-within:border-theme-text-secondary">
                  <MagnifyingGlass size={14} />
                  <input
                    id="note-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("notepad.search", "Notizen suchen")}
                    className="min-w-0 flex-1 bg-transparent text-xs text-theme-text-primary outline-none placeholder:text-theme-text-muted"
                  />
                  <kbd className={`text-[9px] text-theme-text-muted ${query ? "hidden" : ""}`}>⌘K</kbd>
                </label>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {(
                    [
                      "all",
                      "pinned",
                      "todos",
                      "links",
                      "images",
                      "trash",
                    ] as Filter[]
                  ).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      className={`notepad-filter ${filter === value ? "notepad-filter-active" : ""}`}
                      title={value}
                    >
                      {value === "all" && t("notepad.all", "Alle")}
                      {value === "pinned" && <PushPin size={13} />}
                      {value === "todos" && <CheckSquare size={13} />}
                      {value === "links" && <Link size={13} />}
                      {value === "images" && <Image size={13} />}
                      {value === "trash" && <Trash size={13} />}
                    </button>
                  ))}
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as Sort)}
                    aria-label={t("notepad.sort", "Sortieren")}
                    className="ml-auto h-7 rounded-md border border-theme-modal-border bg-theme-bg-primary px-1 text-[10px] text-theme-text-secondary outline-none"
                  >
                    <option value="updated">
                      {t("notepad.updated", "Bearbeitet")}
                    </option>
                    <option value="created">
                      {t("notepad.created", "Erstellt")}
                    </option>
                    <option value="alpha">A–Z</option>
                  </select>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
                {isLoading
                  ? [1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-16 animate-pulse rounded-lg bg-theme-bg-tertiary"
                      />
                    ))
                  : filteredNotes.map((note) => (
                      <article
                        key={note.id}
                        className={`group relative rounded-lg border ${activeNote?.id === note.id ? "border-theme-text-secondary bg-theme-bg-tertiary" : "border-transparent hover:bg-theme-bg-tertiary"}`}
                      >
                        <button
                          type="button"
                          onClick={() => selectNote(note)}
                          className="w-full bg-transparent px-3 py-2.5 pr-12 text-left"
                        >
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate text-xs font-semibold text-theme-text-primary">
                              {legacyTitle(note, emptyLabel)}
                            </h3>
                            {note.pinned && (
                              <PushPin
                                size={10}
                                weight="fill"
                                className="shrink-0 text-theme-text-secondary"
                              />
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-theme-text-secondary">
                            {note.plainText ||
                              t("notepad.noContent", "Noch kein Inhalt")}
                          </p>
                          <div className="mt-1.5 flex gap-1">
                            {parseTags(note.tags)
                              .slice(0, 2)
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-theme-bg-primary px-1.5 text-[9px] text-theme-text-secondary"
                                >
                                  #{tag}
                                </span>
                              ))}
                          </div>
                        </button>
                        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          {filter === "trash" ? (
                            <button
                              className="notepad-mini-button"
                              onClick={() => restoreNote(note)}
                              title={t("notepad.restore", "Wiederherstellen")}
                            >
                              <ArrowLeft size={12} />
                            </button>
                          ) : (
                            <button
                              className="notepad-mini-button"
                              onClick={() =>
                                save(note.id, { pinned: !note.pinned })
                              }
                              title={t("notepad.pin", "Anheften")}
                            >
                              <PushPin size={12} />
                            </button>
                          )}
                          <button
                            className="notepad-mini-button hover:text-red-400"
                            onClick={() => removeNote(note)}
                            title={t("common.delete", "Löschen")}
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      </article>
                    ))}
                {!isLoading && filteredNotes.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-xs text-theme-text-secondary">
                    <Notepad size={24} />
                    <p>
                      {query
                        ? t("notepad.noResults", "Keine Treffer")
                        : t("chat_window.no_notes", "Noch keine Notizen")}
                    </p>
                    <button
                      onClick={createNote}
                      className="rounded-lg bg-theme-text-primary px-3 py-1.5 font-medium text-theme-bg-primary"
                    >
                      {t("chat_window.new_note", "Neue Notiz")}
                    </button>
                  </div>
                )}
                {sharedNotes.length > 0 && (
                  <>
                    <p className="px-2 pt-3 text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
                      {t("chat_window.shared_notes", "Geteilte Notizen")}
                    </p>
                    {sharedNotes.map((note) => (
                      <button
                        key={`shared-${note.id}`}
                        onClick={() => {
                          flushSave();
                          setActiveNote(null);
                          setActiveSharedNote(note);
                          setMobileEditor(true);
                        }}
                        className="rounded-lg px-3 py-2 text-left hover:bg-theme-bg-tertiary"
                      >
                        <span className="flex items-center gap-1.5 text-xs font-medium text-theme-text-primary">
                          <ShareNetwork size={12} />
                          {legacyTitle(note, emptyLabel)}
                        </span>
                        <span className="mt-1 block truncate text-[10px] text-theme-text-secondary">
                          {note.source_workspace_name}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </aside>

            <main
              className={`${isCompact && !mobileEditor ? "hidden" : "flex"} min-w-0 flex-1 flex-col bg-theme-bg-primary`}
            >
              {visibleActive ? (
                <>
                  <div className="flex shrink-0 items-start gap-2 border-b border-theme-modal-border px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setMobileEditor(false)}
                      className={`notepad-icon-button ${isCompact ? "inline-flex" : "hidden"}`}
                      aria-label={t("common.back", "Zurück")}
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <input
                        value={visibleActive.title || ""}
                        readOnly={Boolean(activeSharedNote)}
                        onChange={(event) =>
                          queueSave({ title: event.target.value })
                        }
                        onBlur={flushSave}
                        placeholder={t("notepad.untitled", "Unbenannte Notiz")}
                        className="w-full bg-transparent text-base font-semibold text-theme-text-primary outline-none placeholder:text-theme-text-muted"
                      />
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-theme-text-muted">
                        <span>
                          {saveState === "saving"
                            ? t("chat_window.saving", "Speichern…")
                            : saveState === "error"
                              ? t("notepad.saveError", "Speicherfehler")
                              : t("notepad.saved", "Gespeichert")}
                        </span>
                        <span>·</span>
                        <span>
                          {words} {t("chat_window.words", "Wörter")}
                        </span>
                        {visibleActive.folder && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Folder size={11} />
                              {visibleActive.folder}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {!activeSharedNote && (
                      <button
                        type="button"
                        onClick={() => setMetaOpen((value) => !value)}
                        className="notepad-icon-button"
                        aria-label={t("notepad.details", "Details")}
                      >
                        <FadersHorizontal size={16} />
                      </button>
                    )}
                  </div>
                  {metaOpen && !activeSharedNote && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-theme-modal-border bg-theme-bg-secondary px-4 py-2">
                      <input
                        value={activeNote.folder || ""}
                        onChange={(event) =>
                          queueSave({ folder: event.target.value || null })
                        }
                        onBlur={flushSave}
                        placeholder={t("notepad.folder", "Ordner")}
                        className="notepad-meta-input"
                      />
                      <input
                        value={parseTags(activeNote.tags).join(", ")}
                        onChange={(event) =>
                          queueSave({
                            tags: event.target.value
                              .split(",")
                              .map((tag) => tag.trim())
                              .filter(Boolean)
                              .slice(0, 30),
                          })
                        }
                        onBlur={flushSave}
                        placeholder={t("notepad.tags", "Tags, kommagetrennt")}
                        className="notepad-meta-input flex-1"
                      />
                    </div>
                  )}
                  <NoteEditor
                    key={`${activeNote ? "own" : "shared"}-${visibleActive.id}`}
                    content={visibleActive.content || ""}
                    editable={!activeSharedNote && filter !== "trash"}
                    placeholder={t(
                      "chat_window.note_placeholder",
                      "Schreiben oder ‘/’ für Befehle…",
                    )}
                    onChange={({ content, plainText }) =>
                      queueSave({ content, plainText })
                    }
                  />
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-theme-text-secondary">
                  <Notepad size={32} weight="duotone" />
                  <p className="text-sm">
                    {t(
                      "chat_window.select_or_create_note",
                      "Notiz auswählen oder erstellen",
                    )}
                  </p>
                  <button
                    onClick={createNote}
                    className="rounded-lg bg-theme-text-primary px-3 py-2 text-xs font-semibold text-theme-bg-primary"
                  >
                    {t("chat_window.new_note", "Neue Notiz")}
                  </button>
                </div>
              )}
            </main>
          </div>
        </section>
      </ChatSidebar>
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        onConfirm={confirmDelete}
        title={t("notepad.deleteForeverConfirm", "Notiz endgültig löschen?")}
        description={t(
          "notepad.deleteForeverDescription",
          "Diese Aktion kann nicht rückgängig gemacht werden.",
        )}
        confirmLabel={t("common.delete", "Löschen")}
        destructive
      />
    </>
  );
}

export default memo(NotepadSidebar);
