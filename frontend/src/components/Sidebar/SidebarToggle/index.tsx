// SPDX-License-Identifier: MIT
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useLocation } from "react-router-dom";
import { Tooltip } from "react-tooltip";
import { SidebarSimple } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { useTranslation } from "react-i18next";
import paths from "@/utils/paths";
import { safeGetItem, safeSetItem } from "@/utils/safeStorage";

const SIDEBAR_TOGGLE_STORAGE_KEY = "opensin_sidebar_toggle";
export const SIDEBAR_TOGGLE_EVENT = "sidebar-toggle";

function previousSidebarState() {
  const previousState = safeGetItem(SIDEBAR_TOGGLE_STORAGE_KEY);
  if (previousState === "closed") return false;
  return true;
}

interface SidebarToggleContextValue {
  showSidebar: boolean;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  canToggleSidebar: boolean;
  previousLeftSidebarOpen: boolean | null;
  collapseForRightPanel: () => void;
  restoreFromRightPanel: () => void;
}

const SidebarToggleContext = createContext<SidebarToggleContextValue>({
  showSidebar: true,
  setShowSidebar: () => {},
  canToggleSidebar: true,
  previousLeftSidebarOpen: null,
  collapseForRightPanel: () => {},
  restoreFromRightPanel: () => {},
});

export function SidebarToggleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSidebar, setShowSidebar] = useState(() => previousSidebarState());
  const [canToggleSidebar, setCanToggleSidebar] = useState(true);
  const [previousLeftSidebarOpen, setPreviousLeftSidebarOpen] = useState<
    boolean | null
  >(null);
  const { pathname } = useLocation();

  const collapseForRightPanel = useCallback(() => {
    setPreviousLeftSidebarOpen((prev) => {
      if (prev !== null) return prev;
      return showSidebar;
    });
    setShowSidebar(false);
  }, [showSidebar]);

  const restoreFromRightPanel = useCallback(() => {
    setPreviousLeftSidebarOpen((prev) => {
      if (prev !== null) {
        setShowSidebar(prev);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    function checkPath() {
      const currentPath = pathname;
      const isVisible =
        currentPath === paths.home() ||
        /^\/workspace\/[^\/]+$/.test(currentPath) ||
        /^\/workspace\/[^\/]+\/t\/[^\/]+$/.test(currentPath) ||
        currentPath === paths.pdfAnalysis();
      setCanToggleSidebar(isVisible);
    }
    checkPath();
  }, [pathname]);

  useEffect(() => {
    function toggleSidebar(e: any) {
      if (!canToggleSidebar) return;
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "s"
      ) {
        e.preventDefault();
        setShowSidebar((prev) => {
          const newState = !prev;
          safeSetItem(SIDEBAR_TOGGLE_STORAGE_KEY, newState ? "open" : "closed");
          return newState;
        });
      }
    }
    window.addEventListener("keydown", toggleSidebar);
    return () => {
      window.removeEventListener("keydown", toggleSidebar);
    };
  }, [canToggleSidebar]);

  useEffect(() => {
    safeSetItem(SIDEBAR_TOGGLE_STORAGE_KEY, showSidebar ? "open" : "closed");
    window.dispatchEvent(
      new CustomEvent(SIDEBAR_TOGGLE_EVENT, {
        detail: { open: showSidebar },
      }),
    );
  }, [showSidebar]);

  const value = useMemo(
    () => ({
      showSidebar,
      setShowSidebar,
      canToggleSidebar,
      previousLeftSidebarOpen,
      collapseForRightPanel,
      restoreFromRightPanel,
    }),
    [
      showSidebar,
      canToggleSidebar,
      previousLeftSidebarOpen,
      collapseForRightPanel,
      restoreFromRightPanel,
    ],
  );

  return (
    <SidebarToggleContext.Provider value={value}>
      {children}
    </SidebarToggleContext.Provider>
  );
}

export function useSidebarToggle() {
  return useContext(SidebarToggleContext);
}

export function ToggleSidebarButton({ showSidebar, setShowSidebar }: any) {
  const { t } = useTranslation();
  const isMac = navigator.userAgent.includes("Mac");
  const shortcut = isMac ? "⌘ + Shift + S" : "Ctrl + Shift + S";

  const hideLabel = t("sidebar.hideSidebarShortcut", { shortcut });
  const showLabel = t("sidebar.showSidebarShortcut", { shortcut });

  return (
    <>
      <button
        type="button"
        className={`hidden md:block border-none bg-transparent outline-none ring-0 absolute transition-all duration-500 z-10 ${showSidebar ? "top-[18px] left-[248px]" : "top-[20px] left-[30px]"}`}
        onClick={() => setShowSidebar((prev: boolean) => !prev)}
        data-tooltip-id="sidebar-toggle"
        data-tooltip-content={showSidebar ? hideLabel : showLabel}
        aria-label={showSidebar ? hideLabel : showLabel}
      >
        <SidebarSimple
          className="text-theme-text-secondary hover:text-theme-text-primary"
          size={24}
        />
      </button>
      <Tooltip
        id="sidebar-toggle"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-[99]"
      />
    </>
  );
}
