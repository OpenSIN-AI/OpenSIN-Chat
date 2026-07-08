// SPDX-License-Identifier: MIT
// Search bar, new file/folder creation, and breadcrumbs
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Folder } from "@phosphor-icons/react/dist/csr/Folder";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { useTranslation } from "react-i18next";

interface SearchAndCreateProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  creatingType: string | null;
  newItemName: string;
  onNewItemNameChange: (value: string) => void;
  onCreateItem: () => void;
  onCancelCreate: () => void;
  itemActionMsg: { success: boolean; message: string } | null;
  currentPath: string | null;
  parentPath: string | null;
  breadcrumbs: { name: string; path: string }[];
  onNavigateUp: () => void;
  onNavigateTo: (path: string) => void;
}

export function SearchAndCreate({
  searchQuery,
  onSearchChange,
  creatingType,
  newItemName,
  onNewItemNameChange,
  onCreateItem,
  onCancelCreate,
  itemActionMsg,
  currentPath,
  parentPath,
  breadcrumbs,
  onNavigateUp,
  onNavigateTo,
}: SearchAndCreateProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Search bar */}
      <div className="px-3 py-2 border-b border-white/5 light:border-slate-200 shrink-0">
        <div className="relative">
          <MagnifyingGlass
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 light:text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("sidebar.filesystem.searchPlaceholder")}
            aria-label={t("sidebar.filesystem.searchPlaceholder")}
            className="w-full text-xs bg-zinc-800 light:bg-slate-100 border border-white/5 light:border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-theme-text-primary light:text-theme-text-primary placeholder:text-zinc-500 light:placeholder:text-slate-400 focus:outline-none focus:border-zinc-600 light:focus:border-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label={t("common.clear", "Clear search")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer"
            >
              <X size={12} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* New file/folder creation */}
      {creatingType && (
        <div className="px-3 py-2 border-b border-white/5 light:border-slate-200 shrink-0 bg-zinc-800/50 light:bg-slate-50">
          <div className="flex items-center gap-1.5">
            {creatingType === "folder" ? (
              <Folder
                size={14}
                weight="fill"
                className="text-blue-400 flex-shrink-0"
              />
            ) : (
              <FileText size={14} className="text-zinc-400 flex-shrink-0" />
            )}
            <input
              autoFocus
              type="text"
              value={newItemName}
              onChange={(e) => onNewItemNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreateItem();
                else if (e.key === "Escape") onCancelCreate();
              }}
              placeholder={
                creatingType === "folder"
                  ? t("sidebar.filesystem.folderName")
                  : t("sidebar.filesystem.fileName")
              }
              className="flex-1 text-xs bg-zinc-950 light:bg-white border border-zinc-700 light:border-slate-300 rounded-md px-2 py-1 text-theme-text-primary light:text-theme-text-primary focus:outline-none focus:border-zinc-500"
            />
            <button
              type="button"
              onClick={onCreateItem}
              disabled={!newItemName.trim()}
              className="text-xs font-medium text-zinc-200 light:text-slate-700 bg-white/5 light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 rounded-md px-2 py-1 transition-colors disabled:opacity-40"
            >
              {t("sidebar.filesystem.create")}
            </button>
            <button
              type="button"
              onClick={onCancelCreate}
              className="text-xs text-zinc-400 hover:text-theme-text-primary light:hover:text-theme-text-primary border-none bg-transparent cursor-pointer transition-colors"
            >
              {t("sidebar.filesystem.cancel")}
            </button>
          </div>
          {itemActionMsg && (
            <div
              className={`mt-1.5 text-[10px] px-2 py-1 rounded-md ${
                itemActionMsg.success
                  ? "bg-green-950/40 text-green-400 border border-green-800/50"
                  : "bg-red-950/40 text-red-400 border border-red-800/50"
              }`}
            >
              {itemActionMsg.message}
            </div>
          )}
        </div>
      )}

      {/* Breadcrumbs */}
      {currentPath !== null && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 light:border-slate-200 overflow-x-auto no-scrollbar shrink-0">
          {parentPath !== null && (
            <button
              type="button"
              onClick={onNavigateUp}
              className="text-zinc-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer shrink-0"
              aria-label={t("sidebar.filesystem.goUp")}
            >
              <ArrowLeft size={14} weight="bold" />
            </button>
          )}
          {breadcrumbs.map((crumb, i) => (
            <div
              key={crumb.path}
              className="flex items-center gap-1 flex-shrink-0"
            >
              {i > 0 && (
                <span className="text-zinc-700 light:text-slate-300 text-xs">
                  /
                </span>
              )}
              <button
                type="button"
                onClick={() => onNavigateTo(crumb.path)}
                className={`text-xs border-none bg-transparent cursor-pointer transition-colors ${
                  i === breadcrumbs.length - 1
                    ? "text-theme-text-primary light:text-theme-text-primary font-medium"
                    : "text-zinc-400 hover:text-theme-text-primary light:hover:text-theme-text-primary"
                }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
