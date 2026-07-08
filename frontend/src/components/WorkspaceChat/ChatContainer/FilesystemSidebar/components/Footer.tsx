// SPDX-License-Identifier: MIT
// Footer with selection actions and item action messages
import { useTranslation } from "react-i18next";

interface FooterProps {
  selectedFiles: any[];
  onClearSelection: () => void;
  itemActionMsg: { success: boolean; message: string } | null;
  creatingType: string | null;
}

export function Footer({
  selectedFiles,
  onClearSelection,
  itemActionMsg,
  creatingType,
}: FooterProps) {
  const { t } = useTranslation();

  return (
    <>
      {selectedFiles.length > 0 && (
        <div className="border-t border-white/5 light:border-slate-200 p-3 bg-zinc-950 light:bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 light:text-slate-500 flex-1">
              {t("sidebar.filesystem.fileCount", {
                count: selectedFiles.length,
              })}
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-zinc-400 hover:text-theme-text-primary light:hover:text-theme-text-primary border-none bg-transparent cursor-pointer transition-colors"
            >
              {t("sidebar.filesystem.clearSelection")}
            </button>
          </div>
        </div>
      )}

      {itemActionMsg && !creatingType && (
        <div
          className={`mx-3 mb-3 text-xs px-3 py-2 rounded-lg ${
            itemActionMsg.success
              ? "bg-green-950/40 text-green-400 border border-green-800/50"
              : "bg-red-950/40 text-red-400 border border-red-800/50"
          }`}
        >
          {itemActionMsg.message}
        </div>
      )}
    </>
  );
}
