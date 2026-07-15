// SPDX-License-Identifier: MIT
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useMemoriesSidebar } from "../ChatSidebar";
import useUser from "@/hooks/useUser";
import useSystemSettings from "@/hooks/useSystemSettings";
import useMemories from "@/hooks/useMemories";
import Memory from "@/models/memory";

export const LIMITS = {
  workspace: 20,
  global: 5,
};

export interface MemoryEntry {
  id: string | number;
  content: string;
  scope: string;
  [key: string]: unknown;
}

export interface MemoriesContextValue {
  workspace: { slug: string; [key: string]: unknown } | null;
  sidebarOpen: boolean;
  closeSidebar: () => void;
  canToggle: boolean;
  memories: { workspace: MemoryEntry[]; global: MemoryEntry[] };
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeMemories: MemoryEntry[];
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  autoExtraction: boolean;
  setAutoExtraction: (value: boolean) => void;
  loadingEnabled: boolean;
  memoriesLoading: boolean;
  memoriesError: any;
  modalState: { open: boolean; mode: string };
  editingMemory: MemoryEntry | null;
  openCreateModal: () => void;
  openEditModal: (memory: MemoryEntry) => void;
  closeModal: () => void;
  handleCreate: (content: string) => Promise<boolean>;
  handleDelete: (memoryId: string | number) => Promise<boolean>;
  handleUpdate: (
    memoryId: string | number,
    content: string,
  ) => Promise<boolean>;
  handlePromote: (memoryId: string | number) => Promise<boolean>;
  handleDemote: (memoryId: string | number) => Promise<boolean>;
}

const MemoriesContext = createContext<MemoriesContextValue | null>(null);

export function useMemoriesContext() {
  const ctx = useContext(MemoriesContext);
  if (!ctx) {
    throw new Error("useMemoriesContext must be used within MemoriesProvider");
  }
  return ctx;
}

export function MemoriesProvider({ workspace, forceOpen, children }: any) {
  const { sidebarOpen: hookSidebarOpen, closeSidebar } = useMemoriesSidebar();
  // When embedded in another panel (e.g. the consolidated Quellen sidebar) the
  // "memories" sidebar is never the active one, so the hook's sidebarOpen stays
  // false and memories would never load. `forceOpen` lets the host panel drive
  // the open state (and thus the useMemories fetch gate) instead.
  const sidebarOpen =
    forceOpen !== undefined ? !!forceOpen : hookSidebarOpen;
  const { user } = useUser();
  const canToggle = !user || user?.role === "admin";

  const [activeTab, setActiveTab] = useState("workspace");
  const [modalState, setModalState] = useState({ open: false, mode: "create" });
  const [editingMemory, setEditingMemory] = useState<MemoryEntry | null>(null);
  const { settings, loading: settingsLoading } = useSystemSettings();
  const [enabled, setEnabled] = useState(false);
  const [autoExtraction, setAutoExtraction] = useState(true);

  const {
    memories,
    isLoading: memoriesLoading,
    error: memoriesError,
    refresh: refreshMemories,
  } = useMemories(sidebarOpen && enabled ? workspace?.slug : null);

  useEffect(() => {
    if (settingsLoading) return;
    setEnabled(!!settings?.MemoryEnabled);
    setAutoExtraction(settings?.MemoryAutoExtraction !== false);
  }, [settings, settingsLoading]);

  const handleCreate = useCallback(
    async (content) => {
      const { memory } = await Memory.create(workspace.slug, {
        content,
        scope: activeTab,
      });
      if (memory) refreshMemories();
      return !!memory;
    },
    [workspace?.slug, activeTab, refreshMemories],
  );

  const handleDelete = useCallback(
    async (memoryId) => {
      const { success } = await Memory.delete(memoryId);
      if (success) refreshMemories();
      return !!success;
    },
    [refreshMemories],
  );

  const handleUpdate = useCallback(
    async (memoryId, content) => {
      const { memory } = await Memory.update(memoryId, { content });
      if (memory) refreshMemories();
      return !!memory;
    },
    [refreshMemories],
  );

  const handlePromote = useCallback(
    async (memoryId) => {
      const { memory } = await Memory.promoteToGlobal(memoryId);
      if (memory) refreshMemories();
      return !!memory;
    },
    [refreshMemories],
  );

  const handleDemote = useCallback(
    async (memoryId) => {
      if (!workspace?.slug) return false;
      const { memory } = await Memory.demoteToWorkspace(
        memoryId,
        workspace.slug,
      );
      if (memory) refreshMemories();
      return !!memory;
    },
    [workspace?.slug, refreshMemories],
  );

  const openCreateModal = useCallback(() => {
    setEditingMemory(null);
    setModalState({ open: true, mode: "create" });
  }, []);

  const openEditModal = useCallback((memory) => {
    setEditingMemory(memory);
    setModalState({ open: true, mode: "edit" });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ open: false, mode: "create" });
    setEditingMemory(null);
  }, []);

  const activeMemories =
    activeTab === "workspace" ? memories.workspace : memories.global;

  const value = useMemo<MemoriesContextValue>(
    () => ({
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
      memoriesLoading,
      memoriesError,
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
    }),
    [
      workspace,
      sidebarOpen,
      closeSidebar,
      canToggle,
      memories,
      activeTab,
      activeMemories,
      enabled,
      autoExtraction,
      settingsLoading,
      memoriesLoading,
      memoriesError,
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
    ],
  );

  return (
    <MemoriesContext.Provider value={value}>
      {children}
    </MemoriesContext.Provider>
  );
}
