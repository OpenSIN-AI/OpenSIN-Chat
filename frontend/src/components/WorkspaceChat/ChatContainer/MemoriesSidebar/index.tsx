// SPDX-License-Identifier: MIT
import { X } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import ChatSidebar from "../ChatSidebar";
import { MemoriesProvider, useMemoriesContext } from "./MemoriesContext";
import PersonalizationToggle from "./PersonalizationToggle";
import MemoryCard from "./MemoryCard";
import MemoryModal from "./MemoryModal";
import SidebarTabs from "../ChatSidebar/SidebarTabs";

export { useMemoriesSidebar } from "../ChatSidebar";

export default function MemoriesSidebar({ workspace }: any) {
  return (
    <MemoriesProvider workspace={workspace}>
      <MemoriesSidebarContent />
    </MemoriesProvider>
  );
}

function MemoriesSidebarContent() {
  const { sidebarOpen, canToggle, enabled } = useMemoriesContext();

  if (!canToggle && !enabled) return null;
  return (
    <>
      <ChatSidebar isOpen={sidebarOpen}>
        <SidebarPanel>
          <SidebarHeaderWithTabs />
          <PersonalizationToggle />
          <MemoryList />
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

function MemoryList() {
  const { enabled, activeMemories } = useMemoriesContext();

  if (!enabled) return null;
  if (activeMemories.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-1.5 pb-4">
      {(activeMemories as any).map((memory) => (
        <MemoryCard key={memory.id} memory={memory} />
      ))}
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

function SidebarHeaderWithTabs() {
  const { t } = useTranslation();
  const { closeSidebar } = useMemoriesContext();

  return (
    <div className="flex flex-col shrink-0 gap-2">
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
      <SidebarTabs />
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
