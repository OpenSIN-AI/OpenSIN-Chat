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
import { Robot } from "@phosphor-icons/react/dist/csr/Robot";
import { Gear } from "@phosphor-icons/react/dist/csr/Gear";
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

  // --- NEU: Agent-/Workspace-Section (getrennt durch Divider) ---
  const agentIcons = [
    {
      id: "agent-sessions",
      icon: Broadcast,
      label: t("right_sidebar.icon_agent_sessions", "Agent-Sessions"),
      action: () => toggleSidebar("agent-sessions"),
      badge: activeRunCount,
    },
    {
      id: "agent-settings",
      icon: Robot,
      label: t("right_sidebar.icon_agent_settings", "Agent-Einstellungen"),
      action: () => toggleSidebar("agent-settings"),
      badge: 0,
    },
    {
      id: "workspace-settings",
      icon: Gear,
      label: t(
        "right_sidebar.icon_workspace_settings",
        "Workspace-Einstellungen",
      ),
      action: () => toggleSidebar("workspace-settings"),
      badge: 0,
    },
  ];

  // --- Render helper (shared by both sections) ---
  function renderIcon({ id, icon: Icon, label, action, badge = 0 }: any) {
    const isActive = activeSidebar === id;
    // When a panel is open the icon bar sits at the far right — tooltip "left"
    // would fly off screen. Use "bottom" when any panel is active.
    const tooltipPlace = activeSidebar ? "bottom" : "left";
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
          className={`flex items-center justify-center w-8 h-8 rounded-lg border-none transition-all ${
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
          className="tooltip !text-xs z-99"
        />
      </div>
    );
  }

  return (
    <div className="hidden md:flex flex-col items-center gap-1 py-2 px-1 bg-zinc-900 light:bg-white h-full flex-shrink-0 w-[44px] my-2 mr-2 rounded-2xl overflow-y-auto no-scrollbar">
      {/* Bestehende Panel-Icons */}
      {icons.map(renderIcon)}

      {/* Divider zwischen den Abschnitten */}
      <div
        className="w-6 h-px bg-zinc-700 light:bg-slate-200 my-1.5"
        aria-hidden
      />

      {/* NEU: Agent-/Workspace-Abschnitt */}
      {agentIcons.map(renderIcon)}
    </div>
  );
}
