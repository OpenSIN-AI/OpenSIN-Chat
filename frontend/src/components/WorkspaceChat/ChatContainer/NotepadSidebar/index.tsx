// SPDX-License-Identifier: MIT
import { memo, useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { PushPin } from "@phosphor-icons/react/dist/csr/PushPin";
import { ShareNetwork } from "@phosphor-icons/react/dist/csr/ShareNetwork";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { Notepad } from "@phosphor-icons/react/dist/csr/Notepad";
import Note from "@/models/note";
import ChatSidebar, { useChatSidebar } from "../ChatSidebar";

function notePreview(content: string, fallback: string) {
  const line = (content || "").trim().split("\n")[0]?.trim();
  if (!line) return fallback;
  return line.length > 42 ? `${line.slice(0, 42)}…` : line;
}

function NotepadSidebar({ workspace }: any) {
  const { t } = useTranslation();
  const { closeSidebar } = useChatSidebar();
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const saveTimerRef = useRef<any>(null);
  const slug = workspace?.slug;

  const [sharedNotes, setSharedNotes] = useState<any[]>([]);
  const [shareableWorkspaces, setShareableWorkspaces] = useState<any[]>([]);
  const [sharingNoteId, setSharingNoteId] = useState<any>(null);
  const [activeSharedNote, setActiveSharedNote] = useState<any>(null);
  const shareDropdownRef = useRef<any>(null);

  const emptyNoteLabel = t("chat_window.empty_note", "Leere Notiz");

  const loadNotes = useCallback(async () => {
    if (!slug) return;
    setLoadError(null);
    try {
      const [result, shared, workspaces] = await Promise.all([
        Note.forWorkspace(slug),
        Note.getSharedNotes(slug),
        Note.getShareableWorkspaces(slug),
      ]);
      setNotes(result);
      setSharedNotes(shared);
      setShareableWorkspaces(workspaces);
      setActiveNote((current: any) => {
        if (current || result.length === 0) return current;
        setContent(result[0].content || "");
        return result[0];
      });
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : t("common.loadError", "Fehler beim Laden"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      if (
        shareDropdownRef.current &&
        !shareDropdownRef.current.contains(e.target)
      ) {
        setSharingNoteId(null);
      }
    };
    if (sharingNoteId !== null) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [sharingNoteId]);

  const handleNewNote = async () => {
    if (!slug || isCreating) return;
    setIsCreating(true);
    setLoadError(null);
    try {
      const note = await Note.create(slug, { content: "" });
      if (!note) {
        setLoadError(
          t("chat_window.create_note_failed", "Notiz konnte nicht erstellt werden."),
        );
        return;
      }
      setNotes((prev) => [note, ...prev]);
      setActiveSharedNote(null);
      setActiveNote(note);
      setContent("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectNote = (note: any) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (activeNote && activeNote.id !== note.id) {
      saveNote(activeNote.id, content);
    }
    setActiveSharedNote(null);
    setActiveNote(note);
    setContent(note.content || "");
  };

  const saveNote = useCallback(
    async (id: any, text: string) => {
      if (!slug) return;
      setIsSaving(true);
      const updated = await Note.update(slug, id, { content: text });
      if (updated) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id
              ? { ...n, content: text, updatedAt: updated.updatedAt }
              : n,
          ),
        );
      }
      setIsSaving(false);
    },
    [slug],
  );

  const handleContentChange = (e: any) => {
    const text = e.target.value;
    setContent(text);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (activeNote) saveNote(activeNote.id, text);
    }, 1500);
  };

  const handleDeleteNote = async (noteId: any) => {
    if (!slug) return;
    const success = await Note.delete(slug, noteId);
    if (success) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (activeNote?.id === noteId) {
        const remaining = notes.filter((n) => n.id !== noteId);
        setActiveNote(remaining[0] || null);
        setContent(remaining[0]?.content || "");
      }
    }
  };

  const handleTogglePin = async (noteId: any, currentPinned: any) => {
    if (!slug) return;
    const updated = await Note.update(slug, noteId, { pinned: !currentPinned });
    if (updated) {
      setNotes((prev) => {
        const updatedNotes = prev.map((n) =>
          n.id === noteId ? { ...n, pinned: !currentPinned } : n,
        );
        return updatedNotes.sort(
          (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0),
        );
      });
      if (activeNote?.id === noteId) {
        setActiveNote((prev: any) =>
          prev ? { ...prev, pinned: !currentPinned } : prev,
        );
      }
    }
  };

  const handleShareClick = (e: any, noteId: any) => {
    e.stopPropagation();
    setSharingNoteId(sharingNoteId === noteId ? null : noteId);
  };

  const handleShareToWorkspace = async (noteId: any, targetSlug: string) => {
    if (!slug) return;
    const result = await Note.shareNote(slug, noteId, targetSlug);
    if (result) {
      setSharingNoteId(null);
    }
  };

  const handleSelectSharedNote = (note: any) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (activeNote) {
      saveNote(activeNote.id, content);
    }
    setActiveNote(null);
    setActiveSharedNote(note);
    setContent(note.content || "");
  };

  const handleUnshareNote = async (e: any, noteId: any, sourceSlug: string) => {
    e.stopPropagation();
    if (!slug) return;
    const success = await Note.unshareNote(slug, noteId, sourceSlug);
    if (success) {
      setSharedNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (activeSharedNote?.id === noteId) {
        setActiveSharedNote(null);
        setContent("");
      }
    }
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const hasNotes = notes.length > 0 || sharedNotes.length > 0;

  const noteItemClass = (selected: boolean) =>
    `group relative w-full text-left rounded-lg px-2.5 py-2 cursor-pointer transition-colors border-none ${
      selected
        ? "bg-theme-sidebar-item-selected shadow-sm"
        : "hover:bg-theme-sidebar-item-hover"
    }`;

  return (
    <ChatSidebar isOpen={true} minWidth={360} defaultWidth={420}>
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-theme-sidebar-border">
          <Notepad
            size={18}
            weight="fill"
            className="text-theme-text-secondary flex-shrink-0"
          />
          <p className="flex-1 font-semibold text-sm text-theme-text-primary">
            {t("chat_window.notepad", "Notizblock")}
          </p>
          {notes.length > 0 && (
            <span className="text-[10px] font-bold text-theme-text-secondary bg-theme-bg-tertiary rounded-full px-2 py-0.5">
              {notes.length}
            </span>
          )}
          <button
            type="button"
            onClick={handleNewNote}
            disabled={!slug || isCreating}
            className="flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-1 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t("chat_window.new_note", "Neue Notiz")}
            title={
              isCreating
                ? t("chat_window.creating_note", "Erstellen...")
                : t("chat_window.new_note", "Neue Notiz")
            }
          >
            <Plus size={16} weight="bold" />
          </button>
          <button
            onClick={closeSidebar}
            type="button"
            aria-label={t("common.close", "Schließen")}
            className="text-theme-text-secondary hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-1"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col gap-2 p-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-theme-bg-tertiary animate-pulse"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
            <div className="p-3 rounded-xl bg-red-950/40 light:bg-red-50 border border-red-800/50 light:border-red-200 text-xs text-red-400 light:text-red-600 flex items-center gap-2 max-w-xs">
              <Warning size={16} weight="fill" className="flex-shrink-0" />
              <span>
                {t("common.loadError", "Fehler beim Laden")}: {loadError}
              </span>
            </div>
            <button
              onClick={() => {
                setIsLoading(true);
                loadNotes();
              }}
              className="flex items-center gap-x-1.5 px-3 py-1.5 rounded-lg bg-theme-bg-tertiary text-theme-text-secondary hover:bg-theme-bg-quaternary transition-colors text-sm border-none cursor-pointer"
            >
              {t("sidebar.retry", "Erneut versuchen")}
            </button>
          </div>
        ) : !hasNotes ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-theme-bg-tertiary flex items-center justify-center">
              <Notepad
                size={22}
                weight="duotone"
                className="text-zinc-400 light:text-slate-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-theme-text-primary light:text-theme-text-primary">
                {t("chat_window.no_notes", "Noch keine Notizen vorhanden.")}
              </p>
              <p className="text-sm text-theme-text-secondary max-w-[220px]">
                {t(
                  "chat_window.notes_empty_hint",
                  "Halte Gedanken, To-dos und Recherche direkt im Workspace fest.",
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNewNote}
              disabled={isCreating}
              className="flex items-center gap-x-1.5 px-4 py-2 rounded-lg bg-white text-zinc-900 light:bg-zinc-900 light:text-white hover:bg-zinc-200 light:hover:bg-zinc-800 transition-colors text-sm font-medium border-none cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} weight="bold" />
              {t("chat_window.create_first_note", "Erste Notiz erstellen")}
            </button>
          </div>
        ) : (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Note list */}
            <aside className="w-[172px] flex-shrink-0 flex flex-col min-h-0 border-r border-theme-sidebar-border">
              <div className="flex-1 overflow-y-auto no-scroll p-2 flex flex-col gap-1">
                {notes.map((note) => (
                  <div key={note.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => handleSelectNote(note)}
                      className={noteItemClass(activeNote?.id === note.id)}
                    >
                      <div className="flex items-start gap-1.5 pr-6">
                        {note.pinned && (
                          <PushPin
                            size={10}
                            weight="fill"
                            className="text-theme-text-secondary flex-shrink-0 mt-0.5"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-theme-text-primary light:text-theme-text-primary truncate leading-snug">
                            {notePreview(note.content, emptyNoteLabel)}
                          </p>
                          <p className="text-[10px] text-theme-text-secondary mt-0.5">
                            {formatDate(note.updatedAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="absolute top-1.5 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleShareClick(e, note.id)}
                        aria-label={t("notepad.share", "Share note")}
                        className="text-theme-text-secondary hover:text-theme-text-primary transition-colors bg-transparent border-none cursor-pointer p-0.5 rounded"
                        title={t("chat_window.share_note", "Teilen")}
                      >
                        <ShareNetwork size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        aria-label={t("common.delete", "Löschen")}
                        className="text-theme-text-secondary hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer p-0.5 rounded"
                      >
                        <Trash size={11} />
                      </button>
                    </div>
                    {sharingNoteId === note.id && (
                      <div
                        ref={shareDropdownRef}
                        className="absolute left-full top-0 ml-2 z-50 min-w-[168px] bg-theme-bg-sidebar border border-theme-sidebar-border rounded-xl shadow-xl py-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="px-3 py-1 text-[10px] text-zinc-500 light:text-slate-500 uppercase tracking-widest font-medium">
                          {t("chat_window.share_to", "Teilen an")}
                        </p>
                        {shareableWorkspaces.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-zinc-500 light:text-slate-500">
                            {t(
                              "chat_window.no_other_workspaces",
                              "Keine weiteren Workspaces",
                            )}
                          </p>
                        ) : (
                          shareableWorkspaces.map((ws) => (
                            <button
                              key={ws.id}
                              type="button"
                              onClick={() =>
                                handleShareToWorkspace(note.id, ws.slug)
                              }
                              className="w-full text-left px-3 py-1.5 text-xs text-theme-text-primary hover:bg-theme-sidebar-item-hover transition-colors bg-transparent border-none cursor-pointer truncate"
                            >
                              {ws.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {sharedNotes.length > 0 && (
                  <>
                    <p className="px-2 pt-2 pb-1 text-[10px] text-theme-text-secondary uppercase tracking-widest font-medium">
                      {t("chat_window.shared_notes", "Geteilte Notizen")}
                    </p>
                    {sharedNotes.map((note) => (
                      <div key={`shared-${note.id}`} className="relative group">
                        <button
                          type="button"
                          onClick={() => handleSelectSharedNote(note)}
                          className={noteItemClass(activeSharedNote?.id === note.id)}
                        >
                          <div className="flex items-start gap-1.5 pr-5">
                            <ShareNetwork
                              size={10}
                              weight="fill"
                              className="text-[#009ee0] flex-shrink-0 mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-theme-text-primary light:text-theme-text-primary truncate leading-snug">
                                {notePreview(note.content, emptyNoteLabel)}
                              </p>
                              <p className="text-[10px] text-theme-text-secondary mt-0.5 truncate">
                                {t("chat_window.from", "von")}{" "}
                                {note.source_workspace_name}
                              </p>
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={(e) =>
                            handleUnshareNote(
                              e,
                              note.id,
                              note.source_workspace_slug,
                            )
                          }
                          aria-label={t("notepad.unshare", "Unshare note")}
                          className="absolute top-1.5 right-1 opacity-0 group-hover:opacity-100 text-theme-text-secondary hover:text-red-400 transition-opacity bg-transparent border-none cursor-pointer p-0.5 rounded"
                          title={t("chat_window.unshare", "Teilen aufheben")}
                        >
                          <Trash size={11} />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </aside>

            {/* Editor */}
            <main className="flex-1 flex flex-col min-w-0 min-h-0 p-3">
              {activeNote ? (
                <>
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleTogglePin(activeNote.id, activeNote.pinned)
                        }
                        aria-label={t("notepad.togglePin", "Toggle pin")}
                        className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors border-none cursor-pointer ${
                          activeNote.pinned
                            ? "bg-theme-bg-tertiary text-theme-text-primary"
                            : "bg-transparent text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary"
                        }`}
                      >
                        <PushPin
                          size={13}
                          weight={activeNote.pinned ? "fill" : "regular"}
                        />
                      </button>
                      <span className="text-[10px] text-zinc-500 light:text-slate-500 tabular-nums">
                        {isSaving
                          ? t("chat_window.saving", "Speichern...")
                          : `${wordCount} ${t("chat_window.words", "Wörter")}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 rounded-xl border border-theme-sidebar-border bg-theme-bg-primary shadow-sm overflow-hidden">
                    <textarea
                      value={content}
                      onChange={handleContentChange}
                      onBlur={() => {
                        if (saveTimerRef.current) {
                          clearTimeout(saveTimerRef.current);
                          saveTimerRef.current = null;
                        }
                        if (activeNote) saveNote(activeNote.id, content);
                      }}
                      placeholder={t(
                        "chat_window.note_placeholder",
                        "Hier Notiz schreiben...",
                      )}
                      className="w-full h-full bg-transparent text-sm leading-relaxed text-theme-text-primary p-4 outline-none resize-none placeholder:text-theme-text-secondary"
                    />
                  </div>
                </>
              ) : activeSharedNote ? (
                <>
                  <div className="flex items-center gap-1.5 mb-2 shrink-0 px-1">
                    <ShareNetwork size={12} className="text-[#009ee0]" />
                    <span className="text-[10px] text-theme-text-secondary truncate">
                      {t("chat_window.from", "von")}{" "}
                      {activeSharedNote.source_workspace_name}
                      {" · "}
                      {t("chat_window.read_only", "Schreibgeschützt")}
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 rounded-xl border border-theme-sidebar-border bg-theme-bg-secondary overflow-hidden">
                    <textarea
                      value={content}
                      readOnly
                      className="w-full h-full bg-transparent text-sm leading-relaxed text-theme-text-primary p-4 outline-none resize-none opacity-80 cursor-default"
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-theme-sidebar-border">
                  <p className="text-sm text-theme-text-secondary px-4 text-center">
                    {t(
                      "chat_window.select_or_create_note",
                      "Notiz auswählen oder erstellen",
                    )}
                  </p>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </ChatSidebar>
  );
}

export default memo(NotepadSidebar);
