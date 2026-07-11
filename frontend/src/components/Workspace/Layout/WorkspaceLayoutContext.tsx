// SPDX-License-Identifier: MIT
// Purpose: Central workspace layout state — manages left sidebar, right panel, and their coordination.
// Docs: Based on Issue #607 Phase 2 WorkspaceLayoutProvider spec.
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

type WorkspacePanel =
  | "preview"
  | "files"
  | "sources"
  | "database"
  | "notes"
  | "memories"
  | "pdf-analysis"
  | "political"
  | "console"
  | "agent-sessions"
  | "agent-settings"
  | "workspace-settings"
  | null;

interface WorkspaceLayoutState {
  leftSidebarOpen: boolean;
  rightPanel: WorkspacePanel;
  previousLeftSidebarOpen: boolean | null;
}

interface WorkspaceLayoutContextValue extends WorkspaceLayoutState {
  openRightPanel: (panel: Exclude<WorkspacePanel, null>) => void;
  closeRightPanel: () => void;
  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  openPanel: (panel: Exclude<WorkspacePanel, null>) => void;
}

const WorkspaceLayoutContext = createContext<
  WorkspaceLayoutContextValue | undefined
>(undefined);

export function WorkspaceLayoutProvider({
  children,
  initialLeftSidebarOpen = true,
}: {
  children: React.ReactNode;
  initialLeftSidebarOpen?: boolean;
}) {
  const [layout, setLayout] = useState<WorkspaceLayoutState>({
    leftSidebarOpen: initialLeftSidebarOpen,
    rightPanel: null,
    previousLeftSidebarOpen: null,
  });

  const openRightPanel = useCallback((panel: Exclude<WorkspacePanel, null>) => {
    setLayout((current) => ({
      ...current,
      previousLeftSidebarOpen:
        current.rightPanel === null
          ? current.leftSidebarOpen
          : current.previousLeftSidebarOpen,
      leftSidebarOpen: false,
      rightPanel: panel,
    }));
  }, []);

  const closeRightPanel = useCallback(() => {
    setLayout((current) => ({
      ...current,
      leftSidebarOpen: current.previousLeftSidebarOpen ?? false,
      previousLeftSidebarOpen: null,
      rightPanel: null,
    }));
  }, []);

  const toggleLeftSidebar = useCallback(() => {
    setLayout((current) => ({
      ...current,
      leftSidebarOpen: !current.leftSidebarOpen,
    }));
  }, []);

  const setLeftSidebarOpen = useCallback((open: boolean) => {
    setLayout((current) => ({
      ...current,
      leftSidebarOpen: open,
    }));
  }, []);

  const value = useMemo(
    () => ({
      ...layout,
      openRightPanel,
      closeRightPanel,
      toggleLeftSidebar,
      setLeftSidebarOpen,
      openPanel: openRightPanel,
    }),
    [
      layout,
      openRightPanel,
      closeRightPanel,
      toggleLeftSidebar,
      setLeftSidebarOpen,
    ],
  );

  return (
    <WorkspaceLayoutContext.Provider value={value}>
      {children}
    </WorkspaceLayoutContext.Provider>
  );
}

export function useWorkspaceLayout() {
  const ctx = useContext(WorkspaceLayoutContext);
  if (!ctx)
    throw new Error(
      "useWorkspaceLayout must be used within WorkspaceLayoutProvider",
    );
  return ctx;
}
