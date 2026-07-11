// Purpose: Renders a single thread row in the left sidebar with a distinguishable display name.
// Docs: ThreadItem.doc.md
// SPDX-License-Identifier: MIT
import useScrollActiveItemIntoView from "@/hooks/useScrollActiveItemIntoView";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { invalidateThreads } from "@/hooks/useThreads";
import { prefetchChatHistory } from "@/hooks/useChatHistory";
import { ArrowCounterClockwise } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { DotsThree } from "@phosphor-icons/react/dist/csr/DotsThree";
import { Link as LinkIcon } from "@phosphor-icons/react/dist/csr/Link";
import { PencilSimple } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { memo, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { copyText } from "@/utils/clipboard";

const THREAD_CALLOUT_DETAIL_WIDTH: any = 26;
const DEFAULT_THREAD_NAMES = ["Thread", "New Thread", "*New Thread"];

// Returns a localized display name for a thread.
// Standard English names are replaced with the German i18n key when no
// meaningful date is available for disambiguation.
export function threadDisplayName(
  thread: any,
  duplicateNames?: Set<string>,
  t?: (key: string, fallback?: string) => string,
): string {
  if (!thread?.name)
    return t?.("threadItem.defaultName", "Neuer Chat") ?? "Neuer Chat";
  // Strip leading * that the backend sometimes prepends to default thread names
  const cleanName = thread.name.startsWith("*")
    ? thread.name.slice(1).trim()
    : thread.name;
  const isDefault =
    DEFAULT_THREAD_NAMES.includes(cleanName) ||
    DEFAULT_THREAD_NAMES.includes(thread.name);
  const needsDisambiguation = isDefault || duplicateNames?.has(cleanName);
  const dateRaw = thread.lastUpdatedAt || thread.createdAt;
  const baseName = t?.("threadItem.defaultName", "Neuer Chat") ?? "Neuer Chat";
  if (!needsDisambiguation) return cleanName;
  if (!dateRaw) return baseName;
  const d = new Date(dateRaw);
  const date = d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
  const time = d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${baseName} · ${date} ${time}`;
}

function ThreadItem({
  idx,
  activeIdx,
  isActive,
  workspace,
  thread,
  onRemove,
  toggleMarkForDeletion,
  hasNext,
  ctrlPressed = false,
  draggable = false,
  folderId = null,
  duplicateNames = null,
}: any) {
  const { slug: urlSlug, threadSlug = null } = useParams();
  const { t } = useTranslation();
  const workspaceSlug = workspace?.slug ?? urlSlug;
  const optionsContainer = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const displayName = threadDisplayName(thread, duplicateNames, t);
  const linkTo = thread.virtual
    ? paths.workspace.chat(workspaceSlug)
    : !thread.slug
      ? paths.workspace.chat(workspaceSlug)
      : paths.workspace.thread(workspaceSlug, thread.slug);

  const { ref } = useScrollActiveItemIntoView({
    isActive,
    behavior: "instant",
    block: "center",
  });

  // dnd-kit draggable — only enabled for real, non-virtual threads when draggable=true
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: thread.slug ?? "__non-draggable__",
    disabled: !draggable || !thread.slug || !!thread.virtual,
  });

  const dragStyle = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50, opacity: 0.6 }
    : undefined;
  return (
    <div
      ref={setDragRef}
      style={dragStyle}
      {...(draggable && thread.slug && !thread.virtual
        ? { ...attributes, ...listeners }
        : {})}
      className="relative flex h-8 w-full items-center overflow-x-hidden border-none py-px"
      role="listitem"
    >
      <div
        className={`group/thread relative flex w-full items-center justify-between rounded-md pr-1 transition-colors ${isActive ? "bg-theme-sidebar-item-selected" : "hover:bg-theme-sidebar-item-hover"}`}
      >
        {thread.deleted ? (
          <div className="w-full flex justify-between">
            <div className="w-full pl-2 py-1">
              <p
                className={`text-left text-sm text-slate-400/50 light:text-slate-500 italic`}
              >
                {t("threadItem.deletedThread")}
              </p>
            </div>
            {ctrlPressed && (
              <button
                type="button"
                aria-label={t("thread.cancelDelete")}
                className="border-none"
                onClick={() => toggleMarkForDeletion(thread.id)}
              >
                <ArrowCounterClockwise
                  className="text-zinc-300 hover:text-theme-text-primary light:hover:text-theme-text-primary light:text-theme-text-secondary hover:light:text-theme-text-primary"
                  size={18}
                />
              </button>
            )}
          </div>
        ) : (
          <Link
            ref={ref}
            to={linkTo}
            data-tooltip-id="workspace-thread-name"
            data-tooltip-content={displayName}
            className="w-full pl-3 py-1 overflow-hidden"
            aria-current={isActive ? "page" : undefined}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerEnter={() =>
              prefetchChatHistory(workspaceSlug, thread.slug || null)
            }
            onFocus={() =>
              prefetchChatHistory(workspaceSlug, thread.slug || null)
            }
          >
            <p
              className={`text-left text-[13px] truncate w-full ${
                isActive
                  ? "font-medium text-theme-sidebar-item-text-active"
                  : "font-normal text-theme-sidebar-item-text-inactive"
              }`}
            >
              {displayName}
            </p>
          </Link>
        )}
        {!!thread.slug && !thread.deleted && !thread.virtual && (
          <div ref={optionsContainer} className="flex items-center">
            {" "}
            {/* Added flex and items-center */}
            {ctrlPressed ? (
              <button
                type="button"
                aria-label={t("thread.deleteMark")}
                className="border-none"
                onClick={() => toggleMarkForDeletion(thread.id)}
              >
                <X
                  className="text-zinc-300 light:text-theme-text-secondary hover:text-theme-text-primary light:hover:text-theme-text-primary hover:light:text-theme-text-primary"
                  weight="bold"
                  size={18}
                />
              </button>
            ) : (
              <div className="flex items-center w-fit md:invisible md:group-hover/thread:visible md:group-focus-within/thread:visible gap-x-1">
                <button
                  type="button"
                  aria-label={t("threadItem.threadOptions")}
                  className="border-none"
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <DotsThree
                    className="text-slate-300 light:text-theme-text-secondary hover:text-theme-text-primary light:hover:text-theme-text-primary hover:light:text-theme-text-primary"
                    size={25}
                  />
                </button>
              </div>
            )}
            {showOptions && (
              <OptionsMenu
                containerRef={optionsContainer}
                workspace={workspace}
                thread={thread}
                onRemove={onRemove}
                close={() => setShowOptions(false)}
                currentThreadSlug={threadSlug}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ThreadItem);

function OptionsMenu({
  containerRef,
  workspace,
  thread,
  onRemove,
  close,
  currentThreadSlug,
}: any) {
  const menuRef: any = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Ref menu options
  const outsideClick = (e) => {
    if (!menuRef.current) return false;
    if (
      !menuRef.current?.contains(e.target) &&
      !containerRef.current?.contains(e.target)
    )
      close();
    return false;
  };

  const isEsc: any = (e) => {
    if (e.key === "Escape" || e.key === "Esc") close();
  };

  function cleanupListeners() {
    window.document.removeEventListener("click", outsideClick);
    window.document.removeEventListener("keyup", isEsc);
  }
  // end Ref menu options

  useEffect(() => {
    function setListeners() {
      if (!menuRef?.current || !containerRef.current) return false;
      window.document.addEventListener("click", outsideClick);
      window.document.addEventListener("keyup", isEsc);
    }

    setListeners();
    return cleanupListeners;
  }, [close, containerRef]);

  const handleNewChat = async () => {
    close();
    try {
      const { thread: newThread, message } = await Workspace.threads.new(
        workspace.slug,
      );
      if (message || !newThread) {
        showToast(t("threadItem.chatCreateFailed", { message }), "error", {
          clear: true,
        });
        return;
      }
      invalidateThreads(workspace.slug);
      navigate(paths.workspace.thread(workspace.slug, newThread.slug));
    } catch (e: any) {
      showToast(
        t("threadItem.chatCreateFailed", { message: String(e?.message || e) }),
        "error",
        { clear: true },
      );
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}${paths.workspace.thread(workspace.slug, thread.slug)}`;
    copyText(link).then((ok) => {
      if (ok) {
        showToast(t("threadItem.linkCopied"), "success", {
          clear: true,
        });
      } else {
        showToast(t("threadItem.linkCopyFailed"), "error", {
          clear: true,
        });
      }
    });
    close();
  };

  const renameThread = async () => {
    const name = window.prompt(t("threadItem.renamePrompt"))?.trim();
    if (!name || name.length === 0) {
      close();
      return;
    }

    try {
      const { message } = await Workspace.threads.update(
        workspace.slug,
        thread.slug,
        { name },
      );
      if (!!message) {
        showToast(t("threadItem.updateFailed", { message }), "error", {
          clear: true,
        });
        close();
        return;
      }

      invalidateThreads(workspace.slug);
      close();
    } catch (e: any) {
      showToast(
        t("threadItem.updateFailed", { message: String(e?.message || e) }),
        "error",
        { clear: true },
      );
      close();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("threadItem.deleteConfirm"))) return;
    try {
      const success = await Workspace.threads.delete(
        workspace.slug,
        thread.slug,
      );
      if (!success) {
        showToast(t("threadItem.deleteFailed"), "error", { clear: true });
        return;
      }
      showToast(t("threadItem.deleteSuccess"), "success", { clear: true });
      invalidateThreads(workspace.slug);
      onRemove(thread.id);
      if (currentThreadSlug === thread.slug) {
        navigate(paths.workspace.chat(workspace.slug));
      }
    } catch (e: any) {
      showToast(String(e?.message || e), "error", { clear: true });
    }
  };

  return (
    <div
      ref={menuRef}
      className="absolute w-fit z-[20] top-[25px] right-[10px] bg-theme-bg-sidebar border-[1px] border-theme-sidebar-border rounded-lg p-1"
    >
      <button
        onClick={handleNewChat}
        type="button"
        className="w-full rounded-md flex items-center p-2 gap-x-2 hover:bg-slate-500/20 text-slate-300 light:text-theme-text-primary"
      >
        <Plus size={18} />
        <p className="text-sm">{t("threadItem.newChat")}</p>
      </button>
      <div className="w-full h-px bg-theme-bg-secondary my-0.5" />
      <button
        onClick={handleCopyLink}
        type="button"
        className="w-full rounded-md flex items-center p-2 gap-x-2 hover:bg-slate-500/20 text-slate-300 light:text-theme-text-primary"
      >
        <LinkIcon size={18} />
        <p className="text-sm">{t("threadItem.copyLink")}</p>
      </button>
      <button
        onClick={renameThread}
        type="button"
        className="w-full rounded-md flex items-center p-2 gap-x-2 hover:bg-slate-500/20 text-slate-300 light:text-theme-text-primary"
      >
        <PencilSimple size={18} />
        <p className="text-sm">{t("common.rename")}</p>
      </button>
      <button
        onClick={handleDelete}
        type="button"
        className="w-full rounded-md flex items-center p-2 gap-x-2 hover:bg-red-500/20 text-slate-300 light:text-theme-text-primary hover:text-red-100"
      >
        <Trash size={18} />
        <p className="text-sm">{t("threadItem.deleteThread")}</p>
      </button>
    </div>
  );
}
