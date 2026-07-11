// SPDX-License-Identifier: MIT
// Purpose: Keyboard shortcuts hook for workspace — Cmd+K search, Cmd+N new chat, Cmd+B sidebar, Escape close panel.
// Docs: Based on Issue #607 Phase 2 workspaceShortcuts spec.
import { useEffect } from "react";
import { useWorkspaceLayout } from "./WorkspaceLayoutContext";

interface ShortcutActions {
  openSearch: () => void;
  createConversation: () => void;
}

export function useWorkspaceShortcuts({
  openSearch,
  createConversation,
}: ShortcutActions) {
  const { toggleLeftSidebar, openPanel, rightPanel, closeRightPanel } =
    useWorkspaceLayout();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editing =
        target?.matches("input, textarea, [contenteditable='true']") ?? false;

      // Cmd/Ctrl + K → global search
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
        return;
      }

      // Cmd/Ctrl + N → new conversation
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "n" &&
        !editing
      ) {
        event.preventDefault();
        createConversation();
        return;
      }

      // Cmd/Ctrl + B → toggle sidebar
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "b" &&
        !editing
      ) {
        event.preventDefault();
        toggleLeftSidebar();
        return;
      }

      // Cmd/Ctrl + Shift + 1 → open notes
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key === "1"
      ) {
        event.preventDefault();
        openPanel("notes");
        return;
      }

      // Cmd/Ctrl + Shift + 2 → open files
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key === "2"
      ) {
        event.preventDefault();
        openPanel("files");
        return;
      }

      // Escape → close overlay panel
      if (event.key === "Escape" && rightPanel) {
        event.preventDefault();
        closeRightPanel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    rightPanel,
    closeRightPanel,
    createConversation,
    openPanel,
    openSearch,
    toggleLeftSidebar,
  ]);
}
