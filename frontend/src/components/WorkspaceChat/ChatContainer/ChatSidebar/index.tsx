// SPDX-License-Identifier: MIT
/**
 * Purpose: React context provider for right sidebar panel state and helpers.
 * Docs: ChatSidebar/index.doc.md
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useSidebarToggle } from "@/components/Sidebar/SidebarToggle";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";

type LogLevel = "info" | "warn" | "error" | "success" | "debug";

type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
};

export const LOG_EVENT = "opensin:log";

export interface ChatSidebarContextValue {
  activeSidebar: string | null;
  sidebarData: any;
  openSidebar: (type: any, data?: any) => void;
  closeSidebar: () => void;
  toggleSidebar: (type: any, data?: any) => void;
  sourceFilter: string;
  setSourceFilter: (filter: string) => void;
  SOURCE_FILTERS: Record<string, string>;
  isDocumentSource: (chunkSource: string) => boolean;
  isMediaSource: (chunkSource: any) => boolean;
  previewData: any;
  setPreviewData: (data: any) => void;
  openPreview: (data: any) => void;
}

export interface ChatSidebarLogsContextValue {
  consoleLogs: LogEntry[];
  clearConsoleLogs: () => void;
}

const ChatSidebarContext = createContext<ChatSidebarContextValue | undefined>(
  undefined,
);
const ChatSidebarLogsContext = createContext<
  ChatSidebarLogsContextValue | undefined
>(undefined);

const SOURCE_FILTERS = {
  all: "all",
  documents: "documents",
  media: "media",
};

const DOCUMENT_SOURCE_PREFIXES = [
  "paperless-ngx://",
  "obsidian://",
  "confluence://",
  "drupalwiki://",
  "github://",
  "gitlab://",
];

const MEDIA_SOURCE_PREFIXES: any = ["youtube://"];

function isDocumentSource(chunkSource) {
  return (DOCUMENT_SOURCE_PREFIXES as any).some((prefix) =>
    chunkSource?.startsWith(prefix),
  );
}

function isMediaSource(chunkSource: any) {
  return (MEDIA_SOURCE_PREFIXES as any).some((prefix) =>
    chunkSource?.startsWith(prefix),
  );
}

export function ChatSidebarProvider({ children }: any) {
  const [activeSidebar, setActiveSidebar] = useState<string | null>(null);
  const [sidebarData, setSidebarData] = useState<any>(null);
  const leftSidebarRef = useRef<boolean | null>(null);
  const { showSidebar: leftSidebarOpen, setShowSidebar: setLeftSidebarOpen } =
    useSidebarToggle();

  const [sourceFilter, setSourceFilter] = useState(() => {
    try {
      return (
        localStorage.getItem("opensin_source_filter") || SOURCE_FILTERS.all
      );
    } catch {
      return SOURCE_FILTERS.all;
    }
  });

  // Preview panel state: { content, title, type, versions }
  const [previewData, setPreviewData] = useState<any>(null);

  // Persistent console logs — survive sidebar panel swaps
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([]);
  const clearConsoleLogs = useCallback(() => setConsoleLogs([]), []);

  // Workspace shell: coordinate left sidebar with right panel (handled via leftSidebarRef above)

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<LogEntry>).detail;
      setConsoleLogs((prev) => [...prev.slice(-499), detail]);
    }
    window.addEventListener(LOG_EVENT, handler as any);
    return () => window.removeEventListener(LOG_EVENT, handler as any);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("opensin_source_filter", sourceFilter);
    } catch (e) {
      console.warn("[index] non-fatal error:", e?.message || e);
    }
  }, [sourceFilter]);

  function openSidebar(type: any, data: any = null) {
    if (!activeSidebar) {
      leftSidebarRef.current = leftSidebarOpen;
      if (leftSidebarOpen) setLeftSidebarOpen(false);
    }
    setActiveSidebar(type);
    setSidebarData(data);
  }

  function closeSidebar() {
    setActiveSidebar(null);
    setSidebarData(null);
    if (leftSidebarRef.current) setLeftSidebarOpen(true);
    leftSidebarRef.current = null;
  }

  function toggleSidebar(type: any, data: any = null) {
    if (activeSidebar === type) closeSidebar();
    else openSidebar(type, data);
  }

  const openPreview = useCallback(
    (data) => {
      setPreviewData(data);
      if (!activeSidebar) {
        leftSidebarRef.current = leftSidebarOpen;
        if (leftSidebarOpen) setLeftSidebarOpen(false);
      }
      setActiveSidebar("preview");
    },
    [activeSidebar, leftSidebarOpen, setLeftSidebarOpen],
  );

  // Escape key closes the active right panel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && activeSidebar) {
        const target = e.target as HTMLElement;
        if (target?.matches("input, textarea, [contenteditable='true']"))
          return;
        e.preventDefault();
        closeSidebar();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSidebar, closeSidebar]);

  return (
    <ChatSidebarContext.Provider
      value={{
        activeSidebar,
        sidebarData,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        sourceFilter,
        setSourceFilter,
        SOURCE_FILTERS,
        isDocumentSource,
        isMediaSource,
        previewData,
        setPreviewData,
        openPreview,
      }}
    >
      <ChatSidebarLogsContext.Provider
        value={{ consoleLogs, clearConsoleLogs }}
      >
        {children}
      </ChatSidebarLogsContext.Provider>
    </ChatSidebarContext.Provider>
  );
}

export function useChatSidebar() {
  const ctx = useContext(ChatSidebarContext);
  if (!ctx)
    throw new Error("useChatSidebar must be used within ChatSidebarProvider");
  return ctx;
}

export function useSourcesSidebar() {
  const ctx = useContext(ChatSidebarContext);
  if (!ctx)
    throw new Error(
      "useSourcesSidebar must be used within ChatSidebarProvider",
    );
  const { activeSidebar, sidebarData, openSidebar, closeSidebar } = ctx;
  return {
    sidebarOpen: activeSidebar === "sources",
    sources: activeSidebar === "sources" ? sidebarData || [] : [],
    openSidebar: (sources) => openSidebar("sources", sources),
    closeSidebar,
  };
}

export function useMemoriesSidebar() {
  const ctx = useContext(ChatSidebarContext);
  if (!ctx)
    throw new Error(
      "useMemoriesSidebar must be used within ChatSidebarProvider",
    );
  const { activeSidebar, toggleSidebar, closeSidebar } = ctx;
  return {
    sidebarOpen: activeSidebar === "memories",
    toggleSidebar: () => toggleSidebar("memories"),
    closeSidebar,
  };
}

export function usePreviewSidebar() {
  const ctx = useContext(ChatSidebarContext);
  if (!ctx)
    throw new Error(
      "usePreviewSidebar must be used within ChatSidebarProvider",
    );
  const {
    activeSidebar,
    previewData,
    openPreview,
    closeSidebar,
    toggleSidebar,
  } = ctx;
  return {
    sidebarOpen: activeSidebar === "preview",
    previewData,
    openPreview,
    closeSidebar,
    togglePreview: () => toggleSidebar("preview"),
  };
}

export function useConsoleSidebar() {
  const ctx = useContext(ChatSidebarContext);
  const logsCtx = useContext(ChatSidebarLogsContext);
  if (!ctx)
    throw new Error(
      "useConsoleSidebar must be used within ChatSidebarProvider",
    );
  const { activeSidebar, toggleSidebar, closeSidebar } = ctx;
  const { consoleLogs, clearConsoleLogs } =
    logsCtx as ChatSidebarLogsContextValue;
  return {
    sidebarOpen: activeSidebar === "console",
    toggleConsole: () => toggleSidebar("console"),
    closeSidebar,
    consoleLogs,
    clearConsoleLogs,
  };
}

export function useChatSidebarLogs() {
  const ctx = useContext(ChatSidebarLogsContext);
  if (!ctx)
    throw new Error(
      "useChatSidebarLogs must be used within ChatSidebarProvider",
    );
  return ctx;
}

export function useFilesystemSidebar() {
  const ctx = useContext(ChatSidebarContext);
  if (!ctx)
    throw new Error(
      "useFilesystemSidebar must be used within ChatSidebarProvider",
    );
  const { activeSidebar, toggleSidebar, closeSidebar } = ctx;
  return {
    sidebarOpen: activeSidebar === "filesystem",
    toggleFilesystem: () => toggleSidebar("filesystem"),
    closeSidebar,
  };
}

export function useDatabaseSidebar() {
  const ctx = useContext(ChatSidebarContext);
  if (!ctx)
    throw new Error(
      "useDatabaseSidebar must be used within ChatSidebarProvider",
    );
  const { activeSidebar, toggleSidebar, closeSidebar } = ctx;
  return {
    sidebarOpen: activeSidebar === "database",
    toggleDatabase: () => toggleSidebar("database"),
    closeSidebar,
  };
}

export function usePoliticalSidebar() {
  const ctx = useContext(ChatSidebarContext);
  if (!ctx)
    throw new Error(
      "usePoliticalSidebar must be used within ChatSidebarProvider",
    );
  const { activeSidebar, toggleSidebar, closeSidebar } = ctx;
  return {
    sidebarOpen: activeSidebar === "political",
    togglePolitical: () => toggleSidebar("political"),
    closeSidebar,
  };
}

/**
 * Reusable animation wrapper for right-side chat panels.
 * Renders as an absolutely-positioned panel to the left of the icon bar
 * so it never shifts the flex layout. Drag the left edge to resize.
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {React.ReactNode} props.children
 */
export default function ChatSidebar({
  isOpen,
  children,
  minWidth = 240,
  maxWidth = 800,
  defaultWidth = Math.max(366, minWidth),
}: any) {
  const { t } = useTranslation();
  const isMobile = useIsMobileLayout();
  const [rendered, setRendered] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return defaultWidth;
    try {
      const stored = window.localStorage.getItem("opensin-right-sidebar-width");
      if (stored) {
        const n = Number(stored);
        if (!isNaN(n) && n >= minWidth && n <= maxWidth) return n;
      }
    } catch (e) {
      console.warn("[index] non-fatal error:", e?.message || e);
    }
    return defaultWidth;
  });
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const clampWidth = useCallback(
    (nextWidth: number) => {
      const viewportLimit =
        typeof window === "undefined"
          ? maxWidth
          : Math.max(minWidth, window.innerWidth - 420);
      return Math.min(maxWidth, viewportLimit, Math.max(minWidth, nextWidth));
    },
    [maxWidth, minWidth],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "opensin-right-sidebar-width",
          String(width),
        );
      } catch (e) {
        console.warn("[index] non-fatal error:", e?.message || e);
      }
    }
  }, [width]);

  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      if (!isResizingRef.current) return;
      const nextWidth =
        resizeStartWidthRef.current + resizeStartXRef.current - e.clientX;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        setWidth(clampWidth(nextWidth));
        frameRef.current = null;
      });
    }
    function handlePointerUp() {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    function handleViewportResize() {
      setWidth((current) => clampWidth(current));
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("resize", handleViewportResize);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("resize", handleViewportResize);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [clampWidth]);

  function handleResizeStart(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  // When opening, ensure the panel is at least minWidth (e.g. PDF analysis needs
  // more space than the default 366px).
  useEffect(() => {
    if (!isOpen) return;
    setWidth((current) => clampWidth(current));
  }, [clampWidth, isOpen]);

  useEffect(() => {
    let timer: number | undefined;
    if (isOpen) {
      setRendered(true);
      timer = window.setTimeout(() => setVisible(true), 0);
    } else {
      setVisible(false);
      timer = window.setTimeout(() => setRendered(false), 220);
    }
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [isOpen]);

  if (!rendered) return null;

  return (
    <div
      className={`relative z-20 flex h-full shrink-0 flex-col overflow-hidden bg-theme-bg-sidebar ${isResizing ? "" : "transition-[width] duration-200 ease-out"}`}
      style={{
        width:
          isMobile && isOpen && visible
            ? "100%"
            : !isMobile && isOpen && visible
              ? `${width}px`
              : "0px",
        containerType: "inline-size",
      }}
    >
      <div
        onPointerDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-valuenow={Math.round(width)}
        aria-label={t("common.resizeRightSidebar")}
        title={t("common.dragToResizeWidth")}
        className="group absolute left-0 top-0 z-50 hidden h-full w-5 touch-none cursor-col-resize items-center justify-center md:flex"
      >
        <div
          className={`h-16 w-0.5 rounded-full transition-colors ${isResizing ? "bg-blue-400" : "bg-theme-modal-border group-hover:bg-blue-400"}`}
        />
      </div>
      {isResizing && (
        <output className="pointer-events-none absolute left-4 top-3 z-50 rounded-md border border-theme-modal-border bg-theme-bg-primary px-2 py-1 text-[10px] font-medium text-theme-text-secondary shadow-sm">
          {Math.round(width)} px
        </output>
      )}
      {children}
    </div>
  );
}
