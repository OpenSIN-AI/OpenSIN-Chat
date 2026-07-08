// SPDX-License-Identifier: MIT
// Loading skeletons, error, empty state, and no search results
import { CloudArrowUp } from "@phosphor-icons/react/dist/csr/CloudArrowUp";
import { Upload } from "@phosphor-icons/react/dist/csr/Upload";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { useTranslation } from "react-i18next";

interface EmptyStatesProps {
  loading: boolean;
  error: string | null;
  items: any[];
  filteredItems: any[];
  onUploadClick: () => void;
}

export function EmptyStates({
  loading,
  error,
  items,
  filteredItems,
  onUploadClick,
}: EmptyStatesProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex flex-col gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-3 animate-pulse"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-800 light:bg-slate-200 flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3 w-32 rounded bg-zinc-800 light:bg-slate-200" />
              <div className="h-2 w-16 rounded bg-zinc-800 light:bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex items-center gap-2">
        <Warning size={16} weight="fill" className="flex-shrink-0" />
        <span>
          {t("sidebar.filesystem.error", "Fehler beim Laden:")} {error}
        </span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 light:bg-slate-100 flex items-center justify-center mb-4">
          <CloudArrowUp
            size={28}
            weight="duotone"
            className="text-zinc-500 light:text-slate-400"
          />
        </div>
        <p className="text-sm font-medium text-theme-text-primary light:text-theme-text-primary mb-1">
          {t("sidebar.filesystem.emptyTitle")}
        </p>
        <p className="text-xs text-zinc-500 light:text-slate-400 mb-4">
          {t("sidebar.filesystem.emptyHint")}
        </p>
        <button
          type="button"
          onClick={onUploadClick}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-200 light:text-slate-700 bg-white/5 light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 rounded-md px-3 py-1.5 transition-colors"
        >
          <Upload size={14} weight="bold" />
          {t("sidebar.filesystem.uploadFirst")}
        </button>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MagnifyingGlass
          size={24}
          weight="light"
          className="text-zinc-600 light:text-slate-300 mb-2"
        />
        <p className="text-xs text-zinc-500 light:text-slate-400">
          {t("sidebar.filesystem.noSearchResults")}
        </p>
      </div>
    );
  }

  return null;
}
