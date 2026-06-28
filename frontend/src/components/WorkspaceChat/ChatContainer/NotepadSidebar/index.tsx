// SPDX-License-Identifier: MIT
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { PushPin } from "@phosphor-icons/react/dist/csr/PushPin";
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
  const saveTimerRef = useRef<any>(null);
  const slug = workspace?.slug;

  const loadNotes = useCallback(async () => {
    if (!slug) return;
    const result = await Note.forWorkspace(slug);
    setNotes(result);
    if (result.length > 0 && !activeNote) {
      setActiveNote(result[0]);
      setContent(result[0].content || "");
    }
    setIsLoading(false);
  }, [slug]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

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
          prev.map((n) => (n.id === id ? { ...n, content: text, updatedAt: updated.updatedAt } : n)),
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
        const updatedNotes = prev.map((n) => (n.id === noteId ? { ...n, pinned: !currentPinned } : n));
        return updatedNotes.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      });
    }
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <ChatSidebar isOpen={true}>
      <div className="w-full h-full bg-zinc-900 light:bg-white flex flex-col overflow-hidden">
        <div className="flex flex-col shrink-0 gap-2 p-4 pb-2">
          <div className="flex items-start justify-between">
            <p className="font-medium text-base leading-6 text-white light:text-slate-900">
              {t("chat_window.notepad", "Notizblock")}
            </p>
            <button
              onClick={closeSidebar}
              type="button"
              className="text-white/60 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
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
                      <PushPin size={10} weight="fill" className="text-theme-text-secondary flex-shrink-0" />
                    )}
                    <p className="flex-1 text-xs text-white light:text-slate-900 truncate">
                      {(note.content || "").slice(0, 40) || t("chat_window.empty_note", "Leere Notiz")}
                    </p>
                  </div>
                  <p className="text-[10px] text-zinc-400 light:text-slate-500 mt-0.5">
                    {formatDate(note.updatedAt)}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-400 transition-all bg-transparent border-none cursor-pointer p-1"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {activeNote ? (
                <>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-theme-border">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePin(activeNote.id, activeNote.pinned)}
                        className={`bg-transparent border-none cursor-pointer p-1 transition-colors ${
                          activeNote.pinned
                            ? "text-theme-text-secondary"
                            : "text-zinc-500 hover:text-theme-text-secondary"
                        }`}
                      >
                        <PushPin size={12} weight={activeNote.pinned ? "fill" : "regular"} />
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
                    placeholder={t("chat_window.note_placeholder", "Hier Notiz schreiben...")}
                    className="flex-1 w-full bg-transparent text-sm text-white light:text-slate-900 p-3 outline-none resize-none placeholder:text-zinc-500"
                  />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-zinc-400 light:text-slate-500">
                    {t("chat_window.select_or_create_note", "Notiz auswählen oder erstellen")}
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
