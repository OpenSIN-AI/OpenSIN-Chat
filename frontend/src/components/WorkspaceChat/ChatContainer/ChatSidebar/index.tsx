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

type LogLevel = "info" | "warn" | "error" | "success" | "debug";

type LogEntry = {
  level: LogLevel;
  message: string;
  timestamp: string;
};

export const LOG_EVENT = "openafd:log";

const ChatSidebarContext = createContext<any>(undefined);

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
  const [activeSidebar, setActiveSidebar] = useState(null);
  const [sidebarData, setSidebarData] = useState(null);

  const [sourceFilter, setSourceFilter] = useState(() => {
    try {
      return (
        localStorage.getItem("openafd_source_filter") || SOURCE_FILTERS.all
      );
    } catch {
      return SOURCE_FILTERS.all;
    }
  });

  // Preview panel state: { content, title, type, versions }
  const [previewData, setPreviewData] = useState(null);

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
      localStorage.setItem("openafd_source_filter", sourceFilter);
    } catch {}
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
        consoleLogs,
        clearConsoleLogs,
      }}
    >
      {children}
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
  if (!ctx)
    throw new Error(
      "useConsoleSidebar must be used within ChatSidebarProvider",
    );
  const {
    activeSidebar,
    toggleSidebar,
    closeSidebar,
    consoleLogs,
    clearConsoleLogs,
  } = ctx;
  return {
    sidebarOpen: activeSidebar === "console",
    toggleConsole: () => toggleSidebar("console"),
    closeSidebar,
    consoleLogs,
    clearConsoleLogs,
  };
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
export default function ChatSidebar({ isOpen, children }: any) {
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return 366;
    try {
      const stored = window.localStorage.getItem("openafd-right-sidebar-width");
      if (stored) {
        const n = Number(stored);
        if (!isNaN(n) && n >= 240 && n <= 800) return n;
      }
    } catch {}
    return 366;
  });
  const isResizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "openafd-right-sidebar-width",
          String(width),
        );
      } catch {}
    }
  }, [width]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizingRef.current) return;
      // Resize from left edge of right sidebar → drag left = wider, drag right = narrower
      const delta = resizeStartXRef.current - e.clientX;
      const newWidth = Math.min(
        800,
        Math.max(240, resizeStartWidthRef.current + delta),
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
  }, []);

  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  if (!isOpen) return null;

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      {/* Resize handle on the LEFT edge so user can drag to widen the panel */}
      <div
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Rechte Seitenleiste skalieren"
        title="Ziehen um die Breite zu ändern"
        className="absolute top-0 left-0 h-full w-[6px] cursor-col-resize z-50 group flex items-center justify-center hover:bg-blue-500/20 transition-colors"
      >
        <div className="w-[2px] h-12 bg-transparent group-hover:bg-blue-400 rounded-full transition-colors" />
      </div>
      {children}
    </div>
  );
}
