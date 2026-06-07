// SPDX-License-Identifier: MIT
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import {
  CaretDown,
  CaretRight,
  FolderSimple,
  PencilSimple,
  Trash,
} from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import ThreadItem from "../ThreadItem";
import { useDroppable } from "@dnd-kit/core";

export default function ThreadFolderItem({
  folder,
  workspace,
  threads = [],
  activeThreadIdx,
  defaultThreadHasChats,
  ctrlPressed = false,
  toggleMarkForDeletion,
  onRemoveThread,
  onFolderDeleted,
  onFolderRenamed,
}) {
  const { threadSlug = null } = useParams();
  const containsActiveThread = threads.some((t) => t.slug === threadSlug);
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const inputRef = useRef(null);

  // When the active thread moves into this folder (via DnD), auto-expand it
  useEffect(() => {
    if (containsActiveThread) setOpen(true);
  }, [containsActiveThread]);

  const { setNodeRef, isOver } = useDroppable({ id: `folder-${folder.id}` });

  async function saveRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === folder.name) {
      setName(folder.name);
      setEditing(false);
      return;
    }
    const { folder: updated, message } = await Workspace.threads.folders.update(
      workspace.slug,
      folder.id,
      { name: trimmed },
    );
    if (message || !updated) {
      showToast(`Umbenennen fehlgeschlagen: ${message}`, "error", {
        clear: true,
      });
      setName(folder.name);
    } else {
      onFolderRenamed(folder.id, updated.name);
    }
    setEditing(false);
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Ordner "${folder.name}" löschen? Alle Chats werden in die Hauptliste verschoben.`,
      )
    )
      return;
    const ok = await Workspace.threads.folders.delete(
      workspace.slug,
      folder.id,
    );
    if (!ok) {
      showToast("Ordner konnte nicht gelöscht werden.", "error", {
        clear: true,
      });
      return;
    }
    onFolderDeleted(folder.id);
  }

  return (
    <div
      ref={setNodeRef}
      className={`w-full rounded-lg transition-colors ${isOver ? "bg-sky-500/10 ring-1 ring-sky-500/40" : ""}`}
    >
      {/* Folder header */}
      <div className="flex items-center w-full h-[38px] group px-2 gap-x-1 rounded-lg hover:bg-[var(--theme-sidebar-thread-selected)] light:hover:bg-slate-200">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="flex-1 flex items-center gap-x-1.5 min-w-0"
          aria-expanded={open}
        >
          {open ? (
            <CaretDown
              size={12}
              className="shrink-0 text-white/50 light:text-theme-text-secondary"
            />
          ) : (
            <CaretRight
              size={12}
              className="shrink-0 text-white/50 light:text-theme-text-secondary"
            />
          )}
          <FolderSimple
            size={16}
            weight="fill"
            className="shrink-0 text-white/70 light:text-theme-text-secondary"
          />
          {editing ? (
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") {
                  setName(folder.name);
                  setEditing(false);
                }
              }}
              autoFocus
              className="bg-transparent border-b border-white/40 text-white light:text-theme-text-primary text-sm outline-none w-full min-w-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm text-white light:text-theme-text-primary truncate">
              {name}
              <span className="ml-1 text-white/40 light:text-theme-text-secondary text-xs">
                ({threads.length})
              </span>
            </span>
          )}
        </button>

        {/* Action buttons - only show on hover */}
        {!editing && (
          <div className="flex items-center gap-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="p-1 rounded hover:bg-white/10 light:hover:bg-slate-300"
              title="Umbenennen"
            >
              <PencilSimple
                size={12}
                className="text-white/60 light:text-theme-text-secondary"
              />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="p-1 rounded hover:bg-red-500/20"
              title="Löschen"
            >
              <Trash
                size={12}
                className="text-white/60 hover:text-red-400 light:text-theme-text-secondary"
              />
            </button>
          </div>
        )}
      </div>

      {/* Folder contents */}
      {open && (
        <div className="pl-4">
          {threads.length === 0 ? (
            <p className="text-xs text-white/30 light:text-theme-text-secondary italic py-1 px-2">
              Hierher ziehen
            </p>
          ) : (
            threads.map((thread, i) => (
              <ThreadItem
                key={thread.slug}
                idx={i}
                ctrlPressed={ctrlPressed}
                toggleMarkForDeletion={toggleMarkForDeletion}
                activeIdx={activeThreadIdx}
                isActive={thread.slug === threadSlug}
                workspace={workspace}
                onRemove={onRemoveThread}
                thread={thread}
                hasNext={i !== threads.length - 1}
                draggable
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
