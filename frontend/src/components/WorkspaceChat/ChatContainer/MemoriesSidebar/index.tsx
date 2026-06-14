// SPDX-License-Identifier: MIT
import { useState } from "react";
import { X, ChatCircleText, Files, FileText, Globe, Database } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import ChatSidebar from "../ChatSidebar";
import { MemoriesProvider, useMemoriesContext } from "./MemoriesContext";
import PersonalizationToggle from "./PersonalizationToggle";
import MemoryCard from "./MemoryCard";
import MemoryModal from "./MemoryModal";
import SidebarTabs from "../ChatSidebar/SidebarTabs";
import useThreads from "@/hooks/useThreads";
import paths from "@/utils/paths";
import { safeJsonParse } from "@/utils/request";

export { useMemoriesSidebar } from "../ChatSidebar";

// ── Helper: determine source icon for workspace docs ──────────────────────────
function getDocType(doc: any) {
  const metadata = safeJsonParse(doc.metadata, {});
  const docpath = doc.docpath || "";
  const filename = doc.filename || "";
  if (metadata?.url || metadata?.sourceUrl || docpath.includes("link") || filename.startsWith("http"))
    return { icon: Globe, label: "URL" };
  if (docpath.includes("api") || docpath.includes("db") || metadata?.connectionString)
    return { icon: Database, label: "Datenbank" };
  return { icon: FileText, label: "Dokument" };
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
          <div key={i} className="h-12 rounded-lg bg-zinc-800 light:bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const allThreads = [
    { id: "__default__", slug: null, name: workspace?.name || "Default", virtual: true },
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
        const isActive = thread.slug ? activeThreadSlug === thread.slug : !activeThreadSlug;
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
            <span className={`text-sm font-medium truncate ${
              isActive ? "text-white light:text-slate-900" : "text-zinc-200 light:text-slate-700"
            }`}>
              {thread.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ── Files tab ─────────────────────────────────────────────────────────────────
function WorkspaceFilesTab({ workspace }: any) {
  const { t } = useTranslation();
  const docs: any[] = workspace?.documents || [];

  if (docs.length === 0) {
    return (
      <p className="text-sm text-zinc-400 light:text-slate-500 text-center py-6">
        {t("chat_window.no_workspace_sources", "Keine Dateien im Workspace.")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto no-scroll">
      {docs.map((doc: any, idx: number) => {
        const metadata = safeJsonParse(doc.metadata, {});
        const { icon: Icon, label } = getDocType(doc);
        return (
          <div key={doc.docId || idx} className="flex flex-col gap-[2px]">
            <div className="flex gap-2 items-start">
              <div className="w-4 h-4 rounded-full bg-zinc-700 light:bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={10} className="text-white light:text-slate-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white light:text-slate-900 truncate leading-[15px]">
                  {metadata?.title || doc.filename || doc.docId}
                </p>
                <p className="text-[10px] text-zinc-400 light:text-slate-500 leading-[14px]">{label}</p>
                {metadata?.wordCount && (
                  <p className="text-[10px] text-zinc-500 light:text-slate-400 leading-[14px]">
                    {t("common.words", { count: metadata.wordCount })}
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
export default function MemoriesSidebar({ workspace }: any) {
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
  const { enabled, modalState, editingMemory, closeModal, handleCreate, handleUpdate } = useMemoriesContext();
  if (!enabled) return null;
  return (
    <MemoryModal
      isOpen={modalState.open}
      mode={modalState.mode}
      initialContent={editingMemory?.content || ""}
      onClose={closeModal}
      onSubmit={(content) => {
        if (modalState.mode === "edit" && editingMemory) {
          handleUpdate(editingMemory.id, content);
        } else {
          handleCreate(content);
        }
      }}
    />
  );
}

function SidebarHeaderWithTabs({ workspace }: any) {
  const { t } = useTranslation();
  const { closeSidebar, enabled, activeMemories } = useMemoriesContext();
  const [activeTab, setActiveTab] = useState<"memories" | "chats" | "files">("memories");

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* Title row */}
      <div className="flex items-start justify-between shrink-0">
        <p className="font-medium text-base leading-6 text-zinc-50 light:text-slate-900">
          {t("chat_window.memories.title")}
        </p>
        <button
          onClick={closeSidebar}
          type="button"
          className="text-zinc-50 light:text-slate-900 hover:text-white light:hover:text-slate-400 transition-colors border-none bg-transparent cursor-pointer"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {/* Tab switcher: Memories / Chats / Dateien */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("memories")}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium transition-colors ${
            activeTab === "memories"
              ? "bg-zinc-700 light:bg-slate-200 text-white light:text-slate-900"
              : "bg-transparent hover:bg-zinc-800/50 light:hover:bg-slate-100 text-zinc-400 light:text-slate-500"
          }`}
        >
          <span>{t("chat_window.memories.title", "Memories")}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("chats")}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium transition-colors ${
            activeTab === "chats"
              ? "bg-zinc-700 light:bg-slate-200 text-white light:text-slate-900"
              : "bg-transparent hover:bg-zinc-800/50 light:hover:bg-slate-100 text-zinc-400 light:text-slate-500"
          }`}
        >
          <ChatCircleText size={12} weight="bold" />
          <span>{t("chat_window.chats_tab", "Chats")}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("files")}
          className={`flex items-center gap-1.5 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium transition-colors ${
            activeTab === "files"
              ? "bg-zinc-700 light:bg-slate-200 text-white light:text-slate-900"
              : "bg-transparent hover:bg-zinc-800/50 light:hover:bg-slate-100 text-zinc-400 light:text-slate-500"
          }`}
        >
          <Files size={12} weight="bold" />
          <span>{t("chat_window.files_tab", "Dateien")}</span>
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
        {activeTab === "memories" && (
          <>
            <SidebarTabs />
            <PersonalizationToggle />
            {enabled ? (
              activeMemories.length === 0 ? <EmptyState /> : <MemoryList />
            ) : null}
          </>
        )}
        {activeTab === "chats" && (
          <WorkspaceChatsTab workspace={workspace} onClose={closeSidebar} />
        )}
        {activeTab === "files" && (
          <WorkspaceFilesTab workspace={workspace} />
        )}
      </div>
    </div>
  );
}

function MemoryList() {
  const { activeMemories } = useMemoriesContext();
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
