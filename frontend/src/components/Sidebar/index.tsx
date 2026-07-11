// SPDX-License-Identifier: MIT
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { List } from "@phosphor-icons/react/dist/csr/List";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { SidebarSimple } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { CalendarBlank } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import ActiveWorkspaces from "./ActiveWorkspaces";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import NewWorkspaceModal, { useNewWorkspaceModal } from "../Modals/NewWorkspace";
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

const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 288;
const SIDEBAR_WIDTH_STORAGE_KEY = "opensin-sidebar-width";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { user } = useUser();
  const { workspaces } = useWorkspaces({ ordered: true });
  const [creating, setCreating] = useState(false);
  const { showing, showModal, hideModal } = useNewWorkspaceModal();
  const activeWorkspace = useMemo(() => {
    const current = workspaces.find((workspace: any) => workspace.slug === slug);
    if (current) return current;
    const last = safeJsonParse(safeGetItem(LAST_VISITED_WORKSPACE), null as any);
    return workspaces.find((workspace: any) => workspace.slug === last?.slug) || workspaces[0];
  }, [slug, workspaces]);

  const newChat = async () => {
    if (!activeWorkspace?.slug || creating) return;
    setCreating(true);
    try {
      const { thread, error } = await Workspace.threads.new(activeWorkspace.slug);
      if (error || !thread?.slug) throw new Error(error || "Unable to create chat");
      invalidateThreads(activeWorkspace.slug);
      navigate(paths.workspace.thread(activeWorkspace.slug, thread.slug));
      onNavigate?.();
    } catch (error: any) {
      showToast(t("activeWorkspaces.chatCreateFailed", { error: error?.message || error }), "error", { clear: true });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-1 px-2.5">
        <WorkspaceSwitcher onCreate={showModal} onNavigate={onNavigate} />
        <ThemeToggle />
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-2">
        <button type="button" onClick={newChat} disabled={!activeWorkspace || creating} className="mb-2 flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-theme-sidebar-item-selected px-3 text-sm font-medium text-theme-sidebar-item-text-active transition-colors hover:bg-theme-bg-hover disabled:cursor-not-allowed disabled:opacity-50">
          <Plus size={16} weight="bold" />
          {creating ? t("common.loading") : t("activeWorkspaces.newChat", "New Chat")}
        </button>
        {user?.role !== "default" && (
          <Link to={paths.settings.scheduledJobs()} onClick={onNavigate} className="mb-1 flex h-9 shrink-0 items-center gap-2 rounded-lg px-2.5 text-sm text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary">
            <CalendarBlank size={17} />
            {t("sidebar.scheduled", "Scheduled")}
          </Link>
        )}
        <div className="no-scroll min-h-0 flex-1 overflow-y-auto pt-1">
          <ActiveWorkspaces />
        </div>
        <div className="shrink-0 pt-2"><Footer /></div>
      </div>
      {showing && <NewWorkspaceModal hideModal={hideModal} />}
    </>
  );
}

export default function Sidebar() {
  const { t } = useTranslation();
  const { showSidebar, setShowSidebar } = useSidebarToggle();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = safeGetItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = Number(stored);
    return parsed >= SIDEBAR_MIN_WIDTH && parsed <= SIDEBAR_MAX_WIDTH ? parsed : SIDEBAR_DEFAULT_WIDTH;
  });
  const resizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => safeSetItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth)), [sidebarWidth]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (!resizing.current) return;
      setSidebarWidth(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, startWidth.current + event.clientX - startX.current)));
    };
    const stop = () => { resizing.current = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
  }, []);

  return (
    <>
      <nav aria-label={t("sidebar.mainNavigation")} style={{ width: showSidebar ? sidebarWidth : 0 }} className={`relative z-40 hidden shrink-0 overflow-hidden bg-theme-bg-sidebar transition-[width] duration-200 md:flex ${showSidebar ? "border-r border-theme-modal-border" : ""}`}>
        <div className="flex h-full w-full shrink-0 flex-col" style={{ width: sidebarWidth }}>
          <div className="absolute right-2 top-2 z-50 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
            <button type="button" onClick={() => setShowSidebar(false)} aria-label={t("sidebar.hideSidebar")} className="flex h-9 w-9 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"><SidebarSimple size={16} weight="fill" /></button>
          </div>
          <SidebarContent />
        </div>
        {showSidebar && <div onPointerDown={(event) => { event.preventDefault(); resizing.current = true; startX.current = event.clientX; startWidth.current = sidebarWidth; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; }} role="separator" aria-orientation="vertical" aria-label={t("sidebar.resizeSidebar")} className="absolute right-0 top-0 z-50 h-full w-1.5 cursor-col-resize hover:bg-theme-bg-hover" />}
      </nav>
      {createPortal(<Tooltip id="workspace-thread-name" place="right" delayShow={600} className="tooltip !text-xs z-[99]" />, document.body)}
    </>
  );
}

export function SidebarMobileHeader() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center border-b border-theme-modal-border bg-theme-bg-sidebar px-3 md:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label={t("sidebar.openSidebar")} aria-expanded={open} className="flex h-10 w-10 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"><List size={22} /></button>
        <span className="ml-2 text-sm font-semibold text-theme-text-primary">OpenSIN</span>
      </header>
      <div className={`fixed inset-0 z-[99] md:hidden ${open ? "visible" : "invisible pointer-events-none"}`} aria-hidden={!open}>
        <div className={`absolute inset-0 bg-theme-overlay transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} />
        <div role="dialog" aria-modal="true" aria-label={t("sidebar.mobileNavigation")} className={`absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col bg-theme-bg-sidebar shadow-2xl transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="absolute right-2 top-2 z-[100] flex items-center gap-1">
            {(!user || user.role !== "default") && <SettingsButton />}
            <button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")} className="flex h-9 w-9 items-center justify-center rounded-lg text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"><X size={18} /></button>
          </div>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}
