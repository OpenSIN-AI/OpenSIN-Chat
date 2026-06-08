// SPDX-License-Identifier: MIT
import { Tooltip } from "react-tooltip";
import {
  SidebarSimple,
  Eye,
  FolderOpen,
  Database,
  Newspaper,
  BookOpen,
  Terminal,
  Brain,
} from "@phosphor-icons/react";
import { useChatSidebar } from "../ChatSidebar";
import { useTranslation } from "react-i18next";

/**
 * Always-visible toggle button for the right sidebar.
 * To be rendered INSIDE ChatContainer's flex layout, as the rightmost
 * element, so it stays at the edge regardless of sidebar collapse state.
 */
export function RightSidebarToggleButton() {
  const { t } = useTranslation();
  const { rightSidebarOpen, toggleRightSidebar } = useChatSidebar();

  return (
    <button
      type="button"
      onClick={toggleRightSidebar}
      data-tooltip-id="rsib-toggle"
      data-tooltip-content={
        rightSidebarOpen
          ? t("right_sidebar.icon_collapse", "Einklappen")
          : t("right_sidebar.icon_expand", "Rechte Seitenleiste")
      }
      aria-label={
        rightSidebarOpen
          ? t("right_sidebar.icon_collapse", "Einklappen")
          : t("right_sidebar.icon_expand", "Rechte Seitenleiste")
      }
      className={`hidden md:flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent cursor-pointer transition-all ${
        rightSidebarOpen
          ? "text-zinc-500 light:text-slate-400 hover:bg-zinc-800 light:hover:bg-slate-100 hover:text-zinc-200 light:hover:text-slate-700"
          : "text-zinc-400 light:text-slate-500 hover:bg-zinc-800 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
      }`}
    >
      <SidebarSimple
        size={18}
        className={`transition-transform duration-300 ${!rightSidebarOpen ? "rotate-180" : ""}`}
      />
      <Tooltip
        id="rsib-toggle"
        place="left"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </button>
  );
}

/**
 * The v0-style icon bar displayed to the right of the main chat area.
 * It controls which panel is shown in the right sidebar.
 */
export default function RightSidebarIconBar() {
  const { t } = useTranslation();
  const { activeSidebar, toggleSidebar } = useChatSidebar();

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
      id: "console",
      icon: Terminal,
      label: t("right_sidebar.icon_console", "Konsole & Terminal"),
      action: () => toggleSidebar("console"),
    },
  ];

  return (
    <div className="flex flex-col items-center gap-1 py-2 px-1 bg-zinc-900 light:bg-white h-full flex-shrink-0 w-[44px]">
      {/* Toggle-Button ganz oben — in-flow, kein absolute */}
      <RightSidebarToggleButton />
      {/* Trennlinie */}
      <div className="w-6 h-px bg-zinc-700 light:bg-slate-200 my-1 flex-shrink-0" />
      {(icons as any).map(({ id, icon: Icon, label, action }: any) => {
        const isActive = activeSidebar === id;
        return (
          <div key={id} className="flex flex-col items-center">
            <button
              type="button"
              onClick={action}
              data-tooltip-id={`rsib-${id}`}
              data-tooltip-content={label}
              aria-label={label}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all ${
                isActive
                  ? "bg-zinc-700 light:bg-slate-200 text-white light:text-slate-900"
                  : "text-zinc-400 light:text-slate-500 hover:bg-zinc-800 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
              }`}
            >
              <Icon size={18} weight={isActive ? "fill" : "regular"} />
            </button>
            <Tooltip
              id={`rsib-${id}`}
              place="left"
              delayShow={300}
              className="tooltip !text-xs z-99"
            />
          </div>
        );
      })}
    </div>
  );
}
