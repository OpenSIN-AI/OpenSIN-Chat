// SPDX-License-Identifier: MIT
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { FolderSimplePlus } from "@phosphor-icons/react/dist/csr/FolderSimplePlus";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { ChatText } from "@phosphor-icons/react/dist/csr/ChatText";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ThreadItem from "./ThreadItem";
import ThreadFolderItem from "./ThreadFolderItem";
import { useParams, useNavigate, Link } from "react-router-dom";
import useThreads from "@/hooks/useThreads";
import { safeGetItem, safeSetItem } from "@/utils/safeStorage";
import logger from "@/utils/logger";
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

const DATE_GROUPS = [
  { id: "today", labelKey: "threadContainer.groupToday" },
  { id: "yesterday", labelKey: "threadContainer.groupYesterday" },
  { id: "this_week", labelKey: "threadContainer.groupThisWeek" },
  { id: "last_week", labelKey: "threadContainer.groupLastWeek" },
  { id: "older", labelKey: "threadContainer.groupOlder" },
];

function getThreadDateGroup(thread, now = new Date()) {
  const dateStr = thread.lastUpdatedAt || thread.createdAt;
  if (!dateStr) return "older";
  const date = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const threadDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.floor(
    (today.getTime() - threadDay.getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  const dayOfWeek = today.getDay() || 7;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - dayOfWeek + 1);
  if (threadDay >= currentMonday) return "this_week";
  const lastMonday = new Date(currentMonday);
  lastMonday.setDate(currentMonday.getDate() - 7);
  if (threadDay >= lastMonday) return "last_week";
  return "older";
}

function loadDateGroupCollapseState(workspaceSlug) {
  try {
    const stored = safeGetItem(`thread-folder-collapse-${workspaceSlug}`);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn("[index] non-fatal error:", e?.message || e);
  }
  return {};
}

function saveDateGroupCollapseState(workspaceSlug, groupId, isCollapsed) {
  try {
    const state = loadDateGroupCollapseState(workspaceSlug);
    state[groupId] = isCollapsed;
    safeSetItem(
      `thread-folder-collapse-${workspaceSlug}`,
      JSON.stringify(state),
    );
  } catch (e) {
    console.warn("[index] non-fatal error:", e?.message || e);
  }
}

function ThreadContainer({
  workspace,
  isActive: _isActive = false,
  isVirtualThread = false,
}) {
  const { threadSlug = null } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    threads,
    folders,
    defaultThreadHasChats,
    isLoading: loading,
    mutate,
  } = useThreads(workspace.slug);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const isSearchActive = searchQuery.trim().length > 0;

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await Workspace.threads.search(
        workspace.slug,
        searchQuery,
      );
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, workspace.slug]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  // Names that appear more than once across all threads need a date/time suffix
  // so duplicate thread titles remain distinguishable in the sidebar.
  const duplicateNames = useMemo(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const thread of threads) {
      if (!thread?.name) continue;
      if (seen.has(thread.name)) duplicates.add(thread.name);
      else seen.add(thread.name);
    }
    return duplicates;
  }, [threads]);

  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [activeId, setActiveId] = useState<any>(null);

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
        // Only reset bulk-deletion marks if there are actually threads
        // marked for deletion — avoids unnecessary mutate calls on every
        // Ctrl/Meta release.
        const hasMarkedThreads = threads.some((t) => t.deleted === true);
        if (hasMarkedThreads) {
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
    if (slugs.length === 0) return; // No threads selected — nothing to do
    try {
      await Workspace.threads.deleteBulk(workspace.slug, slugs);
      mutate();
    } catch (e) {
      logger.error("Failed to delete threads:", e);
      mutate(); // Rollback visual state
      return;
    }

    // Only redirect if current thread is being deleted
    if (slugs.includes(threadSlug)) {
      navigate(paths.workspace.chat(workspace.slug));
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
    } else if (over.id === draggedSlug) {
      return;
    } else {
      const overThread = threads.find((t) => t.slug === over.id);
      if (overThread) {
        newFolderId = overThread.folder_id;
      } else {
        return;
      }
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
        <p className="text-xs text-theme-text-primary animate-pulse">
          {t("threadContainer.loadingThreads")}
        </p>
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
      <div
        className="flex flex-col w-full overflow-x-hidden"
        role="list"
        aria-label={t("common.threads")}
      >
        <ThreadSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={clearSearch}
        />
        {isSearchActive ? (
          <SearchResultsList
            results={searchResults}
            isSearching={isSearching}
            query={searchQuery}
            workspace={workspace}
            onClear={clearSearch}
          />
        ) : (
          <>
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
                  duplicateNames={duplicateNames}
                />
              );
            })}
            <UnfolderedDropZone isDragging={!!activeId}>
              <UnfolderedDateGroups
                threads={unfolderedThreads}
                defaultThreadHasChats={defaultThreadHasChats}
                activeThreadIdx={activeThreadIdx}
                ctrlPressed={ctrlPressed}
                toggleMarkForDeletion={toggleForDeletion}
                onRemoveThread={removeThread}
                workspace={workspace}
                workspaceSlug={workspace.slug}
                showVirtualThread={showVirtualThread}
                duplicateNames={duplicateNames}
              />
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
          </>
        )}
        <div className="sticky bottom-0 z-10 -mx-2.5 bg-theme-bg-sidebar px-2.5 py-1">
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
      </div>

      <DragOverlay>
        {draggedThread ? (
          <div className="bg-zinc-800 light:bg-slate-200 rounded-lg px-3 py-1.5 text-sm text-theme-text-primary light:text-theme-text-primary shadow-lg opacity-90 pointer-events-none">
            {draggedThread.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DateGroupHeader({ label, count, collapsed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center overflow-hidden text-xs font-medium text-theme-placeholder light:text-theme-text-secondary uppercase tracking-wider py-2 px-3 cursor-pointer hover:text-theme-text-secondary light:hover:text-theme-text-primary transition-colors"
      aria-expanded={!collapsed}
    >
      {collapsed ? (
        <CaretRight
          size={12}
          className="shrink-0 w-3 h-3 inline-block transition-transform mr-1"
        />
      ) : (
        <CaretDown
          size={12}
          className="shrink-0 w-3 h-3 inline-block transition-transform mr-1"
        />
      )}
      <span>{label}</span>
      <span className="ml-1 text-theme-placeholder light:text-theme-text-secondary text-[10px]">
        {count}
      </span>
    </button>
  );
}

function UnfolderedDateGroups({
  threads,
  defaultThreadHasChats,
  activeThreadIdx,
  ctrlPressed,
  toggleMarkForDeletion,
  onRemoveThread,
  workspace,
  workspaceSlug,
  showVirtualThread,
  duplicateNames,
}) {
  const { t } = useTranslation();
  const { threadSlug = null } = useParams();

  const [collapsed, setCollapsed] = useState(() =>
    loadDateGroupCollapseState(workspaceSlug),
  );

  const grouped = useMemo(() => {
    const buckets = {};
    for (const thread of threads) {
      const groupId = getThreadDateGroup(thread);
      if (!buckets[groupId]) buckets[groupId] = [];
      buckets[groupId].push(thread);
    }
    return DATE_GROUPS.filter((g) => buckets[g.id]?.length > 0).map((g) => ({
      ...g,
      threads: buckets[g.id],
    }));
  }, [threads]);

  let runningIdx = 0;
  const totalUnfoldered = threads.length;

  return (
    <>
      {grouped.map((group) => {
        const isCollapsed = collapsed[group.id] === true;
        const containsActiveThread = group.threads.some(
          (th) => th.slug === threadSlug,
        );
        const effectiveCollapsed = isCollapsed && !containsActiveThread;
        const startIdx = runningIdx + (defaultThreadHasChats ? 1 : 0);
        runningIdx += group.threads.length;

        return (
          <div key={group.id}>
            <DateGroupHeader
              label={t(group.labelKey)}
              count={group.threads.length}
              collapsed={effectiveCollapsed}
              onToggle={() => {
                const next = !isCollapsed;
                setCollapsed((prev) => ({ ...prev, [group.id]: next }));
                saveDateGroupCollapseState(workspaceSlug, group.id, next);
              }}
            />
            <div
              className={`transition-all duration-200 overflow-hidden ${
                effectiveCollapsed ? "max-h-0" : "max-h-[9999px]"
              }`}
            >
              {group.threads.map((thread, i) => {
                const globalIdx = startIdx + i;
                const isLastGlobally = globalIdx === totalUnfoldered - 1;
                return (
                  <ThreadItem
                    key={thread.slug}
                    idx={globalIdx}
                    ctrlPressed={ctrlPressed}
                    toggleMarkForDeletion={toggleMarkForDeletion}
                    activeIdx={activeThreadIdx}
                    isActive={activeThreadIdx === globalIdx}
                    workspace={workspace}
                    onRemove={onRemoveThread}
                    thread={thread}
                    hasNext={!isLastGlobally || showVirtualThread}
                    draggable
                    duplicateNames={duplicateNames}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </>
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
        <p className="text-xs text-theme-placeholder light:text-theme-text-secondary italic px-3 py-0.5">
          {t("threadContainer.dropHere")}
        </p>
      )}
      {children}
    </div>
  );
}

function NewThreadButton({ workspace, mutate }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    if (!workspace?.slug) return;
    setLoading(true);
    try {
      const { thread, error } = await Workspace.threads.new(workspace.slug);
      if (!!error) {
        showToast(t("threadContainer.createError", { error }), "error", {
          clear: true,
        });
        setLoading(false);
        return;
      }
      mutate();
      navigate(paths.workspace.thread(workspace.slug, thread?.slug));
    } catch (e: any) {
      showToast(
        t("threadContainer.createError", { error: String(e?.message || e) }),
        "error",
        { clear: true },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative mb-1 flex h-9 w-full items-center rounded-lg border border-theme-modal-border bg-theme-bg-secondary transition-colors hover:bg-theme-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
    >
      <div className="flex w-full gap-x-2 items-center pl-3">
        {loading ? (
          <CircleNotch
            weight="bold"
            size={14}
            className="shrink-0 animate-spin text-theme-text-primary light:text-theme-text-primary"
          />
        ) : (
          <Plus
            weight="bold"
            size={14}
            className="shrink-0 text-theme-text-primary"
          />
        )}
        {loading ? (
          <p className="text-left text-theme-text-primary light:text-slate-600 text-[13px]">
            {t("threadContainer.startingChat")}
          </p>
        ) : (
          <p className="text-left text-[13px] font-medium text-theme-text-primary">
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
    try {
      const { folder, message } = await Workspace.threads.folders.new(
        workspace.slug,
        name,
      );
      if (message || !folder) {
        showToast(
          t("threadContainer.folderCreateError", { message }),
          "error",
          { clear: true },
        );
        return;
      }
      onCreated(folder);
    } catch (e: any) {
      showToast(
        t("threadContainer.folderCreateError", {
          message: String(e?.message || e),
        }),
        "error",
        { clear: true },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-9 w-full items-center rounded-lg border-none text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
    >
      <div className="flex w-full gap-x-2 items-center pl-3">
        {loading ? (
          <CircleNotch
            weight="bold"
            size={14}
            className="shrink-0 animate-spin"
          />
        ) : (
          <FolderSimplePlus
            weight="bold"
            size={14}
            className="shrink-0"
          />
        )}
        <p className="text-left text-theme-text-secondary light:text-slate-500 text-[13px] font-medium">
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

function ThreadSearchBar({ value, onChange, onClear }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex items-center w-full mb-2 mt-1">
      <MagnifyingGlass
        size={14}
        className="absolute left-3 shrink-0 text-theme-placeholder light:text-slate-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("threadContainer.searchThreads")}
        className="w-full h-[30px] pl-8 pr-7 text-[13px] bg-white/5 light:bg-slate-200/70 border border-white/10 light:border-slate-300 rounded-[8px] text-theme-text-primary light:text-theme-text-primary placeholder:text-theme-placeholder light:placeholder:text-slate-400 focus:outline-none focus:border-white/20 light:focus:border-slate-400 transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label={t("threadContainer.clearSearch")}
          className="absolute right-2 shrink-0 text-theme-placeholder light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors"
        >
          <X size={14} weight="bold" />
        </button>
      )}
    </div>
  );
}

function HighlightMatch({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const lowerText = String(text).toLowerCase();
  const lowerQuery = String(query).toLowerCase();
  if (!lowerQuery || !lowerText.includes(lowerQuery)) return <>{text}</>;
  const parts: any[] = [];
  let lastIndex = 0;
  let idx = lowerText.indexOf(lowerQuery);
  let key = 0;
  while (idx !== -1) {
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
    parts.push(
      <mark
        key={`hl-${key++}`}
        className="bg-white/20 light:bg-blue-200/70 text-inherit rounded px-0.5"
      >
        {text.slice(idx, idx + query.length)}
      </mark>,
    );
    lastIndex = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}

function SearchResultsList({
  results,
  isSearching,
  query,
  workspace,
  onClear,
}) {
  const { t } = useTranslation();
  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-4">
        <CircleNotch
          size={16}
          className="animate-spin text-theme-placeholder light:text-slate-400"
        />
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 px-3">
        <p className="text-[13px] text-theme-placeholder light:text-slate-400 text-center">
          {t("threadContainer.noResults")}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] text-theme-placeholder light:text-slate-400 px-3 pb-1 uppercase tracking-wider">
        {t("threadContainer.searchResults", { count: results.length })}
      </p>
      {results.map((thread) => (
        <SearchResultItem
          key={thread.slug}
          thread={thread}
          query={query}
          workspace={workspace}
        />
      ))}
    </div>
  );
}

function SearchResultItem({ thread, query, workspace }) {
  const { t } = useTranslation();
  const linkTo = thread.slug
    ? paths.workspace.thread(workspace.slug, thread.slug)
    : paths.workspace.chat(workspace.slug);
  return (
    <Link
      to={linkTo}
      className="w-full flex flex-col px-3 py-1.5 rounded-[6px] hover:bg-white/5 light:hover:bg-slate-200/70 transition-colors group/sr"
    >
      <div className="flex items-center gap-1.5">
        {!thread.nameMatch && (
          <ChatText
            size={12}
            className="shrink-0 text-theme-placeholder light:text-slate-400"
          />
        )}
        <p className="text-left text-[13px] truncate text-theme-text-primary light:text-slate-600 group-hover/sr:text-white light:group-hover/sr:text-theme-text-primary">
          <HighlightMatch text={thread.name} query={query} />
        </p>
      </div>
      {thread.contentSnippet && (
        <p className="text-[11px] text-theme-placeholder light:text-slate-400 truncate pl-[18px] mt-0.5">
          <HighlightMatch text={thread.contentSnippet} query={query} />
        </p>
      )}
    </Link>
  );
}

export default memo(ThreadContainer);
