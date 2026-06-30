// SPDX-License-Identifier: MIT
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { invalidateThreads } from "@/hooks/useThreads";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { ChatCircleText } from "@phosphor-icons/react/dist/csr/ChatCircleText";
import { FolderSimple } from "@phosphor-icons/react/dist/csr/FolderSimple";
import { FolderSimplePlus } from "@phosphor-icons/react/dist/csr/FolderSimplePlus";
import { PencilSimple } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThreadItem from "../ThreadItem";
import { useDroppable } from "@dnd-kit/core";
import paths from "@/utils/paths";
import { safeGetItem, safeSetItem } from "@/utils/safeStorage";

const FOLDER_COLLAPSE_KEY = "openafd_folder_collapse_state";

function loadFolderCollapseState(): Record<string, boolean> {
  try {
    const stored = safeGetItem(FOLDER_COLLAPSE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

function saveFolderCollapseState(folderId: number, collapsed: boolean) {
  try {
    const state = loadFolderCollapseState();
    state[String(folderId)] = collapsed;
    safeSetItem(FOLDER_COLLAPSE_KEY, JSON.stringify(state));
  } catch {}
}

/** Small + dropdown for Folder rows: creates a new Chat inside the folder or a new sub-folder */
function FolderQuickAdd({ workspace, folder, isOpen, setIsOpen }: any) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleNewChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    try {
      const { thread, error } = await Workspace.threads.new(workspace.slug);
      if (error) {
        showToast(t("threadFolderItem.chatCreateFailed", { error }), "error", {
          clear: true,
        });
        return;
      }
      // Assign the newly created thread to this folder
      await Workspace.threads.folders.assignThread(
        workspace.slug,
        thread.slug,
        folder.id,
      );
      invalidateThreads(workspace.slug);
      navigate(paths.workspace.thread(workspace.slug, thread.slug));
    } catch (err: any) {
      showToast(
        t("threadFolderItem.chatCreateFailed", {
          error: String(err?.message || err),
        }),
        "error",
        { clear: true },
      );
    }
  };

  const handleNewFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    const name = window.prompt(t("threadFolderItem.folderNamePrompt"))?.trim();
    if (!name) return;
    try {
      const { folder: newFolder, message } =
        await Workspace.threads.folders.new(workspace.slug, name);
      if (message || !newFolder) {
        showToast(
          t("threadFolderItem.folderCreateFailed", { message }),
          "error",
          {
            clear: true,
          },
        );
        return;
      }
      invalidateThreads(workspace.slug);
    } catch (err: any) {
      showToast(
        t("threadFolderItem.folderCreateFailed", {
          message: String(err?.message || err),
        }),
        "error",
        { clear: true },
      );
    }
  };

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((p: boolean) => !p);
        }}
        className="p-1 rounded hover:bg-white/10 light:hover:bg-slate-300"
        title={t("threadFolderItem.quickAddTitle")}
      >
        <Plus
          size={12}
          className="text-white/60 light:text-theme-text-secondary"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border border-white/10 light:border-slate-200 bg-zinc-800 light:bg-white shadow-xl overflow-hidden">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center gap-x-2 px-3 py-2 text-sm text-slate-200 light:text-slate-700 hover:bg-zinc-700 light:hover:bg-slate-100 transition-colors"
          >
            <ChatCircleText size={14} />
            {t("threadFolderItem.newChat")}
          </button>
          <div className="h-px bg-white/10 light:bg-slate-200" />
          <button
            type="button"
            onClick={handleNewFolder}
            className="w-full flex items-center gap-x-2 px-3 py-2 text-sm text-slate-200 light:text-slate-700 hover:bg-zinc-700 light:hover:bg-slate-100 transition-colors"
          >
            <FolderSimplePlus size={14} />
            {t("threadFolderItem.newFolder")}
          </button>
        </div>
      )}
    </div>
  );
}

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
  duplicateNames = null,
}: any) {
  const { threadSlug = null } = useParams();
  const { t } = useTranslation();
  const containsActiveThread = (threads as any).some(
    (t) => t.slug === threadSlug,
  );
  const [open, setOpen] = useState(() => {
    const collapsedState = loadFolderCollapseState();
    return collapsedState[String(folder.id)] !== true;
  });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState<string>(folder.name);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
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
    try {
      const { folder: updated, message } =
        await Workspace.threads.folders.update(workspace.slug, folder.id, {
          name: trimmed,
        });
      if (message || !updated) {
        showToast(t("threadFolderItem.renameFailed", { message }), "error", {
          clear: true,
        });
        setName(folder.name);
      } else {
        onFolderRenamed(folder.id, updated.name);
        invalidateThreads(workspace.slug);
      }
    } catch (err: any) {
      showToast(
        t("threadFolderItem.renameFailed", {
          message: String(err?.message || err),
        }),
        "error",
        { clear: true },
      );
      setName(folder.name);
    }
    setEditing(false);
  }

  async function handleDelete() {
    if (
      !window.confirm(
        t("threadFolderItem.deleteConfirm", { name: folder.name }),
      )
    )
      return;
    try {
      const ok = await Workspace.threads.folders.delete(
        workspace.slug,
        folder.id,
      );
      if (!ok) {
        showToast(t("threadFolderItem.deleteFailed"), "error", {
          clear: true,
        });
        return;
      }
      onFolderDeleted(folder.id);
      invalidateThreads(workspace.slug);
    } catch (err: any) {
      showToast(
        t("threadFolderItem.deleteFailed") + `: ${String(err?.message || err)}`,
        "error",
        { clear: true },
      );
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`w-full rounded-lg transition-colors overflow-x-hidden ${isOver ? "bg-sky-500/10 ring-1 ring-sky-500/40" : ""}`}
    >
      {/* Folder header */}
      <div className="flex items-center w-full h-[38px] group px-2 gap-x-1 rounded-lg hover:bg-[var(--theme-sidebar-thread-selected)] light:hover:bg-slate-200">
        <button
          type="button"
          onClick={() => {
            setOpen((p) => {
              const next = !p;
              saveFolderCollapseState(folder.id, !next);
              return next;
            });
          }}
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
              onChange={(e) => setName((e.target as unknown as any)?.value)}
              onBlur={saveRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
                if (e.key === "Escape") {
                  setName(folder.name);
                  setEditing(false);
                }
              }}
              autoFocus
              aria-label={t("common.rename")}
              className="bg-transparent border-b border-white/40 text-white light:text-theme-text-primary text-sm outline-none w-full min-w-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm text-white light:text-theme-text-primary truncate">
              {name}
              <span className="ml-1 text-white/40 light:text-theme-text-secondary text-xs">
                {t("threadFolderItem.folderThreadCount", {
                  count: threads.length,
                })}
              </span>
            </span>
          )}
        </button>

        {/* Action buttons - only show on hover (or when quickAdd dropdown is open) */}
        {!editing && (
          <div
            className={`flex items-center gap-x-0.5 transition-opacity ${quickAddOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <FolderQuickAdd
              workspace={workspace}
              folder={folder}
              isOpen={quickAddOpen}
              setIsOpen={setQuickAddOpen}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              aria-label={t("threadFolderItem.rename")}
              className="p-2 rounded hover:bg-white/10 light:hover:bg-slate-300"
              title={t("threadFolderItem.rename")}
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
              aria-label={t("threadFolderItem.delete")}
              className="p-2 rounded hover:bg-red-500/20"
              title={t("threadFolderItem.delete")}
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
            <p className="text-xs text-zinc-400 light:text-theme-text-secondary italic py-1 px-2">
              {t("threadFolderItem.dragHere")}
            </p>
          ) : (
            (threads as any).map((thread, i) => (
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
                duplicateNames={duplicateNames}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
