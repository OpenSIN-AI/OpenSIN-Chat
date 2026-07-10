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

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_DEFAULT_WIDTH = 292;
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

  // Persist width changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      safeSetItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
    }
  }, [sidebarWidth]);

  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  // Mount global mouse listeners ONCE on mount, not on every sidebarWidth change
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizingRef.current) return;
      const delta = e.clientX - resizeStartXRef.current;
      const newWidth = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(SIDEBAR_MIN_WIDTH, resizeStartWidthRef.current + delta),
      );
      setSidebarWidth(newWidth);
    }
    function handleMouseUp() {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <>
      <nav
        aria-label={t("sidebar.mainNavigation")}
        style={{ width: showSidebar ? `${sidebarWidth}px` : "0px" }}
        className={`relative z-40 hidden flex-shrink-0 overflow-hidden bg-theme-bg-sidebar transition-[width] duration-200 md:flex ${showSidebar ? "border-r border-theme-modal-border" : ""}`}
      >
        <div className="overflow-hidden h-full flex flex-col w-full">
          <div className="flex shrink-0 w-full items-center justify-between gap-x-2 mt-3 mb-2 px-3">
            <Link
              to={paths.home()}
              aria-label={t("sidebar.home")}
              className="flex items-center gap-x-2 overflow-hidden flex-shrink min-w-0 px-1 py-1 rounded-md hover:bg-white/[0.04] light:hover:bg-zinc-100 transition-colors"
            >
              <img
                src={logo}
                alt={t("sidebar.logo")}
                className="h-6 w-6 max-h-[24px] max-w-[24px] object-contain flex-shrink-0"
              />
              <span className="text-[#e4e4e7] light:text-zinc-900 font-semibold text-sm tracking-tight whitespace-nowrap">
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
                className="flex h-11 w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-theme-text-secondary transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary"
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
            className="w-full relative flex-1 flex flex-col px-2 pb-2 min-h-0 overflow-hidden"
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
            onMouseDown={handleResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label={t("sidebar.resizeSidebar")}
            title={t("sidebar.resizeSidebarTitle")}
            className="absolute top-0 right-0 h-full w-[5px] cursor-col-resize z-50 group flex items-center justify-center hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-px h-8 bg-transparent group-hover:bg-white/20 rounded-full transition-colors" />
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
        className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-2 bg-[#111111] light:bg-white border-b border-white/[0.06] light:border-zinc-200 h-14"
      >
        <button
          type="button"
          onClick={() => setShowSidebar(true)}
          aria-label={t("sidebar.openSidebar")}
          className="rounded-md p-2 flex items-center justify-center text-theme-text-secondary hover:bg-white/10 transition-colors"
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
        className={`fixed inset-0 z-[99] h-dvh w-full transition-transform duration-200 ${
          showSidebar ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-hidden={!showSidebar}
      >
        <div
          className={`transition-all duration-500 fixed top-0 left-0 bg-theme-bg-secondary bg-opacity-75 w-screen h-screen ${
            showSidebar
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setShowSidebar(false)}
          role="presentation"
        />
        <div
          ref={sidebarRef}
          className="fixed inset-y-0 left-0 h-dvh w-[min(86vw,360px)] rounded-r-2xl border-r border-theme-modal-border bg-theme-bg-sidebar p-4 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label={t("sidebar.mobileNavigation")}
        >
          <div className="w-full h-full flex flex-col overflow-x-hidden justify-between">
            {/* Header Information */}
            <div className="flex w-full items-center justify-between gap-x-4">
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
            <div className="flex-1 flex flex-col w-full justify-between pt-4 min-h-0">
              <div className="h-auto md:sidebar-items">
                <div className=" flex flex-col gap-y-4 overflow-y-scroll no-scroll pb-[60px]">
                  <NewWorkspaceButton
                    user={user}
                    showNewWsModal={showNewWsModal}
                  />
                  <ActiveWorkspaces />
                </div>
              </div>
              <div className="z-[99] absolute bottom-0 left-0 right-0 pt-2 pb-6 rounded-br-[26px] bg-theme-bg-sidebar bg-opacity-80 backdrop-filter backdrop-blur-md">
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
        className="flex flex-grow w-[75%] h-10 gap-x-2 py-1.5 px-4 bg-white rounded-md text-zinc-900 justify-center items-center hover:bg-zinc-100 transition-colors duration-150 text-sm font-medium"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        <p className="text-sm font-medium">
          {t("new-workspace.title")}
        </p>
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
