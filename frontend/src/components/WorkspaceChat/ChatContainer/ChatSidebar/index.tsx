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
      console.warn("[ChatSidebar] non-fatal error:", e?.message || e);
    }
  }, [sourceFilter]);

  function openSidebar(type: any, data: any = null) {
    setActiveSidebar(type);
    setSidebarData(data);
  }

  function closeSidebar() {
    setActiveSidebar(null);
    setSidebarData(null);
  }

  function toggleSidebar(type: any, data: any = null) {
    if (activeSidebar === type) closeSidebar();
    else openSidebar(type, data);
  }

  const openPreview = useCallback((data) => {
    setPreviewData(data);
    setActiveSidebar("preview");
  }, []);

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
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return defaultWidth;
    try {
      const stored = window.localStorage.getItem("opensin-right-sidebar-width");
      if (stored) {
        const n = Number(stored);
        if (!isNaN(n) && n >= minWidth && n <= maxWidth) return n;
      }
    } catch (e) {
      console.warn("[ChatSidebar] non-fatal error:", e?.message || e);
    }
    return defaultWidth;
  });
  const isResizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "opensin-right-sidebar-width",
          String(width),
        );
      } catch (e) {
        console.warn("[ChatSidebar] non-fatal error:", e?.message || e);
      }
    }
  }, [width]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizingRef.current) return;
      // Resize from left edge of right sidebar → drag left = wider, drag right = narrower
      const delta = resizeStartXRef.current - e.clientX;
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, resizeStartWidthRef.current + delta),
      );
      setWidth(newWidth);
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
  }, [minWidth, maxWidth]);

  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  // When opening, ensure the panel is at least minWidth (e.g. PDF analysis needs
  // more space than the default 366px).
  useEffect(() => {
    if (!isOpen) return;
    setWidth((w) => Math.max(w, minWidth));
  }, [isOpen, minWidth]);

  if (!isOpen) return null;

  return (
    <div
      className="relative h-full overflow-hidden flex flex-col flex-shrink-0 z-20"
      style={{ width: `${width}px` }}
    >
      {/* Resize handle on the LEFT edge so user can drag to widen the panel */}
      <div
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
        aria-label={t("common.resizeRightSidebar")}
        title={t("common.dragToResizeWidth")}
        className="absolute top-0 left-0 h-full w-3 cursor-col-resize z-50 group flex items-center justify-center hover:bg-blue-500/30 transition-colors"
      >
        <div className="w-1 h-16 bg-blue-400/50 group-hover:bg-blue-400 rounded-full transition-colors" />
      </div>
      {children}
    </div>
  );
}
