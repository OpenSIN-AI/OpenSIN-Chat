// SPDX-License-Identifier: MIT
import { useState, useEffect } from "react";
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

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-6 px-2.5 rounded-full border-none cursor-pointer text-[11px] font-medium transition-colors ${
        active
          ? "bg-theme-bg-tertiary text-theme-text-primary"
          : "bg-transparent text-theme-text-muted hover:bg-theme-bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}

export default function SourcesSidebar({ workspace }: any) {
  const { sources, sidebarOpen, closeSidebar } = useSourcesSidebar();
  const { t } = useTranslation();
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const {
    sourceFilter,
    setSourceFilter,
    SOURCE_FILTERS,
    isDocumentSource,
    isMediaSource,
  } = useChatSidebar();

  const combined = combineLikeSources(sources);

  const filteredChatSources = (combined as any).filter((source) => {
    const chunkSource = source.chunks?.[0]?.chunkSource;
    if (sourceFilter === "documents") return isDocumentSource(chunkSource);
    if (sourceFilter === "media") return isMediaSource(chunkSource);
    return true;
  });
  const hasChatSources = filteredChatSources.length > 0;
  const hasAnySources = (combined as any).length > 0;

  const [tab, setTab] = useState<SourcesTab>(
    hasAnySources ? "zitiert" : "dateien",
  );

  // When a new answer arrives with sources, surface the Zitiert tab so the
  // user immediately sees what was cited (was previously only set on mount).
  useEffect(() => {
    if (sidebarOpen && hasAnySources) {
      setTab("zitiert");
    }
  }, [sidebarOpen, hasAnySources, sources]);

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
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-theme-text-muted mr-1">
                  {t("chat_window.source_filter_label")}
                </span>
                <FilterChip
                  label={t("chat_window.source_filter_all")}
                  active={sourceFilter === SOURCE_FILTERS.all}
                  onClick={() => setSourceFilter(SOURCE_FILTERS.all)}
                />
                <FilterChip
                  label={t("chat_window.source_filter_documents")}
                  active={sourceFilter === SOURCE_FILTERS.documents}
                  onClick={() => setSourceFilter(SOURCE_FILTERS.documents)}
                />
                <FilterChip
                  label={t("chat_window.source_filter_media")}
                  active={sourceFilter === SOURCE_FILTERS.media}
                  onClick={() => setSourceFilter(SOURCE_FILTERS.media)}
                />
              </div>
              {!hasChatSources ? (
                <p className="text-sm text-zinc-400 light:text-slate-500 text-center py-4">
                  {hasAnySources
                    ? t("chat_window.no_sources_filter", {
                        filter: t(`chat_window.source_filter_${sourceFilter}`),
                      })
                    : t(
                        "chat_window.no_cited_sources",
                        "Noch keine Zitationen — stelle eine Frage zu deinen Quellen.",
                      )}
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
          workspaceSlug={workspace?.slug}
        />
      )}
    </MemoriesProvider>
  );
}
