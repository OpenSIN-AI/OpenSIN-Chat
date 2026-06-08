// SPDX-License-Identifier: MIT
import { createContext, useContext, useState, useEffect, useCallback } from "react";

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
 * Handles the slide-in/out transition only; each panel provides its own layout.
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {React.ReactNode} props.children
 */
export default function ChatSidebar({ isOpen, children }: any) {
  return (
    <div
      className={`h-full overflow-hidden transition-all duration-500 flex-shrink-0 ${
        isOpen ? "w-[366px]" : "w-0"
      }`}
    >
      {children}
    </div>
  );
}
