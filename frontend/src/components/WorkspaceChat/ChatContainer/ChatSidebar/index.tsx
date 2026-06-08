// SPDX-License-Identifier: MIT
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

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

  // Right sidebar (icon bar) open/close — like the left sidebar toggle
  const [rightSidebarOpen, setRightSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem("openafd_right_sidebar_open");
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

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

  useEffect(() => {
    try {
      localStorage.setItem("openafd_source_filter", sourceFilter);
    } catch {}
  }, [sourceFilter]);

  useEffect(() => {
    try {
      localStorage.setItem("openafd_right_sidebar_open", String(rightSidebarOpen));
    } catch {}
  }, [rightSidebarOpen]);

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

  function toggleRightSidebar() {
    if (rightSidebarOpen) {
      closeSidebar();
    }
    setRightSidebarOpen((prev: boolean) => !prev);
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
        rightSidebarOpen,
        toggleRightSidebar,
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
      {children}
    </ChatSidebarContext.Provider>
  );
}

export function useChatSidebar() {
  return useContext(ChatSidebarContext);
}

export function useSourcesSidebar() {
  const { activeSidebar, sidebarData, openSidebar, closeSidebar } =
    useContext(ChatSidebarContext);
  return {
    sidebarOpen: activeSidebar === "sources",
    sources: activeSidebar === "sources" ? sidebarData : [],
    openSidebar: (sources) => openSidebar("sources", sources),
    closeSidebar,
  };
}

export function useMemoriesSidebar() {
  const { activeSidebar, toggleSidebar, closeSidebar } =
    useContext(ChatSidebarContext);
  return {
    sidebarOpen: activeSidebar === "memories",
    toggleSidebar: () => toggleSidebar("memories"),
    closeSidebar,
  };
}

export function usePreviewSidebar() {
  const { activeSidebar, previewData, openPreview, closeSidebar, toggleSidebar } =
    useContext(ChatSidebarContext);
  return {
    sidebarOpen: activeSidebar === "preview",
    previewData,
    openPreview,
    closeSidebar,
    togglePreview: () => toggleSidebar("preview"),
  };
}

export function useConsoleSidebar() {
  const { activeSidebar, toggleSidebar, closeSidebar } =
    useContext(ChatSidebarContext);
  return {
    sidebarOpen: activeSidebar === "console",
    toggleConsole: () => toggleSidebar("console"),
    closeSidebar,
  };
}

export function useFilesystemSidebar() {
  const { activeSidebar, toggleSidebar, closeSidebar } =
    useContext(ChatSidebarContext);
  return {
    sidebarOpen: activeSidebar === "filesystem",
    toggleFilesystem: () => toggleSidebar("filesystem"),
    closeSidebar,
  };
}

export function useDatabaseSidebar() {
  const { activeSidebar, toggleSidebar, closeSidebar } =
    useContext(ChatSidebarContext);
  return {
    sidebarOpen: activeSidebar === "database",
    toggleDatabase: () => toggleSidebar("database"),
    closeSidebar,
  };
}

export function usePoliticalSidebar() {
  const { activeSidebar, toggleSidebar, closeSidebar } =
    useContext(ChatSidebarContext);
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
      const stored = window.localStorage.getItem(
        "openafd-right-sidebar-width"
      );
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
        window.localStorage.setItem("openafd-right-sidebar-width", String(width));
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
        Math.max(240, resizeStartWidthRef.current + delta)
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

  return (
    <div
      style={{ width: isOpen ? width : 0 }}
      className={`absolute top-0 right-full h-full overflow-hidden transition-[width] duration-500 pointer-events-none ${
        isOpen ? "pointer-events-auto" : ""
      }`}
    >
      {isOpen && (
        <div
          onMouseDown={handleResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Rechte Seitenleiste skalieren"
          title="Ziehen um die Breite zu ändern"
          className="absolute top-0 left-0 h-full w-[6px] cursor-col-resize z-50 group flex items-center justify-center hover:bg-blue-500/20 transition-colors"
          style={{ marginLeft: "-3px" }}
        >
          <div className="w-[2px] h-12 bg-transparent group-hover:bg-blue-400 rounded-full transition-colors" />
        </div>
      )}
      {children}
    </div>
  );
}
