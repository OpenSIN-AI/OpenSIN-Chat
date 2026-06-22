// SPDX-License-Identifier: MIT
/**
 * Purpose: Always-visible icon rail for the right sidebar panels.
 * Docs: RightSidebarIconBar/index.doc.md
 */
import { Tooltip } from "react-tooltip";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { Newspaper } from "@phosphor-icons/react/dist/csr/Newspaper";
import { BookOpen } from "@phosphor-icons/react/dist/csr/BookOpen";
import { Brain } from "@phosphor-icons/react/dist/csr/Brain";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { useChatSidebar } from "../ChatSidebar";
import { useTranslation } from "react-i18next";

/**
 * The v0-style icon bar displayed to the right of the main chat area.
 * It controls which panel is shown in the right sidebar.
 * The icon bar is always visible; there is no collapse/expand toggle.
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
      disabled: true,
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
  ];

  return (
    <div className="flex flex-col items-center gap-1 py-2 px-1 bg-zinc-900 light:bg-white h-full flex-shrink-0 w-[44px] my-2 mr-2 rounded-2xl overflow-hidden">
      {/* Panel icons — always visible, no toggle */}
      {(icons as any).map(
        ({ id, icon: Icon, label, action, disabled }: any) => {
          const isActive = !disabled && activeSidebar === id;
          return (
            <div
              key={id}
              className="flex flex-col items-center"
              data-tooltip-id={`rsib-${id}`}
              data-tooltip-content={label}
            >
              <button
                type="button"
                onClick={disabled ? undefined : action}
                disabled={disabled}
                aria-label={label}
                aria-disabled={disabled}
                className={`flex items-center justify-center w-8 h-8 rounded-lg border-none transition-all ${
                  disabled
                    ? "opacity-50 cursor-not-allowed text-zinc-500 light:text-slate-400"
                    : isActive
                      ? "cursor-pointer bg-zinc-700 light:bg-slate-200 text-white light:text-slate-900"
                      : "cursor-pointer text-zinc-400 light:text-slate-500 hover:bg-zinc-800 light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900"
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
        },
      )}
    </div>
  );
}
