// SPDX-License-Identifier: MIT
import React, { useEffect, useRef, useState } from "react";
import { List, Plus, SidebarSimple } from "@phosphor-icons/react";
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
import { useTranslation } from "react-i18next";
import { useSidebarToggle } from "./SidebarToggle";
import SearchBox from "./SearchBox";
import { Tooltip } from "react-tooltip";
import { createPortal } from "react-dom";

const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_DEFAULT_WIDTH = 292;
const SIDEBAR_WIDTH_STORAGE_KEY = "openafd-sidebar-width";

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
    const stored = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
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
      window.localStorage.setItem(
        SIDEBAR_WIDTH_STORAGE_KEY,
        String(sidebarWidth),
      );
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
        className="relative transition-all duration-500 flex-shrink-0 z-40 bg-zinc-950 light:bg-slate-50"
      >
        <div className="overflow-hidden h-full">
          <div className="flex shrink-0 w-full items-center justify-between gap-x-2 my-[18px] px-[16px]">
            <Link
              to={paths.home()}
              aria-label={t("sidebar.home")}
              className="flex items-center gap-x-2.5 overflow-hidden flex-shrink min-w-0"
            >
              <img
                src={logo}
                alt={t("sidebar.logo")}
                className="h-9 w-9 max-h-[36px] max-w-[36px] object-contain flex-shrink-0"
              />
              <span className="text-white font-bold text-lg whitespace-nowrap">
                OpenSIN
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setShowSidebar((prev) => !prev)}
              data-tooltip-id="sidebar-header-toggle"
              data-tooltip-content={
                showSidebar ? "Sidebar ausblenden" : "Sidebar einblenden"
              }
              aria-label={
                showSidebar ? "Sidebar ausblenden" : "Sidebar einblenden"
              }
              className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all bg-transparent hover:bg-zinc-700 light:hover:bg-slate-200 text-white flex-shrink-0"
            >
              <SidebarSimple
                size={18}
                weight={showSidebar ? "fill" : "regular"}
              />
            </button>
            <Tooltip
              id="sidebar-header-toggle"
              place="bottom"
              delayShow={300}
              className="tooltip !text-xs z-99"
            />
          </div>
          <div
            ref={sidebarRef}
            style={{ "--sidebar-inner-width": `${sidebarWidth - 32}px` }}
            className="w-[var(--sidebar-inner-width)] relative m-[16px] rounded-[16px] bg-theme-bg-sidebar light:bg-slate-200 border-[2px] border-theme-sidebar-border light:border-none p-[10px] h-[calc(100%-76px)]"
          >
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-grow flex flex-col min-h-0">
                <div
                  className="min-w-[var(--sidebar-scroll-min-width)] relative h-[calc(100%-60px)] flex flex-col w-full justify-between pt-[10px] overflow-y-scroll no-scroll"
                  style={{
                    "--sidebar-scroll-min-width": `${sidebarWidth - 64}px`,
                  }}
                >
                  <div className="flex flex-col gap-y-[14px]">
                    <SearchBox user={user} showNewWsModal={showNewWsModal} />
                    <ActiveWorkspaces />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 pb-3 rounded-b-[16px] bg-theme-bg-sidebar light:bg-slate-200 bg-opacity-80 backdrop-filter backdrop-blur-md z-10">
                  <Footer />
                </div>
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
            className="absolute top-0 right-0 h-full w-[6px] cursor-col-resize z-50 group flex items-center justify-center hover:bg-blue-500/20 transition-colors -mr-[3px]"
          >
            <div className="w-[2px] h-12 bg-transparent group-hover:bg-blue-400 rounded-full transition-colors" />
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
  const [showBgOverlay, setShowBgOverlay] = useState(false);
  const {
    showing: showingNewWsModal,
    showModal: showNewWsModal,
    hideModal: hideNewWsModal,
  } = useNewWorkspaceModal();
  const { user } = useUser();
  const { t } = useTranslation();

  useEffect(() => {
    // Darkens the rest of the screen
    // when sidebar is open.
    function handleBg() {
      if (showSidebar) {
        setTimeout(() => {
          setShowBgOverlay(true);
        }, 300);
      } else {
        setShowBgOverlay(false);
      }
    }
    handleBg();
  }, [showSidebar]);

  return (
    <>
      <header
        aria-label={t("sidebar.topNavigationMobile")}
        className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-2 bg-theme-bg-sidebar light:bg-white text-slate-200 shadow-lg h-16"
      >
        <button
          onClick={() => setShowSidebar(true)}
          className="rounded-md p-2 flex items-center justify-center text-theme-text-secondary hover:bg-white/10 transition-colors"
          aria-label={t("sidebar.openSidebar")}
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
          <span className="text-white font-bold text-base">OpenSIN</span>
        </div>
        <div className="w-12"></div>
      </header>
      <div
        className={`z-99 fixed top-0 left-0 transition-all duration-500 w-[100vw] h-[100vh] ${
          showSidebar ? "translate-x-0" : "-translate-x-[100vw]"
        }`}
      >
        <div
          className={`${
            showBgOverlay
              ? "transition-all opacity-1 pointer-events-auto"
              : "transition-none opacity-0 pointer-events-none"
          }  duration-500 fixed top-0 left-0 bg-theme-bg-secondary bg-opacity-75 w-screen h-screen`}
          onClick={() => setShowSidebar(false)}
          role="presentation"
        />
        <div
          ref={sidebarRef}
          className="relative h-[100vh] fixed top-0 left-0  rounded-r-[26px] bg-theme-bg-sidebar w-[80%] p-[18px]"
          role="navigation"
          aria-label={t("sidebar.mobileNavigation")}
        >
          <div className="w-full h-full flex flex-col overflow-x-hidden items-between">
            {/* Header Information */}
            <div className="flex w-full items-center justify-between gap-x-4">
              <div className="flex shrink-1 w-fit items-center justify-start gap-x-2">
                <img
                  src={logo}
                  alt={t("sidebar.logo")}
                  className="w-8 h-8 max-h-[32px] max-w-[32px] object-contain"
                />
                <span className="text-white font-bold text-base">OpenSIN</span>
              </div>
              {(!user || user?.role !== "default") && (
                <div className="flex gap-x-2 items-center text-slate-500 shink-0">
                  <SettingsButton />
                </div>
              )}
            </div>

            {/* Primary Body */}
            <div className="h-full flex flex-col w-full justify-between pt-4 ">
              <div className="h-auto md:sidebar-items">
                <div className=" flex flex-col gap-y-4 overflow-y-scroll no-scroll pb-[60px]">
                  <NewWorkspaceButton
                    user={user}
                    showNewWsModal={showNewWsModal}
                  />
                  <ActiveWorkspaces />
                </div>
              </div>
              <div className="z-99 absolute bottom-0 left-0 right-0 pt-2 pb-6 rounded-br-[26px] bg-theme-bg-sidebar bg-opacity-80 backdrop-filter backdrop-blur-md">
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
        onClick={showNewWsModal}
        className="flex flex-grow w-[75%] h-[44px] gap-x-2 py-[5px] px-4 bg-white rounded-lg text-sidebar justify-center items-center hover:bg-opacity-80 transition-all duration-300"
      >
        <Plus className="h-5 w-5" />
        <p className="text-sidebar text-sm font-semibold">
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
        className="tooltip !text-xs z-99"
      />
      <Tooltip
        id="workspace-thread-name"
        place="right"
        delayShow={800}
        className="tooltip !text-xs z-99"
      />
      <Tooltip
        id="upload-workspace"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
      <Tooltip
        id="gear-workspace"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </React.Fragment>,
    document.body,
  );
}
