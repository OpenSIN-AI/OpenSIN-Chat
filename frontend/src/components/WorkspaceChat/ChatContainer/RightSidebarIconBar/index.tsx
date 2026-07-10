// SPDX-License-Identifier: MIT
// Purpose: PATCH for RightSidebarIconBar/index.tsx
//          Adds a second, visually separated icon section for Agent features.
//
// This is the COMPLETE modified file. Replace the existing index.tsx with this.
// Changes from original:
//   1. Added imports: Broadcast, Robot, Gear icons + useAgentRuns
//   2. Added agentIcons array (3 new icons)
//   3. Added divider + agent section in JSX
//   4. Added live badge for active run count
//
import { Tooltip } from "react-tooltip";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Newspaper } from "@phosphor-icons/react/dist/csr/Newspaper";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { Brain } from "@phosphor-icons/react/dist/csr/Brain";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { Notepad } from "@phosphor-icons/react/dist/csr/Notepad";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";

import { useChatSidebar } from "../ChatSidebar";
import { useAgentRuns } from "../AgentSessionsSidebar/AgentRunsContext";
import { useTranslation } from "react-i18next";

export default function RightSidebarIconBar() {
  const { t } = useTranslation();
  const { activeSidebar, toggleSidebar } = useChatSidebar();
  const { activeRunCount } = useAgentRuns();

  // --- Bestehende Panel-Icons (unverändert) ---
  const icons = [
    {
      id: "preview",
      icon: Eye,
      label: t("right_sidebar.icon_preview", "Vorschau"),
      action: () => toggleSidebar("preview"),
    },
    {
      id: "filesystem",
      icon: FolderOpen,
      label: t("right_sidebar.icon_filesystem", "Verzeichnis"),
      action: () => toggleSidebar("filesystem"),
    },
    {
      id: "database",
      icon: Database,
      label: t("right_sidebar.icon_database", "Politiker-Datenbank"),
      action: () => toggleSidebar("database"),
    },
    {
      id: "political",
      icon: Newspaper,
      label: t("right_sidebar.icon_political", "Politisches"),
      action: () => toggleSidebar("political"),
    },
    {
      id: "sources",
      icon: BookOpen,
      label: t("right_sidebar.icon_sources", "Quellen"),
      action: () => toggleSidebar("sources"),
    },
    {
      id: "memories",
      icon: Brain,
      label: t("right_sidebar.icon_memories", "Memories"),
      action: () => toggleSidebar("memories"),
    },
    {
      id: "pdf-analysis",
      icon: FilePdf,
      label: t("right_sidebar.icon_pdf_analysis", "PDF-Analyse"),
      action: () => toggleSidebar("pdf-analysis"),
    },
    {
      id: "notepad",
      icon: Notepad,
      label: t("right_sidebar.icon_notepad", "Notizblock"),
      action: () => toggleSidebar("notepad"),
    },
  ];

  // --- Agent-/Workspace-Section (getrennt durch Divider) ---
  // agent-settings und workspace-settings sind noch nicht implementiert
  // und werden ausgeblendet bis sie fertig sind.
  const agentIcons = [
    {
      id: "agent-sessions",
      icon: Broadcast,
      label: t("right_sidebar.icon_agent_sessions", "Agent-Sessions"),
      action: () => toggleSidebar("agent-sessions"),
      badge: activeRunCount,
    },
  ];

  // --- Render helper (shared by both sections) ---
  function renderIcon({ id, icon: Icon, label, action, badge = 0 }: any) {
    const isActive = activeSidebar === id;
    // Always use "left" so tooltips appear inside the viewport.
    // The icon bar is at the right edge — "right" would clip outside the window.
    const tooltipPlace = "left";
    return (
      <div
        key={id}
        className="relative flex flex-col items-center"
        data-tooltip-id={`rsib-${id}`}
        data-tooltip-content={label}
      >
        <button
          type="button"
          onClick={action}
          aria-label={label}
          aria-pressed={isActive}
          className={`flex h-11 w-11 items-center justify-center rounded-xl border-none transition-colors ${
            isActive
              ? "cursor-pointer bg-zinc-700 light:bg-slate-200 text-theme-text-primary light:text-theme-text-primary"
              : "cursor-pointer text-zinc-400 light:text-slate-600 hover:bg-zinc-800 light:hover:bg-slate-100 hover:text-theme-text-primary light:hover:text-theme-text-primary"
          }`}
        >
          <Icon size={18} weight={isActive ? "fill" : "regular"} />
        </button>
        {/* Live-Badge: Anzahl aktiver Runs */}
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#009ee0] text-white text-[10px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
        <Tooltip
          id={`rsib-${id}`}
          place={tooltipPlace}
          delayShow={300}
          positionStrategy="fixed"
          className="tooltip !text-xs z-[99]"
        />
      </div>
    );
  }

  return (
    <nav
      aria-label={t("common.rightSidebar")}
      className="my-2 mr-2 hidden h-[calc(100%-1rem)] w-14 flex-shrink-0 flex-col items-center gap-1 overflow-y-auto rounded-2xl border border-theme-modal-border bg-theme-bg-secondary py-2 md:flex"
    >
      {/* Bestehende Panel-Icons */}
      {icons.map(renderIcon)}

      {/* Divider zwischen den Abschnitten */}
      <div
        className="w-6 h-px bg-zinc-700 light:bg-slate-200 my-1.5"
        aria-hidden
      />

      {/* NEU: Agent-/Workspace-Abschnitt */}
      {agentIcons.map(renderIcon)}
    </nav>
  );
}
