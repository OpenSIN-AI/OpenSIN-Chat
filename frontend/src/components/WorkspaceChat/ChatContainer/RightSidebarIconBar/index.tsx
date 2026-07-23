// SPDX-License-Identifier: MIT
// Purpose: Compact icon rail for workspace side panels — visually matches left sidebar icon area.
// Docs: index.doc.md
import { Tooltip } from "react-tooltip";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Newspaper } from "@phosphor-icons/react/dist/csr/Newspaper";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { Broadcast } from "@phosphor-icons/react/dist/csr/Broadcast";

import { useChatSidebar } from "../ChatSidebar";
import { useAgentRuns } from "../AgentSessionsSidebar/AgentRunsContext";
import { useTranslation } from "react-i18next";

export default function RightSidebarIconBar() {
  const { t } = useTranslation();
  const { activeSidebar, toggleSidebar } = useChatSidebar();
  const { activeRunCount } = useAgentRuns();

  const icons = [
    {
      id: "preview",
      icon: Eye,
      label: t("right_sidebar.icon_preview", "Vorschau"),
      action: () => toggleSidebar("preview"),
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
      id: "pdf-analysis",
      icon: FilePdf,
      label: t("right_sidebar.icon_pdf_analysis", "PDF-Analyse"),
      action: () => toggleSidebar("pdf-analysis"),
    },
  ];

  const agentIcons = [
    {
      id: "agent-sessions",
      icon: Broadcast,
      label: t("right_sidebar.icon_agent_sessions", "Agent-Sessions"),
      action: () => toggleSidebar("agent-sessions"),
      badge: activeRunCount,
    },
  ];

  function renderIcon({ id, icon: Icon, label, action, badge = 0 }: any) {
    const isActive = activeSidebar === id;
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
          className={`flex h-9 w-9 items-center justify-center rounded-lg border-none cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text-secondary ${
            isActive
              ? "bg-theme-bg-hover text-theme-text-primary"
              : "text-theme-text-secondary hover:bg-theme-bg-hover hover:text-theme-text-primary"
          }`}
        >
          <Icon size={17} weight={isActive ? "fill" : "regular"} />
        </button>
        {badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#009ee0] px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        )}
        <Tooltip
          id={`rsib-${id}`}
          place="left"
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
      className="mt-14 hidden h-[calc(100%_-_3.5rem)] w-12 flex-shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-l border-t border-white/[0.08] bg-theme-bg-sidebar px-1 py-2.5 md:flex light:border-zinc-200/70"
    >
      {icons.map(renderIcon)}
      <div className="my-1.5 h-px w-5 bg-theme-modal-border" aria-hidden />
      {agentIcons.map(renderIcon)}
    </nav>
  );
}
