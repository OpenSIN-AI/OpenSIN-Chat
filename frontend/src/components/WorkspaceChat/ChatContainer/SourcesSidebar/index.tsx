// SPDX-License-Identifier: MIT
import { useState, useEffect, useCallback } from "react";
import { useIsMobileLayout } from "@/hooks/useIsMobileLayout";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import paths from "@/utils/paths";
import useThreads from "@/hooks/useThreads";
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
      className="flex flex-col gap-1.5 w-full text-left p-2.5 rounded-lg border border-theme-border bg-zinc-800/50 light:bg-slate-50 hover:bg-zinc-800 light:hover:bg-slate-100 transition-colors"
    >
      <div className="flex gap-[6px] items-start w-full">
        <div className="w-5 h-5 rounded-full bg-zinc-700 light:bg-slate-200 flex items-center justify-center flex-shrink-0">
          <Icon size={11} className="text-theme-text-primary light:text-theme-text-primary" />
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

function WorkspaceChatsTab({ workspace, onClose }: any) {
  const { t } = useTranslation();
  const { threads, isLoading } = useThreads(workspace?.slug);
  const { threadSlug: activeThreadSlug } = useParams() as any;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 overflow-y-auto no-scroll">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-zinc-800 light:bg-slate-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const allThreads = [
    // Default thread (no slug)
    {
      id: "__default__",
      slug: null,
      name: workspace?.name || t("chat_window.default_thread"),
      virtual: true,
    },
    ...threads.filter((th: any) => !th.virtual && !th.deleted),
  ];

  if (allThreads.length === 0) {
    return (
      <p className="text-sm text-zinc-400 light:text-slate-500 text-center py-6">
        {t("chat_window.no_chats", "Noch keine Chats vorhanden.")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto no-scroll">
      {allThreads.map((thread: any) => {
        const href = thread.slug
          ? paths.workspace.thread(workspace.slug, thread.slug)
          : paths.workspace.chat(workspace.slug);
        const isActive = thread.slug
          ? activeThreadSlug === thread.slug
          : !activeThreadSlug;

        return (
          <Link
            key={thread.id}
            to={href}
            onClick={onClose}
            className={`flex flex-col gap-0.5 px-3 py-2 rounded-lg transition-colors no-underline group ${
              isActive
                ? "bg-zinc-700 light:bg-slate-200"
                : "hover:bg-zinc-800 light:hover:bg-slate-100"
            }`}
          >
            <span
              className={`text-sm font-medium truncate ${
                isActive
                  ? "text-theme-text-primary light:text-theme-text-primary"
                  : "text-zinc-200 light:text-slate-700"
              }`}
            >
              {thread.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function SourcesSidebar({ workspace }: any) {
  const { sources, sidebarOpen, closeSidebar } = useSourcesSidebar();
  const { t } = useTranslation();
  const isMobile = useIsMobileLayout();
  const [selectedSource, setSelectedSource] = useState(null);
  const [snippets, setSnippets] = useState<Record<string, string>>({});
  const { sourceFilter, isDocumentSource, isMediaSource } = useChatSidebar();

  const combined = combineLikeSources(sources);

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
    } catch {}
  }, []);

  useEffect(() => {
    if (sidebarOpen && workspace?.slug) {
      fetchSnippets(workspace.slug);
    }
  }, [sidebarOpen, workspace?.slug, fetchSnippets]);

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
    if (sourceFilter === "media") return typeInfo.type === "url";
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
        <div className="w-full h-full bg-zinc-900 light:bg-white p-4 flex flex-col gap-4 overflow-hidden">
          {/* Header */}
          <div className="flex flex-col shrink-0 gap-2">
            <div className="flex items-start justify-between">
              <p className="font-medium text-base leading-6 text-theme-text-primary light:text-theme-text-primary">
                {isWorkspaceMode
                  ? t("chat_window.workspace_sources")
                  : t("chat_window.sources")}
              </p>
              <button
                onClick={closeSidebar}
                type="button"
                className="text-theme-text-secondary light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Only Arbeitsbereich + Global tabs — no Chats/Quellen toggle */}
            <SidebarTabs />
          </div>

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
