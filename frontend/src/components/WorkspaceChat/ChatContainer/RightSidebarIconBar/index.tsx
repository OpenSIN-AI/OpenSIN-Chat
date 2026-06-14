// SPDX-License-Identifier: MIT
/**
 * Purpose: Always-visible icon rail for the right sidebar panels.
 * Docs: RightSidebarIconBar/index.doc.md
 */
import { Tooltip } from "react-tooltip";
import {
  Eye,
  FolderOpen,
  Database,
  Newspaper,
  BookOpen,
  Terminal,
  Brain,
  FilePdf,
} from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { useChatSidebar } from "../ChatSidebar";
import { useTranslation } from "react-i18next";
import paths from "@/utils/paths";

/**
 * The v0-style icon bar displayed to the right of the main chat area.
 * It controls which panel is shown in the right sidebar.
 * The icon bar is always visible; there is no collapse/expand toggle.
 */
export default function RightSidebarIconBar() {
  const { t } = useTranslation();
  const { activeSidebar, toggleSidebar } = useChatSidebar();
  const navigate = useNavigate();

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
    <div className="flex flex-col items-center gap-1 py-2 px-1 bg-zinc-900 light:bg-white h-full flex-shrink-0 w-[44px] my-2 mr-2 rounded-2xl overflow-hidden">
      {/* Panel icons — always visible, no toggle */}
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

      {/* Separator + navigation to the dedicated PDF analysis page */}
      <div className="w-6 my-1 border-t border-zinc-700 light:border-slate-200" />
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => navigate(paths.pdfAnalysis())}
          data-tooltip-id="rsib-pdf-analysis"
          data-tooltip-content={t("right_sidebar.icon_pdf_analysis", "PDF-Analyse")}
          aria-label={t("right_sidebar.icon_pdf_analysis", "PDF-Analyse")}
          className="flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all text-zinc-400 light:text-slate-500 hover:bg-zinc-800 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
        >
          <FilePdf size={18} weight="regular" />
        </button>
        <Tooltip
          id="rsib-pdf-analysis"
          place="left"
          delayShow={300}
          className="tooltip !text-xs z-99"
        />
      </div>
    </div>
  );
}
