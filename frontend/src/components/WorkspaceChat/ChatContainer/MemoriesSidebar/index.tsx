// SPDX-License-Identifier: MIT
import { memo, useState } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { ChatCircleText } from "@phosphor-icons/react/dist/csr/ChatCircleText";
import { Globe } from "@phosphor-icons/react/dist/csr/Globe";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import ChatSidebar from "../ChatSidebar";
import { MemoriesProvider, useMemoriesContext } from "./MemoriesContext";
import PersonalizationToggle from "./PersonalizationToggle";
import MemoryCard from "./MemoryCard";
import MemoryModal from "./MemoryModal";
import useThreads from "@/hooks/useThreads";
import paths from "@/utils/paths";
import { safeJsonParse } from "@/utils/request";

export { useMemoriesSidebar } from "../ChatSidebar";

// ── Helpers: identify URL sources and extract their address ───────────────────
function isUrlDoc(doc: any) {
  const metadata = safeJsonParse(doc.metadata, {});
  const docpath = doc.docpath || "";
  const filename = doc.filename || "";
  return (
    !!metadata?.url ||
    !!metadata?.sourceUrl ||
    docpath.includes("link") ||
    filename.startsWith("http")
  );
}

function getUrlFromDoc(doc: any) {
  const metadata = safeJsonParse(doc.metadata, {});
  const filename = doc.filename || "";
  if (metadata?.url) return metadata.url;
  if (metadata?.sourceUrl) return metadata.sourceUrl;
  if (filename.startsWith("http")) return filename;
  return doc.docpath || "";
}

// ── Chats tab ─────────────────────────────────────────────────────────────────
function WorkspaceChatsTab({ workspace, onClose }: any) {
  const { t } = useTranslation();
  const { threads, isLoading } = useThreads(workspace?.slug);
  const { threadSlug: activeThreadSlug } = useParams() as any;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-theme-bg-tertiary animate-pulse"
          />
        ))}
      </div>
    );
  }

  const allThreads = [
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
            className={`flex flex-col gap-0.5 px-3 py-2 rounded-lg transition-colors no-underline ${
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

// ── URLs tab ──────────────────────────────────────────────────────────────────
function WorkspaceUrlsTab({ workspace }: any) {
  const { t } = useTranslation();
  const docs: any[] = (workspace?.documents || []).filter(isUrlDoc);

  if (docs.length === 0) {
    return (
      <p className="text-sm text-zinc-400 light:text-slate-500 text-center py-6">
        {t("chat_window.no_urls", "Noch keine URLs hinzugefügt.")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto no-scroll">
      {docs.map((doc: any, idx: number) => {
        const metadata = safeJsonParse(doc.metadata, {});
        const url = getUrlFromDoc(doc);
        const title = metadata?.title || doc.filename || doc.docId || url;
        const isHttpUrl = typeof url === "string" && url.startsWith("http");
        return (
          <div key={doc.docId || idx} className="flex flex-col gap-[2px]">
            <div className="flex gap-2 items-start">
              <div className="w-4 h-4 rounded-full bg-theme-bg-tertiary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Globe size={10} className="text-theme-text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme-text-primary light:text-theme-text-primary truncate leading-[15px]">
                  {title}
                </p>
                {isHttpUrl ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-zinc-400 light:text-slate-500 leading-[14px] truncate block hover:underline"
                  >
                    {url}
                  </a>
                ) : (
                  <p className="text-[10px] text-zinc-400 light:text-slate-500 leading-[14px] truncate">
                    {url}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function MemoriesSidebar({ workspace }: any) {
  return (
    <MemoriesProvider workspace={workspace}>
      <MemoriesSidebarContent workspace={workspace} />
    </MemoriesProvider>
  );
}

function MemoriesSidebarContent({ workspace }: any) {
  const { sidebarOpen, canToggle, enabled } = useMemoriesContext();

  if (!canToggle && !enabled) return null;
  return (
    <>
      <ChatSidebar isOpen={sidebarOpen}>
        <SidebarPanel>
          <SidebarHeaderWithTabs workspace={workspace} />
        </SidebarPanel>
      </ChatSidebar>
      <MemoryModalWrapper />
    </>
  );
}

function SidebarPanel({ children }: any) {
  return (
    <div className="w-full flex-shrink-0 flex flex-col gap-5 px-5 py-4 overflow-y-auto no-scroll h-full">
      {children}
    </div>
  );
}

function MemoryModalWrapper() {
  const {
    enabled,
    modalState,
    editingMemory,
    closeModal,
    handleCreate,
    handleUpdate,
  } = useMemoriesContext();
  if (!enabled) return null;
  return (
    <MemoryModal
      isOpen={modalState.open}
      mode={modalState.mode}
      initialContent={editingMemory?.content || ""}
      onClose={closeModal}
      onSubmit={async (content) => {
        if (modalState.mode === "edit" && editingMemory) {
          return await handleUpdate(editingMemory.id, content);
        } else {
          return await handleCreate(content);
        }
      }}
    />
  );
}

function SidebarHeaderWithTabs({ workspace }: any) {
  const { t } = useTranslation();
  const { closeSidebar, enabled, activeMemories } = useMemoriesContext();
  const [activeTab, setActiveTab] = useState<"memories" | "chats" | "urls">(
    "memories",
  );

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* Title row */}
      <div className="flex items-start justify-between shrink-0">
        <p className="font-medium text-base leading-6 text-theme-text-primary">
          {t("chat_window.memories.title")}
        </p>
        <button
          onClick={closeSidebar}
          type="button"
          aria-label={t("common.close")}
          className="text-theme-text-secondary hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {/* Tab switcher: Memories / Chats / URLs */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("memories")}
          aria-pressed={activeTab === "memories"}
          aria-label={t("chat_window.memories.title", "Memories")}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium transition-colors ${
            activeTab === "memories"
              ? "bg-theme-bg-tertiary text-theme-text-primary"
              : "bg-transparent hover:bg-theme-bg-secondary text-theme-text-muted"
          }`}
        >
          <span>{t("chat_window.memories.title", "Memories")}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("chats")}
          aria-pressed={activeTab === "chats"}
          aria-label={t("chat_window.chats_tab", "Chats")}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium transition-colors ${
            activeTab === "chats"
              ? "bg-theme-bg-tertiary text-theme-text-primary"
              : "bg-transparent hover:bg-theme-bg-secondary text-theme-text-muted"
          }`}
        >
          <ChatCircleText size={12} weight="bold" />
          <span>{t("chat_window.chats_tab", "Chats")}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("urls")}
          aria-pressed={activeTab === "urls"}
          aria-label={t("chat_window.urls_tab", "URLs")}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium transition-colors ${
            activeTab === "urls"
              ? "bg-theme-bg-tertiary text-theme-text-primary"
              : "bg-transparent hover:bg-theme-bg-secondary text-theme-text-muted"
          }`}
        >
          <Globe size={12} weight="bold" />
          <span>{t("chat_window.urls_tab", "URLs")}</span>
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
        {activeTab === "memories" && (
          <>
            <PersonalizationToggle />
            {enabled ? (
              activeMemories.length === 0 ? (
                <EmptyState />
              ) : (
                <MemoryList />
              )
            ) : null}
          </>
        )}
        {activeTab === "chats" && (
          <WorkspaceChatsTab workspace={workspace} onClose={closeSidebar} />
        )}
        {activeTab === "urls" && <WorkspaceUrlsTab workspace={workspace} />}
      </div>
    </div>
  );
}

function MemoryList() {
  const { activeMemories, memoriesLoading, memoriesError } =
    useMemoriesContext();
  const { t } = useTranslation();

  if (memoriesLoading) {
    return (
      <div className="flex flex-col gap-2 pb-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-theme-bg-tertiary animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (memoriesError) {
    return (
      <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex items-center gap-2">
        <Warning size={16} weight="fill" className="flex-shrink-0" />
        <span>{t("common.loadError", "Fehler beim Laden")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 pb-4 overflow-y-auto no-scroll">
      {(activeMemories as any).map((memory: any) => (
        <MemoryCard key={memory.id} memory={memory} />
      ))}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  const { openCreateModal } = useMemoriesContext();
  return (
    <p className="text-sm leading-5 text-zinc-400 light:text-slate-600 text-center">
      {t("chat_window.memories.empty")}{" "}
      <button
        type="button"
        onClick={openCreateModal}
        className="text-zinc-50 light:text-slate-900 underline border-none bg-transparent cursor-pointer p-0 text-sm leading-5 font-normal"
      >
        {t("chat_window.memories.empty_cta")}
      </button>
    </p>
  );
}

export default memo(MemoriesSidebar);
