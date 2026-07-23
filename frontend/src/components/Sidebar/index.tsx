// SPDX-License-Identifier: MIT
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router";
import { List } from "@phosphor-icons/react/dist/csr/List";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { SidebarSimple } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import ActiveWorkspaces from "./ActiveWorkspaces";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import NewWorkspaceModal, {
  useNewWorkspaceModal,
} from "../Modals/NewWorkspace";
import ThemeToggle from "@/components/ThemeToggle";
import Footer from "../Footer";
import SettingsButton from "../SettingsButton";
import Workspace from "@/models/workspace";
import useWorkspaces from "@/hooks/useWorkspaces";
import useUser from "@/hooks/useUser";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { invalidateThreads } from "@/hooks/useThreads";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeJsonParse } from "@/utils/request";
import { safeGetItem, safeSetItem } from "@/utils/safeStorage";
import { useSidebarToggle } from "./SidebarToggle";
import { useGlobalSearchDialog } from "@/features/global-search/GlobalSearchProvider";

type WorkspaceSummary = {
  id?: number | string;
  slug: string;
  name?: string;
};

type StoredWorkspace = { slug?: string } | null;

const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 264;
const SIDEBAR_WIDTH_STORAGE_KEY = "opensin-sidebar-width";
const APP_NAME = "OpenSIN";
const APP_MONOGRAM = "S";
const COMMAND_SHORTCUT_LABEL =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    ? "⌘K"
    : "Ctrl K";

function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));
}

function SidebarContent({
  onNavigate,
  onOpenSearch,
  onClose,
}: {
  onNavigate?: () => void;
  onOpenSearch?: () => void;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { workspaces } = useWorkspaces({ ordered: true });
  const [creating, setCreating] = useState(false);
  const { showing, showModal, hideModal } = useNewWorkspaceModal();
  const { openSearch: openGlobalSearch } = useGlobalSearchDialog();
  const activeWorkspace = useMemo(() => {
    const current = workspaces.find(
      (workspace: WorkspaceSummary) => workspace.slug === slug,
    );
    if (current) return current;
    const last = safeJsonParse(
      safeGetItem(LAST_VISITED_WORKSPACE),
      null,
    ) as StoredWorkspace;
    return (
      workspaces.find(
        (workspace: WorkspaceSummary) => workspace.slug === last?.slug,
      ) || workspaces[0]
    );
  }, [slug, workspaces]);

  const newChat = async () => {
    if (!activeWorkspace?.slug || creating) return;
    setCreating(true);
    try {
      const { thread, error } = await Workspace.threads.new(
        activeWorkspace.slug,
      );
      if (error || !thread?.slug)
        throw new Error(error || "Unable to create chat");
      invalidateThreads(activeWorkspace.slug);
      navigate(paths.workspace.thread(activeWorkspace.slug, thread.slug));
      onNavigate?.();
    } catch (error: unknown) {
      showToast(
        t("activeWorkspaces.chatCreateFailed", {
          error: error instanceof Error ? error.message : String(error),
        }),
        "error",
        { clear: true },
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="flex h-14 shrink-0 items-center px-2.5 pr-3">
        <button
          type="button"
          onClick={() => navigate(paths.home())}
          className="flex min-w-0 items-center gap-2"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-theme-text-primary text-xs font-bold text-theme-bg-primary">
            {APP_MONOGRAM}
          </div>
          <span className="truncate text-sm font-semibold text-theme-text-primary">
            {APP_NAME}
          </span>
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeToggle />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("sidebar.hideSidebar")}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
            >
              <SidebarSimple size={16} weight="fill" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2">
        <button
          type="button"
          onClick={newChat}
          disabled={!activeWorkspace || creating}
          className="mb-1 flex h-9 w-full shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-theme-text-primary hover:bg-theme-bg-hover disabled:opacity-50"
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
          {creating ? t("common.loading") : t("commandHub.actions.newChat")}
        </button>
        <button
          type="button"
          onClick={() => {
            openGlobalSearch();
            onOpenSearch?.();
          }}
          className="mb-3 flex h-9 w-full shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
        >
          <MagnifyingGlass size={16} aria-hidden="true" />
          <span>{t("commandHub.searchButton")}</span>
          <kbd className="ml-auto text-[10px] text-theme-text-muted">{COMMAND_SHORTCUT_LABEL}</kbd>
        </button>
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
            {t("commandHub.groups.notebooks")}
          </span>
          <button
            type="button"
            onClick={showModal}
            aria-label={t("commandHub.actions.createNotebook")}
            title={t("commandHub.actions.createNotebook")}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
          >
            <Plus size={13} aria-hidden="true" />
          </button>
        </div>
        <div className="mb-2 px-0.5">
          <WorkspaceSwitcher onCreate={showModal} onNavigate={onNavigate} />
        </div>
        <div className="no-scroll min-h-0 flex-1 overflow-y-auto">
          <ActiveWorkspaces />
        </div>
        <div className="shrink-0 pt-2">
          <Footer />
        </div>
      </div>
      {showing && <NewWorkspaceModal hideModal={hideModal} />}
    </>
  );
}

export default function Sidebar({
  onOpenSearch,
}: {
  onOpenSearch?: () => void;
}) {
  const { t } = useTranslation();
  const { showSidebar, setShowSidebar } = useSidebarToggle();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = safeGetItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = Number(stored);
    return parsed >= SIDEBAR_MIN_WIDTH && parsed <= SIDEBAR_MAX_WIDTH
      ? parsed
      : SIDEBAR_DEFAULT_WIDTH;
  });
  const resizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    safeSetItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!resizing.current) return;
      setSidebarWidth(
        clampSidebarWidth(
          startWidth.current + event.clientX - startX.current,
        ),
      );
    };
    const stop = () => {
      resizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => {
      stop();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, []);

  return (
    <>
      <nav
        aria-label={t("sidebar.mainNavigation")}
        style={
          {
            "--sidebar-current-width": `${showSidebar ? sidebarWidth : 0}px`,
            "--sidebar-width": `${sidebarWidth}px`,
          } as CSSProperties
        }
        className="codex-sidebar relative z-40 hidden w-[var(--sidebar-current-width)] shrink-0 overflow-hidden border-r border-white/[0.08] bg-theme-bg-sidebar transition-[width] duration-200 md:flex light:border-zinc-200/70"
      >
        <div className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col">
          <SidebarContent
            onOpenSearch={onOpenSearch}
            onClose={() => setShowSidebar(false)}
          />
        </div>
        {showSidebar && (
          <div
            onPointerDown={(event) => {
              event.preventDefault();
              resizing.current = true;
              startX.current = event.clientX;
              startWidth.current = sidebarWidth;
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 20 : 8;
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setSidebarWidth((width) => clampSidebarWidth(width - step));
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setSidebarWidth((width) => clampSidebarWidth(width + step));
              } else if (event.key === "Home") {
                event.preventDefault();
                setSidebarWidth(SIDEBAR_MIN_WIDTH);
              } else if (event.key === "End") {
                event.preventDefault();
                setSidebarWidth(SIDEBAR_MAX_WIDTH);
              }
            }}
            role="separator"
            tabIndex={0}
            aria-orientation="vertical"
            aria-label={t("sidebar.resizeSidebar")}
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            aria-valuenow={sidebarWidth}
            className="absolute right-0 top-0 z-50 h-full w-1.5 cursor-col-resize hover:bg-theme-bg-hover focus-visible:bg-theme-bg-hover focus-visible:outline-none"
          />
        )}
      </nav>
      {createPortal(
        <Tooltip
          id="workspace-thread-name"
          place="right"
          delayShow={600}
          className="tooltip !text-xs z-[99]"
        />,
        document.body,
      )}
    </>
  );
}

export function SidebarMobileHeader({
  onOpenSearch,
}: {
  onOpenSearch?: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const { openSearch: openGlobalSearch } = useGlobalSearchDialog();
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) =>
      event.key === "Escape" && setOpen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center border-b border-theme-modal-border bg-theme-bg-sidebar px-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("sidebar.openSidebar")}
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
        >
          <List size={22} aria-hidden="true" />
        </button>
        <span className="ml-2 text-sm font-semibold text-theme-text-primary">
          {APP_NAME}
        </span>
        <button
          type="button"
          onClick={() => {
            openGlobalSearch();
            onOpenSearch?.();
          }}
          aria-label={t("commandHub.openSearch")}
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
        >
          <MagnifyingGlass size={20} aria-hidden="true" />
        </button>
      </header>
      <div
        className={`fixed inset-0 z-[99] md:hidden ${open ? "visible" : "invisible pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label={t("common.close")}
          className={`absolute inset-0 bg-theme-overlay transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("sidebar.mobileNavigation")}
          className={`absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col bg-theme-bg-sidebar shadow-2xl transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="absolute right-2 top-2 z-[100] flex items-center gap-1">
            {(!user || user.role !== "default") && <SettingsButton />}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("common.close")}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <SidebarContent
            onNavigate={() => setOpen(false)}
            onOpenSearch={() => {
              setOpen(false);
              onOpenSearch?.();
            }}
          />
        </div>
      </div>
    </>
  );
}
