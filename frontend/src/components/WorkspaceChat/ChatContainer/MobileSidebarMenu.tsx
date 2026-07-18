// SPDX-License-Identifier: MIT
// Purpose: Touch-friendly access to workspace side panels below the desktop breakpoint.
// Docs: MobileSidebarMenu.doc.md
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Newspaper } from "@phosphor-icons/react/dist/csr/Newspaper";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { Notepad } from "@phosphor-icons/react/dist/csr/Notepad";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";
import { useTranslation } from "react-i18next";
import { useChatSidebar } from "./ChatSidebar";
import { useAgentRuns } from "./AgentSessionsSidebar/AgentRunsContext";

export default function MobileSidebarMenu() {
  const { t } = useTranslation();
  const { activeSidebar, toggleSidebar } = useChatSidebar();
  const { activeRunCount } = useAgentRuns();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = [
    ["preview", Eye, t("right_sidebar.icon_preview", "Vorschau")],
    ["database", Database, t("right_sidebar.icon_database", "Politiker-Datenbank")],
    ["political", Newspaper, t("right_sidebar.icon_political", "Politisches")],
    ["sources", BookOpen, t("right_sidebar.icon_sources", "Quellen")],
    ["pdf-analysis", FilePdf, t("right_sidebar.icon_pdf_analysis", "PDF-Analyse")],
    ["notepad", Notepad, t("right_sidebar.icon_notepad", "Notizblock")],
    ["agent-sessions", Broadcast, t("right_sidebar.icon_agent_sessions", "Agent-Sessions")],
  ] as const;

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="fixed right-3 top-2 z-50 md:hidden">
      <button
        type="button"
        aria-label={t("common.rightSidebar")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-theme-border bg-theme-bg-sidebar text-theme-text-secondary shadow-sm transition-colors hover:bg-theme-bg-hover hover:text-theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary"
      >
        <SlidersHorizontal size={19} weight={activeSidebar ? "fill" : "regular"} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 grid w-[min(280px,calc(100vw-24px))] grid-cols-2 gap-1 rounded-xl border border-theme-border bg-theme-bg-sidebar p-2 shadow-xl"
        >
          {items.map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              role="menuitem"
              aria-pressed={activeSidebar === id}
              onClick={() => {
                toggleSidebar(id);
                setOpen(false);
              }}
              className={`flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary ${
                activeSidebar === id
                  ? "bg-theme-bg-hover text-theme-text-primary"
                  : "text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
              }`}
            >
              <Icon size={17} weight={activeSidebar === id ? "fill" : "regular"} />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {id === "agent-sessions" && activeRunCount > 0 && (
                <span className="rounded-full bg-[#009ee0] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {activeRunCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
