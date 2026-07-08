// SPDX-License-Identifier: MIT
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { PushPin } from "@phosphor-icons/react/dist/csr/PushPin";
import { ShareNetwork } from "@phosphor-icons/react/dist/csr/ShareNetwork";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import Note from "@/models/note";
import ChatSidebar, { useChatSidebar } from "../ChatSidebar";

export default function NotepadSidebar({ workspace }: any) {
  const { t } = useTranslation();
  const { closeSidebar } = useChatSidebar();
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const saveTimerRef = useRef<any>(null);
  const slug = workspace?.slug;

  const [sharedNotes, setSharedNotes] = useState<any[]>([]);
  const [shareableWorkspaces, setShareableWorkspaces] = useState<any[]>([]);
  const [sharingNoteId, setSharingNoteId] = useState<any>(null);
  const [activeSharedNote, setActiveSharedNote] = useState<any>(null);
  const shareDropdownRef = useRef<any>(null);

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
      if (result.length > 0 && !activeNote) {
        setActiveNote(result[0]);
        setContent(result[0].content || "");
      }
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : t("common.loadError", "Fehler beim Laden"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [slug, activeNote, t]);

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
    if (!slug) return;
    const note = await Note.create(slug, { content: "" });
    if (note) {
      setNotes((prev) => [note, ...prev]);
      setActiveNote(note);
      setContent("");
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

  return (
    <ChatSidebar isOpen={true}>
      <div className="w-full h-full bg-zinc-900 light:bg-white flex flex-col overflow-hidden">
        <div className="flex flex-col shrink-0 gap-2 p-4 pb-2">
          <div className="flex items-start justify-between">
            <p className="font-medium text-base leading-6 text-theme-text-primary light:text-theme-text-primary">
              {t("chat_window.notepad", "Notizblock")}
            </p>
            <button
              onClick={closeSidebar}
              type="button"
              className="text-theme-text-secondary light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
          <button
            onClick={handleNewNote}
            className="flex items-center gap-x-1.5 px-3 py-1.5 rounded-lg bg-theme-bg-secondary text-theme-text-secondary hover:opacity-80 transition-opacity text-sm border border-theme-border"
          >
            <Plus size={14} />
            {t("chat_window.new_note", "Neue Notiz")}
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="dot-falling light:invert" />
          </div>
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex items-center gap-2 max-w-xs">
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
              className="flex items-center gap-x-1.5 px-3 py-1.5 rounded-lg bg-theme-bg-secondary text-theme-text-secondary hover:opacity-80 transition-opacity text-sm border border-theme-border"
            >
              {t("sidebar.retry", "Erneut versuchen")}
            </button>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4">
            <p className="text-sm text-zinc-400 light:text-slate-500 text-center">
              {t("chat_window.no_notes", "Noch keine Notizen vorhanden.")}
            </p>
            <button
              onClick={handleNewNote}
              className="flex items-center gap-x-1.5 px-3 py-1.5 rounded-lg bg-theme-bg-secondary text-theme-text-secondary hover:opacity-80 transition-opacity text-sm border border-theme-border"
            >
              <Plus size={14} />
              {t("chat_window.create_first_note", "Erste Notiz erstellen")}
            </button>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            <div className="w-48 flex-shrink-0 border-r border-theme-border overflow-y-auto no-scroll">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`group relative px-3 py-2 cursor-pointer border-b border-theme-border transition-colors ${
                    activeNote?.id === note.id
                      ? "bg-zinc-700 light:bg-slate-200"
                      : "hover:bg-zinc-800 light:hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {note.pinned && (
                      <PushPin
                        size={10}
                        weight="fill"
                        className="text-theme-text-secondary flex-shrink-0"
                      />
                    )}
                    <p className="flex-1 text-xs text-theme-text-primary light:text-theme-text-primary truncate">
                      {(note.content || "").slice(0, 40) ||
                        t("chat_window.empty_note", "Leere Notiz")}
                    </p>
                  </div>
                  <p className="text-[10px] text-zinc-400 light:text-slate-500 mt-0.5">
                    {formatDate(note.updatedAt)}
                  </p>
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => handleShareClick(e, note.id)}
                      aria-label={t("notepad.share", "Share note")}
                      className="text-zinc-400 hover:text-theme-text-secondary transition-all bg-transparent border-none cursor-pointer p-1"
                      title={t("chat_window.share_note", "Teilen")}
                    >
                      <ShareNetwork size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNote(note.id);
                      }}
                      className="text-zinc-400 hover:text-red-400 transition-all bg-transparent border-none cursor-pointer p-1"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                  {sharingNoteId === note.id && (
                    <div
                      ref={shareDropdownRef}
                      className="absolute left-full top-0 ml-1 z-50 min-w-[160px] bg-zinc-800 light:bg-white border border-theme-border rounded-lg shadow-xl py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="px-3 py-1 text-[10px] text-zinc-400 light:text-slate-500 uppercase tracking-wide">
                        {t("chat_window.share_to", "Teilen an")}
                      </p>
                      {shareableWorkspaces.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-zinc-400 light:text-slate-500">
                          {t(
                            "chat_window.no_other_workspaces",
                            "Keine weiteren Workspaces",
                          )}
                        </p>
                      ) : (
                        shareableWorkspaces.map((ws) => (
                          <button
                            key={ws.id}
                            onClick={() =>
                              handleShareToWorkspace(note.id, ws.slug)
                            }
                            className="w-full text-left px-3 py-1.5 text-xs text-theme-text-primary light:text-theme-text-primary hover:bg-zinc-700 light:hover:bg-slate-100 transition-colors bg-transparent border-none cursor-pointer truncate"
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
                  <div className="px-3 py-1.5 border-b border-theme-border bg-theme-bg-secondary">
                    <p className="text-[10px] text-zinc-400 light:text-slate-500 uppercase tracking-wide font-medium">
                      {t("chat_window.shared_notes", "Geteilte Notizen")}
                    </p>
                  </div>
                  {sharedNotes.map((note) => (
                    <div
                      key={`shared-${note.id}`}
                      onClick={() => handleSelectSharedNote(note)}
                      className={`group relative px-3 py-2 cursor-pointer border-b border-theme-border transition-colors ${
                        activeSharedNote?.id === note.id
                          ? "bg-zinc-700 light:bg-slate-200"
                          : "hover:bg-zinc-800 light:hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <ShareNetwork
                          size={10}
                          weight="fill"
                          className="text-primary-button flex-shrink-0"
                        />
                        <p className="flex-1 text-xs text-theme-text-primary light:text-theme-text-primary truncate">
                          {(note.content || "").slice(0, 35) ||
                            t("chat_window.empty_note", "Leere Notiz")}
                        </p>
                      </div>
                      <p className="text-[10px] text-zinc-400 light:text-slate-500 mt-0.5">
                        {t("chat_window.from", "von")}{" "}
                        {note.source_workspace_name}
                      </p>
                      <button
                        onClick={(e) =>
                          handleUnshareNote(
                        aria-label={t("notepad.unshare", "Unshare note")}
                            e,
                            note.id,
                            note.source_workspace_slug,
                          )
                        }
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400 transition-all bg-transparent border-none cursor-pointer p-1"
                        title={t("chat_window.unshare", "Teilen aufheben")}
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {activeNote ? (
                <>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-theme-border">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleTogglePin(activeNote.
                        aria-label={t("notepad.togglePin", "Toggle pin")}id, activeNote.pinned)
                        }
                        className={`bg-transparent border-none cursor-pointer p-1 transition-colors ${
                          activeNote.pinned
                            ? "text-theme-text-secondary"
                            : "text-zinc-500 hover:text-theme-text-secondary"
                        }`}
                      >
                        <PushPin
                          size={12}
                          weight={activeNote.pinned ? "fill" : "regular"}
                        />
                      </button>
                      <span className="text-[10px] text-zinc-400 light:text-slate-500">
                        {isSaving
                          ? t("chat_window.saving", "Speichern...")
                          : `${wordCount} ${t("chat_window.words", "Wörter")}`}
                      </span>
                    </div>
                  </div>
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
                    className="flex-1 w-full bg-transparent text-sm text-theme-text-primary light:text-theme-text-primary p-3 outline-none resize-none placeholder:text-zinc-500"
                  />
                </>
              ) : activeSharedNote ? (
                <>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-theme-border">
                    <div className="flex items-center gap-1.5">
                      <ShareNetwork size={12} className="text-primary-button" />
                      <span className="text-[10px] text-zinc-400 light:text-slate-500">
                        {t("chat_window.from", "von")}{" "}
                        {activeSharedNote.source_workspace_name}
                        {" · "}
                        {t("chat_window.read_only", "Schreibgeschützt")}
                      </span>
                    </div>
                  </div>
                  <textarea
                    value={content}
                    readOnly
                    placeholder={t(
                      "chat_window.note_placeholder",
                      "Hier Notiz schreiben...",
                    )}
                    className="flex-1 w-full bg-transparent text-sm text-theme-text-primary light:text-theme-text-primary p-3 outline-none resize-none placeholder:text-zinc-500 cursor-default opacity-70"
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-zinc-400 light:text-slate-500">
                    {t(
                      "chat_window.select_or_create_note",
                      "Notiz auswählen oder erstellen",
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ChatSidebar>
  );
}
