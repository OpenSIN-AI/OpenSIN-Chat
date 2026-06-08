// SPDX-License-Identifier: MIT
import { useState } from "react";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { X, Globe, FileText, Database } from "@phosphor-icons/react";
import {
  combineLikeSources,
  CitationDetailModal,
} from "../ChatHistory/Citation";
import MobileCitationModal from "./MobileCitationModal";
import SourceItem from "./SourceItem";
import ChatSidebar, { useSourcesSidebar, useChatSidebar } from "../ChatSidebar";
import SidebarTabs from "../ChatSidebar/SidebarTabs";
import { MemoriesProvider } from "../MemoriesSidebar/MemoriesContext";

// Re-export for backward compat with existing imports
export { useSourcesSidebar } from "../ChatSidebar";

function getWorkspaceSourceType(doc: any) {
  const metadata = doc.metadata ? JSON.parse(doc.metadata) : {};
  const docpath = doc.docpath || "";
  const filename = doc.filename || "";

  // URL/Link detection
  if (
    metadata?.url ||
    metadata?.sourceUrl ||
    docpath.includes("link") ||
    filename.startsWith("http")
  ) {
    return { type: "url", icon: Globe, label: "URL" };
  }

  // Database/API detection (heuristic based on common patterns)
  if (
    docpath.includes("api") ||
    docpath.includes("db") ||
    docpath.includes("connector") ||
    metadata?.connectionString ||
    metadata?.apiEndpoint
  ) {
    return { type: "db", icon: Database, label: "Datenbank" };
  }

  // Default: document
  return { type: "document", icon: FileText, label: "Dokument" };
}

function WorkspaceSourceItem({ doc, onClick }: any) {
  const { type: _type, icon: Icon, label } = getWorkspaceSourceType(doc);
  const metadata = doc.metadata ? JSON.parse(doc.metadata) : {};

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-[2px] items-start w-full text-left hover:opacity-75 transition-opacity"
    >
      <div className="flex gap-[6px] items-start w-full">
        <div className="w-4 h-4 rounded-full bg-zinc-700 light:bg-slate-200 flex items-center justify-center flex-shrink-0">
          <Icon size={10} className="text-white light:text-slate-800" />
        </div>
        <p className="flex-1 font-medium text-sm text-white light:text-slate-900 leading-[15px] truncate">
          {metadata?.title || doc.filename || doc.docId}
        </p>
      </div>
      <div className="flex flex-col gap-[2px] pl-[22px] text-[10px] text-zinc-400 light:text-slate-500 leading-[14px]">
        <p>{label}</p>
        {metadata?.wordCount && <p>{metadata.wordCount} Wörter</p>}
      </div>
    </button>
  );
}

export default function SourcesSidebar({ workspace }: any) {
  const { sources, sidebarOpen, closeSidebar } = useSourcesSidebar();
  const { t } = useTranslation();
  const [selectedSource, setSelectedSource] = useState(null);
  const { sourceFilter, isDocumentSource, isMediaSource } = useChatSidebar();

  const combined = combineLikeSources(sources);

  // Filter chat sources based on active filter
  const filteredChatSources = (combined as any).filter((source) => {
    const chunkSource = source.chunks?.[0]?.chunkSource;
    if (sourceFilter === "documents") return isDocumentSource(chunkSource);
    if (sourceFilter === "media") return isMediaSource(chunkSource);
    return true; // "all"
  });

  // Convert workspace documents to display format
  const workspaceDocs = workspace?.documents || [];
  const filteredWorkspaceDocs = (workspaceDocs as any).filter((doc) => {
    const typeInfo = getWorkspaceSourceType(doc);
    if (sourceFilter === "documents") return typeInfo.type === "document";
    if (sourceFilter === "media") return typeInfo.type === "url"; // URLs are "media" in this context
    return true; // "all"
  });

  const hasChatSources = filteredChatSources.length > 0;
  const displaySources = hasChatSources
    ? filteredChatSources
    : filteredWorkspaceDocs;
  const isWorkspaceMode = !hasChatSources;

  if (isMobile) {
    return (
      <MobileCitationModal
        sources={sources}
        isOpen={sidebarOpen}
        selectedSource={selectedSource}
        setSelectedSource={setSelectedSource}
        onClose={() => {
          setSelectedSource(null);
          closeSidebar();
        }}
      />
    );
  }

  return (
    <MemoriesProvider workspace={workspace}>
      <ChatSidebar isOpen={sidebarOpen}>
        <div
          className="ml-4 w-[350px] bg-zinc-900 light:bg-white light:border-2 light:border-slate-300 md:rounded-[16px] p-4 flex flex-col gap-4 overflow-hidden mt-[72px]"
          style={{ maxHeight: "calc(100% - 88px)" }}
        >
          <div className="flex flex-col shrink-0 gap-2">
            <div className="flex items-start justify-between">
              <p className="font-medium text-base leading-6 text-white light:text-slate-900">
                {isWorkspaceMode
                  ? t("chat_window.workspace_sources")
                  : t("chat_window.sources")}
              </p>
              <button
                onClick={closeSidebar}
                type="button"
                className="text-white/60 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={16} weight="bold" />
              </button>
            </div>
            <SidebarTabs />
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto no-scroll">
            {displaySources.length === 0 ? (
              <p className="text-sm text-zinc-400 light:text-slate-500 text-center py-4">
                {isWorkspaceMode
                  ? t("chat_window.no_workspace_sources")
                  : t("chat_window.no_sources_filter", {
                      filter: t(`chat_window.source_filter_${sourceFilter}`),
                    })}
              </p>
            ) : (
              (displaySources as any).map((source, idx) =>
                isWorkspaceMode ? (
                  <WorkspaceSourceItem
                    key={source.docId || idx}
                    doc={source}
                    onClick={() => {}}
                  />
                ) : (
                  <SourceItem
                    key={source.title || idx}
                    source={source}
                    onClick={() => setSelectedSource(source)}
                  />
                ),
              )
            )}
          </div>
        </div>
      </ChatSidebar>
      {selectedSource && !isWorkspaceMode && (
        <CitationDetailModal
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </MemoriesProvider>
  );
}
