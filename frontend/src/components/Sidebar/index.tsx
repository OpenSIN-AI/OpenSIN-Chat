// SPDX-License-Identifier: MIT
import React, { useEffect, useRef, useState } from "react";
import { List } from "@phosphor-icons/react/dist/csr/List";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { SidebarSimple } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import ThemeToggle from "@/components/ThemeToggle";
import NewWorkspaceModal, {
  useNewWorkspaceModal,
} from "../Modals/NewWorkspace";
import ActiveWorkspaces from "./ActiveWorkspaces";
import useLogo from "@/hooks/useLogo";
import useUser from "@/hooks/useUser";
import Footer from "../Footer";
import SettingsButton from "../SettingsButton";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import { safeGetItem, safeSetItem } from "@/utils/safeStorage";
import { useTranslation } from "react-i18next";
import { useSidebarToggle } from "./SidebarToggle";
import SearchBox from "./SearchBox";
import { Tooltip } from "react-tooltip";
import { createPortal } from "react-dom";

const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 288;
const SIDEBAR_WIDTH_STORAGE_KEY = "opensin-sidebar-width";

export default function Sidebar() {
  const { user } = useUser();
  const { logo } = useLogo();
  const sidebarRef = useRef(null);
  const { showSidebar, setShowSidebar, canToggleSidebar } = useSidebarToggle();
  const {
    showing: showingNewWsModal,
    showModal: showNewWsModal,
    hideModal: hideNewWsModal,
  } = useNewWorkspaceModal();
  const { t } = useTranslation();

  // Sidebar width state with localStorage persistence
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
    const stored = safeGetItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (stored) {
      const n = Number(stored);
      if (!isNaN(n) && n >= SIDEBAR_MIN_WIDTH && n <= SIDEBAR_MAX_WIDTH)
        return n;
    }
    return SIDEBAR_DEFAULT_WIDTH;
  });
  const isResizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const resizeFrameRef = useRef<number | null>(null);

  // Persist width changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      safeSetItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
    }
  }, [sidebarWidth]);

  function handleResizeStart(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    isResizingRef.current = true;
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      if (!isResizingRef.current) return;
      const maxWidth = Math.min(SIDEBAR_MAX_WIDTH, window.innerWidth * 0.45);
      const nextWidth = Math.min(
        maxWidth,
        Math.max(
          SIDEBAR_MIN_WIDTH,
          resizeStartWidthRef.current + e.clientX - resizeStartXRef.current,
        ),
      );
      if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = requestAnimationFrame(() =>
        setSidebarWidth(nextWidth),
      );
    }
    function handlePointerUp() {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (resizeFrameRef.current) cancelAnimationFrame(resizeFrameRef.current);
    };
  }, []);

  return (
    <>
      <nav
        aria-label={t("sidebar.mainNavigation")}
        style={{ width: showSidebar ? `${sidebarWidth}px` : "0px" }}
        className={`relative z-40 hidden flex-shrink-0 overflow-hidden bg-theme-bg-sidebar transition-[width] duration-200 ease-out md:flex ${showSidebar ? "border-r border-theme-modal-border" : ""}`}
      >
        <div className="overflow-hidden h-full flex flex-col w-full">
          <div className="flex h-14 w-full shrink-0 items-center justify-between gap-2 border-b border-theme-modal-border px-3">
            <Link
              to={paths.home()}
              aria-label={t("sidebar.home")}
              className="flex items-center gap-x-2 overflow-hidden flex-shrink min-w-0 px-1 py-1 rounded-md hover:bg-theme-bg-hover transition-colors"
            >
              <img
                src={logo}
                alt={t("sidebar.logo")}
                className="h-6 w-6 max-h-[24px] max-w-[24px] object-contain flex-shrink-0"
              />
              <span className="text-theme-text-primary font-semibold text-sm tracking-tight whitespace-nowrap">
                OpenSIN
              </span>
            </Link>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setShowSidebar((prev) => !prev)}
                data-tooltip-id="sidebar-header-toggle"
                data-tooltip-content={
                  showSidebar
                    ? t("sidebar.hideSidebar")
                    : t("sidebar.showSidebar")
                }
                aria-label={
                  showSidebar
                    ? t("sidebar.hideSidebar")
                    : t("sidebar.showSidebar")
                }
                className="flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
              >
                <SidebarSimple
                  size={15}
                  weight={showSidebar ? "fill" : "regular"}
                />
              </button>
              <Tooltip
                id="sidebar-header-toggle"
                place="bottom"
                delayShow={300}
                className="tooltip !text-xs z-[99]"
              />
            </div>
          </div>
          <div
            ref={sidebarRef}
            className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden px-3 pb-3 pt-2"
          >
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-grow flex flex-col min-h-0">
                <div className="relative flex-1 flex flex-col w-full justify-between pt-[4px] overflow-y-scroll overflow-x-hidden no-scroll">
                  <div className="flex flex-col gap-y-[12px]">
                    <SearchBox user={user} showNewWsModal={showNewWsModal} />
                    <ActiveWorkspaces />
                  </div>
                </div>
                {showSidebar && (
                  <div className="shrink-0 pt-2 pb-1 z-10">
                    <Footer />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Resize Handle */}
        {showSidebar && (
          <div
            onPointerDown={handleResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label={t("sidebar.resizeSidebar")}
            title={t("sidebar.resizeSidebarTitle")}
            className="group absolute right-0 top-0 z-50 flex h-full w-1.5 cursor-col-resize items-center justify-center transition-colors hover:bg-theme-bg-hover"
          >
            <div className="h-10 w-px rounded-full bg-transparent transition-colors group-hover:bg-theme-text-secondary" />
          </div>
        )}
        {showingNewWsModal && <NewWorkspaceModal hideModal={hideNewWsModal} />}
      </nav>
      <WorkspaceAndThreadTooltips />
    </>
  );
}

export function SidebarMobileHeader() {
  const { logo } = useLogo();
  const sidebarRef = useRef(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const {
    showing: showingNewWsModal,
    showModal: showNewWsModal,
    hideModal: hideNewWsModal,
  } = useNewWorkspaceModal();
  const { user } = useUser();
  const { t } = useTranslation();

  useEffect(() => {
    if (!showSidebar) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setShowSidebar(false);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showSidebar]);

  useEffect(() => {
    if (!showSidebar) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showSidebar]);

  return (
    <>
      <header
        aria-label={t("sidebar.topNavigationMobile")}
        className="fixed top-0 left-0 right-0 z-10 flex h-14 items-center justify-between border-b border-theme-modal-border bg-theme-bg-sidebar px-4 py-2"
      >
        <button
          type="button"
          onClick={() => setShowSidebar(true)}
          aria-label={t("sidebar.openSidebar")}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
          aria-expanded={showSidebar}
        >
          <List className="h-6 w-6" />
        </button>
        <div className="flex items-center justify-center flex-grow gap-x-2">
          <img
            src={logo}
            alt={t("sidebar.logo")}
            className="h-6 w-6 max-h-6 max-w-6 object-contain"
          />
          <span className="text-theme-text-primary font-bold text-base">
            OpenSIN
          </span>
        </div>
        <div className="w-12"></div>
      </header>
      <div
        className={`fixed inset-0 z-[99] h-dvh w-full transition-visibility duration-200 ${showSidebar ? "visible" : "invisible pointer-events-none"}`}
        aria-hidden={!showSidebar}
      >
        <div
          className={`fixed inset-0 bg-theme-overlay transition-opacity duration-200 ${
            showSidebar ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setShowSidebar(false)}
          role="presentation"
        />
        <div
          ref={sidebarRef}
          className={`fixed inset-y-0 left-0 h-dvh w-[min(88vw,360px)] border-r border-theme-modal-border bg-theme-bg-sidebar shadow-2xl transition-transform duration-200 ease-out ${showSidebar ? "translate-x-0" : "-translate-x-full"}`}
          role="dialog"
          aria-modal="true"
          aria-label={t("sidebar.mobileNavigation")}
        >
          <div className="flex h-full w-full flex-col overflow-hidden">
            {/* Header Information */}
            <div className="flex h-16 w-full shrink-0 items-center justify-between gap-4 border-b border-theme-modal-border px-4">
              <div className="flex shrink-0 w-fit items-center justify-start gap-x-2">
                <img
                  src={logo}
                  alt={t("sidebar.logo")}
                  className="w-8 h-8 max-h-[32px] max-w-[32px] object-contain"
                />
                <span className="text-theme-text-primary font-bold text-base">
                  OpenSIN
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-theme-text-secondary">
                {(!user || user?.role !== "default") && <SettingsButton />}
                <button
                  type="button"
                  onClick={() => setShowSidebar(false)}
                  aria-label={t("common.close")}
                  className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Primary Body */}
            <div className="flex min-h-0 w-full flex-1 flex-col">
              <div className="no-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
                <NewWorkspaceButton
                  user={user}
                  showNewWsModal={showNewWsModal}
                />
                <ActiveWorkspaces />
              </div>
              <div className="shrink-0 border-t border-theme-modal-border bg-theme-bg-sidebar px-4 py-3">
                <Footer />
              </div>
            </div>
          </div>
        </div>
        {showingNewWsModal && <NewWorkspaceModal hideModal={hideNewWsModal} />}
      </div>
    </>
  );
}

function NewWorkspaceButton({ user, showNewWsModal }: any) {
  const { t } = useTranslation();
  if (!!user && user?.role === "default") return null;

  return (
    <div className="flex gap-x-2 items-center justify-between">
      <button
        type="button"
        onClick={showNewWsModal}
        aria-label={t("new-workspace.title")}
        className="flex h-10 w-full flex-grow items-center justify-center gap-2 rounded-lg border border-theme-modal-border bg-theme-bg-secondary px-4 py-1.5 text-sm font-medium text-theme-text-primary transition-colors duration-150 hover:bg-theme-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <p className="text-sm font-medium">{t("new-workspace.title")}</p>
      </button>
    </div>
  );
}

function WorkspaceAndThreadTooltips() {
  return createPortal(
    <React.Fragment>
      <Tooltip
        id="workspace-name"
        place="right"
        delayShow={800}
        className="tooltip !text-xs z-[99]"
      />
      <Tooltip
        id="workspace-thread-name"
        place="right"
        delayShow={800}
        className="tooltip !text-xs z-[99]"
      />
      <Tooltip
        id="upload-workspace"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-[99]"
      />
      <Tooltip
        id="gear-workspace"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-[99]"
      />
    </React.Fragment>,
    document.body,
  );
}
