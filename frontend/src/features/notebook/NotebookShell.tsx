// SPDX-License-Identifier: MIT

import { type ReactNode, useCallback, useEffect } from "react";
import NotebookHeader from "./NotebookHeader";
import useNotebookSection from "./useNotebookSection";
import type { NotebookSectionId } from "./sections";

interface NotebookShellProps {
  workspace: any;
  children: ReactNode;
  openSidebar: (type: string, data?: unknown) => void;
  closeSidebar: () => void;
  activeSidebar?: string | null;
  sourceCount?: number;
  noteCount?: number;
  resultCount?: number;
}

export default function NotebookShell({ workspace, children, openSidebar, closeSidebar, activeSidebar, sourceCount = 0, noteCount = 0, resultCount = 0 }: NotebookShellProps) {
  const { section, setSection } = useNotebookSection();

  const selectSection = useCallback(
    (nextSection: NotebookSectionId) => {
      setSection(nextSection);
      switch (nextSection) {
        case "chat": closeSidebar(); break;
        case "sources": openSidebar("sources"); break;
        case "notes": openSidebar("notepad"); break;
        case "results": openSidebar("results"); break;
      }
    },
    [closeSidebar, openSidebar, setSection],
  );

  useEffect(() => {
    if (!activeSidebar) { setSection("chat"); return; }
    if (activeSidebar === "sources") { setSection("sources"); return; }
    if (activeSidebar === "notepad" || activeSidebar === "notes") { setSection("notes"); return; }
    if (activeSidebar === "results" || activeSidebar === "artifacts") { setSection("results"); }
  }, [activeSidebar, setSection]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-theme-bg-primary">
      <NotebookHeader
        notebookName={workspace?.name || "Notebook"}
        activeSection={section}
        onSectionChange={selectSection}
        sourceCount={sourceCount}
        noteCount={noteCount}
        resultCount={resultCount}
      />
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
