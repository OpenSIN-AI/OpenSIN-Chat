// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import { useTranslation } from "react-i18next";
import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Quotes } from "@phosphor-icons/react/dist/csr/Quotes";
import { Brain } from "@phosphor-icons/react/dist/csr/Brain";
import { ChatCircleText } from "@phosphor-icons/react/dist/csr/ChatCircleText";
import {
  combineLikeSources,
  CitationDetailModal,
} from "../ChatHistory/Citation";
import MobileCitationModal from "./MobileCitationModal";
import SourceItem from "./SourceItem";
import ChatSidebar, { useSourcesSidebar, useChatSidebar } from "../ChatSidebar";
import { MemoriesProvider } from "../MemoriesSidebar/MemoriesContext";
import {
  MemoriesTabBody,
  MemoryModalWrapper,
  WorkspaceChatsTab,
  WorkspaceUrlsTab,
} from "../MemoriesSidebar";
import { FilesystemPanelBody } from "../FilesystemSidebar";
import { PanelHeader } from "@/components/ui/PanelHeader";

// Re-export for backward compat with existing imports
export { useSourcesSidebar } from "../ChatSidebar";

type SourcesTab = "dateien" | "zitiert" | "erinnerungen" | "chats" | "urls";

function TabButton({ id, label, icon: Icon, activeTab, onSelect }: any) {
  const isActive = activeTab === id;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={isActive}
      aria-label={label}
      className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium transition-colors whitespace-nowrap ${
        isActive
          ? "bg-theme-bg-tertiary text-theme-text-primary"
          : "bg-transparent hover:bg-theme-bg-secondary text-theme-text-muted"
      }`}
    >
      {Icon && <Icon size={12} weight="bold" />}
      <span>{label}</span>
    </button>
  );
}

export default function SourcesSidebar({ workspace }: any) {
  const { sources, sidebarOpen, closeSidebar } = useSourcesSidebar();
  const { t } = useTranslation();
  const isMobile = useIsMobileLayout();
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const { sourceFilter, isDocumentSource, isMediaSource } = useChatSidebar();

  const combined = combineLikeSources(sources);

  // Filter chat sources based on active filter
  const filteredChatSources = (combined as any).filter((source) => {
    const chunkSource = source.chunks?.[0]?.chunkSource;
    if (sourceFilter === "documents") return isDocumentSource(chunkSource);
    if (sourceFilter === "media") return isMediaSource(chunkSource);
    return true; // "all"
  });
  const hasChatSources = filteredChatSources.length > 0;

  // Default to the cited answer sources when present, otherwise the file
  // manager (Dateien) so the panel always opens on something useful.
  const [tab, setTab] = useState<SourcesTab>(
    hasChatSources ? "zitiert" : "dateien",
  );

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

  const tabs: { id: SourcesTab; label: string; icon: any }[] = [
    {
      id: "dateien",
      label: t("chat_window.sources_tabs.files", "Dateien"),
      icon: FolderOpen,
    },
    {
      id: "zitiert",
      label: t("chat_window.sources_tabs.cited", "Zitiert"),
      icon: Quotes,
    },
    {
      id: "erinnerungen",
      label: t("chat_window.memories.title", "Erinnerungen"),
      icon: Brain,
    },
    {
      id: "chats",
      label: t("chat_window.chats_tab", "Chats"),
      icon: ChatCircleText,
    },
    { id: "urls", label: t("chat_window.urls_tab", "URLs"), icon: Globe },
  ];

  return (
    <MemoriesProvider workspace={workspace} forceOpen={sidebarOpen}>
      <ChatSidebar isOpen={sidebarOpen}>
        <div className="w-full h-full bg-theme-bg-sidebar flex flex-col overflow-hidden">
          {/* Header + tab strip live in the padded shell; the Dateien tab
              renders its own full-bleed body, so its container is unpadded. */}
          <div className="px-4 pt-4 flex flex-col gap-3 shrink-0">
            <PanelHeader
              title={t("chat_window.sources", "Quellen")}
              onClose={closeSidebar}
            />
            <div className="flex items-center gap-1 flex-wrap">
              {tabs.map((tb) => (
                <TabButton
                  key={tb.id}
                  id={tb.id}
                  label={tb.label}
                  icon={tb.icon}
                  activeTab={tab}
                  onSelect={setTab}
                />
              ))}
            </div>
          </div>

          {/* Tab bodies */}
          {tab === "dateien" && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <FilesystemPanelBody
                workspace={workspace}
                onClose={closeSidebar}
                active={tab === "dateien"}
              />
            </div>
          )}

          {tab === "zitiert" && (
            <div className="flex-1 min-h-0 overflow-y-auto no-scroll px-4 py-3 flex flex-col gap-3">
              {!hasChatSources ? (
                <p className="text-sm text-zinc-400 light:text-slate-500 text-center py-4">
                  {t("chat_window.no_sources_filter", {
                    filter: t(`chat_window.source_filter_${sourceFilter}`),
                  })}
                </p>
              ) : (
                (filteredChatSources as any).map((source, idx) => (
                  <SourceItem
                    key={source.title || idx}
                    source={source}
                    onClick={() => setSelectedSource(source)}
                  />
                ))
              )}
            </div>
          )}

          {tab === "erinnerungen" && (
            <div className="flex-1 min-h-0 overflow-y-auto no-scroll px-4 py-3 flex flex-col gap-3">
              <MemoriesTabBody />
            </div>
          )}

          {tab === "chats" && (
            <div className="flex-1 min-h-0 overflow-y-auto no-scroll px-4 py-3">
              <WorkspaceChatsTab workspace={workspace} onClose={closeSidebar} />
            </div>
          )}

          {tab === "urls" && (
            <div className="flex-1 min-h-0 overflow-y-auto no-scroll px-4 py-3">
              <WorkspaceUrlsTab workspace={workspace} />
            </div>
          )}
        </div>
      </ChatSidebar>
      <MemoryModalWrapper />
      {selectedSource && (
        <CitationDetailModal
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </MemoriesProvider>
  );
}
