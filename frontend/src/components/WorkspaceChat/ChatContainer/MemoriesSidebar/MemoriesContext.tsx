// SPDX-License-Identifier: MIT
import { createContext, useContext, useState, useEffect } from "react";
import { useMemoriesSidebar } from "../ChatSidebar";
import useUser from "@/hooks/useUser";
import useSystemSettings from "@/hooks/useSystemSettings";
import useMemories from "@/hooks/useMemories";
import Memory from "@/models/memory";

export const LIMITS = {
  workspace: 20,
  global: 5,
};

const MemoriesContext = createContext(null);

export function useMemoriesContext() {
  const ctx = useContext(MemoriesContext);
  if (!ctx) {
    throw new Error("useMemoriesContext must be used within MemoriesProvider");
  }
  return ctx;
}

export function MemoriesProvider({ workspace, children }) {
  const { sidebarOpen, closeSidebar } = useMemoriesSidebar();
  const { user } = useUser();
  const canToggle = !user || user?.role === "admin";

  const [activeTab, setActiveTab] = useState("workspace");
  const [modalState, setModalState] = useState({ open: false, mode: "create" });
  const [editingMemory, setEditingMemory] = useState(null);
  const { settings, loading: settingsLoading } = useSystemSettings();
  const [enabled, setEnabled] = useState(false);
  const [autoExtraction, setAutoExtraction] = useState(true);

  const {
    memories,
    isLoading: memoriesLoading,
    refresh: refreshMemories,
  } = useMemories(sidebarOpen && enabled ? workspace?.slug : null);

  useEffect(() => {
    if (settingsLoading) return;
    setEnabled(!!settings?.MemoryEnabled);
    setAutoExtraction(settings?.MemoryAutoExtraction !== false);
  }, [settings, settingsLoading]);

  async function handleCreate(content) {
    const { memory } = await Memory.create(workspace.slug, {
      content,
      scope: activeTab,
    });
    if (memory) refreshMemories();
  }

  async function handleDelete(memoryId) {
    await Memory.delete(memoryId);
    refreshMemories();
  }

  async function handleUpdate(memoryId, content) {
    const { memory } = await Memory.update(memoryId, { content });
    if (memory) refreshMemories();
  }

  async function handlePromote(memoryId) {
    const { memory } = await Memory.promoteToGlobal(memoryId);
    if (memory) refreshMemories();
  }

  async function handleDemote(memoryId) {
    if (!workspace?.slug) return;
    const { memory } = await Memory.demoteToWorkspace(memoryId, workspace.slug);
    if (memory) refreshMemories();
  }

  function openCreateModal() {
    setEditingMemory(null);
    setModalState({ open: true, mode: "create" });
  }

  function openEditModal(memory) {
    setEditingMemory(memory);
    setModalState({ open: true, mode: "edit" });
  }

  function closeModal() {
    setModalState({ open: false, mode: "create" });
    setEditingMemory(null);
  }

  const activeMemories =
    activeTab === "workspace" ? memories.workspace : memories.global;

  const value = {
    workspace,
    sidebarOpen,
    closeSidebar,
    canToggle,
    memories,
    activeTab,
    setActiveTab,
    activeMemories,
    enabled,
    setEnabled,
    autoExtraction,
    setAutoExtraction,
    loadingEnabled: settingsLoading,
    modalState,
    editingMemory,
    openCreateModal,
    openEditModal,
    closeModal,
    handleCreate,
    handleDelete,
    handleUpdate,
    handlePromote,
    handleDemote,
  };

  return (
    <MemoriesContext.Provider value={value}>
      {children}
    </MemoriesContext.Provider>
  );
}
