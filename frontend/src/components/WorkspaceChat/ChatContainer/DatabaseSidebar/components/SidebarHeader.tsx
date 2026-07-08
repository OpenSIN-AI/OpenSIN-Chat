// SPDX-License-Identifier: MIT
// Database sidebar header with title, refresh, and close buttons
import { Database } from "@phosphor-icons/react/dist/csr/Database";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { useTranslation } from "react-i18next";

interface SidebarHeaderProps {
  loading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}

export function SidebarHeader({ loading, onRefresh, onClose }: SidebarHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
      <Database size={15} className="text-zinc-400 light:text-slate-500" />
      <p className="flex-1 font-medium text-sm text-theme-text-primary light:text-theme-text-primary">
        {t("sidebar.database.title", "Politiker-Datenbank")}
      </p>
      <button
        onClick={onRefresh}
        type="button"
        disabled={loading}
        className="text-zinc-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-1"
        aria-label={t("common.refresh", "Aktualisieren")}
      >
        <ArrowClockwise size={13} weight="bold" className={loading ? "animate-spin" : ""} />
      </button>
      <button
        onClick={onClose}
        type="button"
        aria-label={t("common.close", "Schließen")}
        className="text-theme-text-secondary light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-1"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  );
}
