// SPDX-License-Identifier: MIT
/**
 * Purpose: Render the right-sidebar source list for chat citations and workspace documents.
 * Docs: index.doc.md
 */
import logger from "@/utils/logger";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import { useTranslation } from "react-i18next";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import {
  combineLikeSources,
  CitationDetailModal,
} from "../ChatHistory/Citation";
import MobileCitationModal from "./MobileCitationModal";
import SourceItem from "./SourceItem";
import ChatSidebar, { useSourcesSidebar, useChatSidebar } from "../ChatSidebar";
import SidebarTabs from "../ChatSidebar/SidebarTabs";
import { MemoriesProvider } from "../MemoriesSidebar/MemoriesContext";
import { safeJsonParse, baseHeaders } from "@/utils/request";
import { API_BASE } from "@/utils/constants";
import { PanelHeader } from "@/components/ui/PanelHeader";

// Re-export for backward compat with existing imports
export { useSourcesSidebar } from "../ChatSidebar";

function getWorkspaceSourceType(doc: any) {
  const metadata = safeJsonParse(doc.metadata, {});
  const docpath = doc.docpath || "";
  const filename = doc.filename || "";

  // URL/Link detection
  if (
    metadata?.url ||
    metadata?.sourceUrl ||
    docpath.includes("link") ||
    filename.startsWith("http")
  ) {
    return { type: "url", icon: Globe, label: null };
  }

  // Database/API detection (heuristic based on common patterns)
  if (
    docpath.includes("api") ||
    docpath.includes("db") ||
    docpath.includes("connector") ||
    metadata?.connectionString ||
    metadata?.apiEndpoint
  ) {
    return { type: "db", icon: Database, label: null };
  }

  // Default: document
  return { type: "document", icon: FileText, label: null };
}

function WorkspaceSourceItem({ doc, onClick, snippet }: any) {
  const { t } = useTranslation();
  const { type: sourceType, icon: Icon } = getWorkspaceSourceType(doc);
  const metadata = safeJsonParse(doc.metadata, {});
  const label =
    sourceType === "url"
      ? t("chat_window.source_type_url")
      : sourceType === "db"
        ? t("chat_window.source_type_database")
        : t("chat_window.source_type_document");
  const title = metadata?.title || doc.filename || doc.docId;
  const wordCount = metadata?.wordCount;
  const createdDate = doc.createdAt
    ? new Date(doc.createdAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;
  const summaryText = snippet || metadata?.description || null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-1.5 w-full text-left p-2.5 rounded-lg border border-theme-border bg-theme-bg-secondary hover:bg-theme-bg-tertiary transition-colors"
    >
      <div className="flex gap-[6px] items-start w-full">
        <div className="w-5 h-5 rounded-full bg-theme-bg-tertiary flex items-center justify-center flex-shrink-0">
          <Icon size={11} className="text-theme-text-primary" />
        </div>
        <p className="flex-1 font-medium text-sm text-theme-text-primary light:text-theme-text-primary leading-[15px] line-clamp-2">
          {title}
        </p>
      </div>
      {summaryText && (
        <p className="text-[11px] text-zinc-400 light:text-slate-500 leading-[14px] pl-[26px] line-clamp-3">
          {summaryText}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-[26px] text-[10px] text-zinc-500 light:text-slate-400">
        <span className="inline-flex items-center gap-x-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-theme-accent opacity-60" />
          {label}
        </span>
        {wordCount && <span>{t("common.words", { count: wordCount })}</span>}
        {createdDate && <span>{createdDate}</span>}
      </div>
    </button>
  );
}

function sourceMatchesChunkPredicate(
  source: any,
  predicate: (chunkSource: string) => boolean,
) {
  const chunks = Array.isArray(source?.chunks) ? source.chunks : [];
  return chunks.some((chunk: any) => predicate(chunk?.chunkSource || ""));
}

export default function SourcesSidebar({ workspace }: any) {
  const { sources, sidebarOpen, closeSidebar } = useSourcesSidebar();
  const { t } = useTranslation();
  const isMobile = useIsMobileLayout();
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [snippets, setSnippets] = useState<Record<string, string>>({});
  const { sourceFilter, isDocumentSource, isMediaSource } = useChatSidebar();

  const combined = useMemo(() => combineLikeSources(sources), [sources]);

  const fetchSnippets = useCallback(async (slug: any) => {
    if (!slug) return;
    try {
      const res = await fetch(
        `${API_BASE}/workspaces/${slug}/document-snippets`,
        {
          method: "GET",
          headers: baseHeaders(),
        },
      );
      const data = await res.json();
      if (data?.snippets) setSnippets(data.snippets);
    } catch (e) {
      logger.warn("[index] non-fatal error:", e?.message || e);
    }
  }, []);

  useEffect(() => {
    if (sidebarOpen && workspace?.slug) {
      fetchSnippets(workspace.slug);
    }
  }, [sidebarOpen, workspace?.slug, fetchSnippets]);

  // Filter chat sources based on active filter
  const filteredChatSources = (combined as any).filter((source) => {
    if (sourceFilter === "documents")
      return sourceMatchesChunkPredicate(source, isDocumentSource);
    if (sourceFilter === "media")
      return sourceMatchesChunkPredicate(source, isMediaSource);
    return true; // "all"
  });

  // Convert workspace documents to display format
  const workspaceDocs = workspace?.documents || [];
  const filteredWorkspaceDocs = (workspaceDocs as any).filter((doc) => {
    const typeInfo = getWorkspaceSourceType(doc);
    if (sourceFilter === "documents") return typeInfo.type === "document";
    if (sourceFilter === "media") return typeInfo.type === "url";
    return true; // "all"
  });

  const hasChatSources = combined.length > 0;
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
        <div className="w-full h-full bg-theme-bg-sidebar p-4 flex flex-col gap-4 overflow-hidden">
          {/* Header */}
          <PanelHeader
            title={
              isWorkspaceMode
                ? t("chat_window.workspace_sources")
                : t("chat_window.sources")
            }
            onClose={closeSidebar}
          />

          {/* Tabs */}
          <SidebarTabs />

          {/* Sources list */}
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
                    snippet={snippets[source.docId]}
                    onClick={() => setSelectedSource(source)}
                  />
                ) : (
                  <SourceItem
                    key={source.id || idx}
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
