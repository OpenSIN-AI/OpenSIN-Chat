// SPDX-License-Identifier: MIT
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import {
  Plus,
  CircleNotch,
  Trash,
  FolderSimplePlus,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ThreadItem from "./ThreadItem";
import ThreadFolderItem from "./ThreadFolderItem";
import { useParams } from "react-router-dom";
import useThreads from "@/hooks/useThreads";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core";
export const THREAD_RENAME_EVENT = "renameThread";

export default function ThreadContainer({
  workspace,
  isVirtualThread = false,
}) {
  const { threadSlug = null } = useParams();
  const { t } = useTranslation();
  const {
    threads,
    folders,
    defaultThreadHasChats,
    isLoading: loading,
    mutate,
  } = useThreads(workspace.slug);
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    const chatHandler = (event) => {
      const { threadSlug, newName } = event.detail;
      mutate(
        (current) => {
          const currentThreads = current?.threads || [];
          return {
            ...current,
            threads: currentThreads.map((thread) => {
              if (thread.slug === threadSlug) {
                return { ...thread, name: newName };
              }
              return thread;
            }),
          };
        },
        { revalidate: false },
      );
    };

    window.addEventListener(THREAD_RENAME_EVENT, chatHandler);

    return () => {
      window.removeEventListener(THREAD_RENAME_EVENT, chatHandler);
    };
  }, [mutate]);

  // Enable toggling of bulk-deletion by holding meta-key (ctrl on win and cmd/fn on others)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (["Control", "Meta"].includes(event.key)) {
        setCtrlPressed(true);
      }
    };

    const handleKeyUp = (event) => {
      if (["Control", "Meta"].includes(event.key)) {
        setCtrlPressed(false);
        // when toggling, unset bulk progress so
        // previously marked threads that were never deleted
        // come back to life.
        mutate(
          (current) => {
            const currentThreads = current?.threads || [];
            return {
              ...current,
              threads: currentThreads.map((t) => {
                return { ...t, deleted: false };
              }),
            };
          },
          { revalidate: false },
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mutate]);

  const toggleForDeletion = (id) => {
    mutate(
      (current) => {
        const currentThreads = current?.threads || [];
        return {
          ...current,
          threads: currentThreads.map((t) => {
            if (t.id !== id) return t;
            return { ...t, deleted: !t.deleted };
          }),
        };
      },
      { revalidate: false },
    );
  };

  const handleDeleteAll = async () => {
    const slugs = threads.filter((t) => t.deleted === true).map((t) => t.slug);
    await Workspace.threads.deleteBulk(workspace.slug, slugs);
    mutate();

    // Only redirect if current thread is being deleted
    if (slugs.includes(threadSlug)) {
      window.location.href = paths.workspace.chat(workspace.slug);
    }
  };

  function removeThread(threadId) {
    mutate(
      (current) => {
        const currentThreads = current?.threads || [];
        return {
          ...current,
          threads: currentThreads.map((_t) => {
            if (_t.id !== threadId) return _t;
            return { ..._t, deleted: true };
          }),
        };
      },
      { revalidate: false },
    );

    // Show thread was deleted, but then remove from threads entirely so it will
    // not appear in bulk-selection.
    setTimeout(() => {
      mutate();
    }, 500);
  }

  function getActiveThreadIdx() {
    const unfoldered = threads.filter((t) => !t.folder_id);
    if (isVirtualThread)
      return unfoldered.length + (defaultThreadHasChats ? 1 : 0);
    if (!threadSlug && !defaultThreadHasChats)
      return unfoldered.length + (defaultThreadHasChats ? 1 : 0);
    const idx = unfoldered.findIndex((t) => t?.slug === threadSlug);
    if (idx >= 0) return idx + (defaultThreadHasChats ? 1 : 0);
    if (!threadSlug && defaultThreadHasChats) return 0;
    return -1;
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────
  function handleDragStart({ active }) {
    setActiveId(active.id);
  }

  async function handleDragEnd({ active, over }) {
    setActiveId(null);
    if (!over) return;
    const draggedSlug = active.id;
    const thread = threads.find((t) => t.slug === draggedSlug);
    if (!thread) return;

    let newFolderId = null;
    if (over.id === "unfoldered-drop") {
      newFolderId = null;
    } else if (String(over.id).startsWith("folder-")) {
      newFolderId = Number(String(over.id).replace("folder-", ""));
    } else {
      return;
    }
    if (thread.folder_id === newFolderId) return;

    // Optimistic update
    mutate(
      (current) => {
        const currentThreads = current?.threads || [];
        return {
          ...current,
          threads: currentThreads.map((t) =>
            t.slug === draggedSlug ? { ...t, folder_id: newFolderId } : t,
          ),
        };
      },
      { revalidate: false },
    );
    const ok = await Workspace.threads.folders.assignThread(
      workspace.slug,
      thread.slug,
      newFolderId,
    );
    if (!ok) {
      showToast(t("threadContainer.moveError"), "error", {
        clear: true,
      });
      mutate(
        (current) => {
          const currentThreads = current?.threads || [];
          return {
            ...current,
            threads: currentThreads.map((t) =>
              t.slug === draggedSlug
                ? { ...t, folder_id: thread.folder_id }
                : t,
            ),
          };
        },
        { revalidate: false },
      );
    } else {
      mutate();
    }
  }

  function handleFolderDeleted(folderId) {
    mutate(
      (current) => {
        const currentThreads = current?.threads || [];
        const currentFolders = current?.folders || [];
        return {
          ...current,
          threads: currentThreads.map((t) =>
            t.folder_id === folderId ? { ...t, folder_id: null } : t,
          ),
          folders: currentFolders.filter((f) => f.id !== folderId),
        };
      },
      { revalidate: false },
    );
    mutate();
  }

  function handleFolderRenamed(folderId, newName) {
    mutate(
      (current) => {
        const currentFolders = current?.folders || [];
        return {
          ...current,
          folders: currentFolders.map((f) =>
            f.id === folderId ? { ...f, name: newName } : f,
          ),
        };
      },
      { revalidate: false },
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col bg-pulse w-full h-10 items-center justify-center">
        <p className="text-xs text-white animate-pulse">{t("threadContainer.loadingThreads")}</p>
      </div>
    );
  }

  const activeThreadIdx = getActiveThreadIdx();

  // Show a virtual thread when on a bare workspace route (no threadSlug) and
  // the default thread has no chats — mimics the Home page virtual thread behavior.
  const showVirtualThread =
    isVirtualThread || (!threadSlug && !defaultThreadHasChats);

  const unfolderedThreads = threads.filter((t) => !t.folder_id);
  const draggedThread = activeId
    ? threads.find((t) => t.slug === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col" role="list" aria-label={t("common.threads")}>
        {defaultThreadHasChats && (
          <ThreadItem
            idx={0}
            activeIdx={activeThreadIdx}
            isActive={activeThreadIdx === 0}
            workspace={workspace}
            thread={{ slug: null, name: "default" }}
            hasNext={
              unfolderedThreads.length > 0 ||
              showVirtualThread ||
              folders.length > 0
            }
          />
        )}
        {folders.map((folder) => {
          const folderThreads = threads.filter(
            (t) => t.folder_id === folder.id,
          );
          return (
            <ThreadFolderItem
              key={folder.id}
              folder={folder}
              workspace={workspace}
              threads={folderThreads}
              activeThreadIdx={activeThreadIdx}
              defaultThreadHasChats={defaultThreadHasChats}
              ctrlPressed={ctrlPressed}
              toggleMarkForDeletion={toggleForDeletion}
              onRemoveThread={removeThread}
              onFolderDeleted={handleFolderDeleted}
              onFolderRenamed={handleFolderRenamed}
            />
          );
        })}
        <UnfolderedDropZone isDragging={!!activeId}>
          {unfolderedThreads.map((thread, i) => (
            <ThreadItem
              key={thread.slug}
              idx={i + (defaultThreadHasChats ? 1 : 0)}
              ctrlPressed={ctrlPressed}
              toggleMarkForDeletion={toggleForDeletion}
              activeIdx={activeThreadIdx}
              isActive={activeThreadIdx === i + (defaultThreadHasChats ? 1 : 0)}
              workspace={workspace}
              onRemove={removeThread}
              thread={thread}
              hasNext={i !== unfolderedThreads.length - 1 || showVirtualThread}
              draggable
            />
          ))}
        </UnfolderedDropZone>
        {showVirtualThread && (
          <ThreadItem
            idx={activeThreadIdx}
            activeIdx={activeThreadIdx}
            isActive={true}
            workspace={workspace}
            thread={{ slug: null, name: "*New Thread", virtual: true }}
            hasNext={false}
          />
        )}
        <DeleteAllThreadButton
          ctrlPressed={ctrlPressed}
          threads={threads}
          onDelete={handleDeleteAll}
        />
        <NewFolderButton
          workspace={workspace}
          onCreated={(f) => {
            mutate(
              (current) => {
                const currentFolders = current?.folders || [];
                return { ...current, folders: [...currentFolders, f] };
              },
              { revalidate: false },
            );
            mutate();
          }}
        />
        <NewThreadButton workspace={workspace} mutate={mutate} />
      </div>

      <DragOverlay>
        {draggedThread ? (
          <div className="bg-zinc-800 light:bg-slate-200 rounded-lg px-3 py-1.5 text-sm text-white light:text-theme-text-primary shadow-lg opacity-90 pointer-events-none">
            {draggedThread.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function UnfolderedDropZone({ children, isDragging }) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: "unfoldered-drop" });
  return (
    <div
      ref={setNodeRef}
      className={`w-full rounded-lg transition-colors ${
        isDragging
          ? isOver
            ? "bg-sky-500/10 ring-1 ring-sky-500/40"
            : "ring-1 ring-white/10"
          : ""
      }`}
    >
      {isDragging && (
        <p className="text-xs text-white/30 light:text-theme-text-secondary italic px-3 py-0.5">
          {t("threadContainer.dropHere")}
        </p>
      )}
      {children}
    </div>
  );
}

function NewThreadButton({ workspace, mutate }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    const { thread, error } = await Workspace.threads.new(workspace.slug);
    if (!!error) {
      showToast(t("threadContainer.createError", { error }), "error", { clear: true });
      setLoading(false);
      return;
    }
    mutate();
    window.location.replace(
      paths.workspace.thread(workspace.slug, thread.slug),
    );
  };

  return (
    <button
      onClick={onClick}
      className="w-full relative flex h-[40px] items-center border-none hover:bg-[var(--theme-sidebar-thread-selected)] light:hover:bg-slate-300 hover:light:bg-theme-sidebar-subitem-hover rounded-lg"
    >
      <div className="flex w-full gap-x-2 items-center pl-4">
        <div className="bg-zinc-800 light:bg-slate-50 p-2 rounded-lg h-[24px] w-[24px] flex items-center justify-center">
          {loading ? (
            <CircleNotch
              weight="bold"
              size={14}
              className="shrink-0 animate-spin text-white light:text-theme-text-primary"
            />
          ) : (
            <Plus
              weight="bold"
              size={14}
              className="shrink-0 text-white light:text-theme-text-primary"
            />
          )}
        </div>
        {loading ? (
          <p className="text-left text-white light:text-theme-text-primary text-sm">
            {t("threadContainer.startingChat")}
          </p>
        ) : (
          <p className="text-left text-white light:text-theme-text-primary text-sm font-semibold">
            {t("threadContainer.newChat")}
          </p>
        )}
      </div>
    </button>
  );
}

function NewFolderButton({ workspace, onCreated }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    const name = window.prompt(t("threadContainer.folderNamePrompt"))?.trim();
    if (!name) return;
    setLoading(true);
    const { folder, message } = await Workspace.threads.folders.new(
      workspace.slug,
      name,
    );
    setLoading(false);
    if (message || !folder) {
      showToast(t("threadContainer.folderCreateError", { message }), "error", {
        clear: true,
      });
      return;
    }
    onCreated(folder);
  };

  return (
    <button
      onClick={onClick}
      className="w-full relative flex h-[40px] items-center border-none hover:bg-[var(--theme-sidebar-thread-selected)] light:hover:bg-slate-300 rounded-lg"
    >
      <div className="flex w-full gap-x-2 items-center pl-4">
        <div className="bg-zinc-800 light:bg-slate-50 p-2 rounded-lg h-[24px] w-[24px] flex items-center justify-center">
          {loading ? (
            <CircleNotch
              weight="bold"
              size={14}
              className="shrink-0 animate-spin text-white light:text-theme-text-primary"
            />
          ) : (
            <FolderSimplePlus
              weight="bold"
              size={14}
              className="shrink-0 text-white light:text-theme-text-primary"
            />
          )}
        </div>
        <p className="text-left text-white light:text-theme-text-primary text-sm font-semibold">
          {t("threadContainer.newFolder")}
        </p>
      </div>
    </button>
  );
}

function DeleteAllThreadButton({ ctrlPressed, threads, onDelete }) {
  const { t } = useTranslation();
  if (!ctrlPressed || threads.filter((t) => t.deleted).length === 0)
    return null;
  return (
    <button
      type="button"
      onClick={onDelete}
      className="w-full relative flex h-[40px] items-center border-none hover:bg-red-400/20 rounded-lg group"
    >
      <div className="flex w-full gap-x-2 items-center pl-4">
        <div className="bg-transparent p-2 rounded-lg h-[24px] w-[24px] flex items-center justify-center">
          <Trash
            weight="bold"
            size={14}
            className="shrink-0 text-white light:text-red-500/50 group-hover:text-red-400"
          />
        </div>
        <p className="text-white light:text-theme-text-secondary text-left text-sm group-hover:text-red-400">
          {t("threadContainer.deleteSelected")}
        </p>
      </div>
    </button>
  );
}
