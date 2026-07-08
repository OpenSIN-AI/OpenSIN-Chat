// SPDX-License-Identifier: MIT
// Header section with title, upload button, and system info
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Upload } from "@phosphor-icons/react/dist/csr/Upload";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { Cpu } from "@phosphor-icons/react/dist/csr/Cpu";
import { HardDrive } from "@phosphor-icons/react/dist/csr/HardDrive";
import { useTranslation } from "react-i18next";

interface SidebarHeaderProps {
  fileCount: number;
  uploading: boolean;
  loading: boolean;
  showSysInfo: boolean;
  creatingType: string | null;
  sysInfoRows: { icon: any; label: string; value: string }[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onUploadClick: () => void;
  onNewFileClick: () => void;
  onToggleSysInfo: () => void;
  onRefresh: () => void;
  onClose: () => void;
  onFileInputChange: (e: any) => void;
}

export function SidebarHeader({
  fileCount,
  uploading,
  loading,
  showSysInfo,
  sysInfoRows,
  fileInputRef,
  onUploadClick,
  onNewFileClick,
  onToggleSysInfo,
  onRefresh,
  onClose,
  onFileInputChange,
}: SidebarHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-white/5 light:border-slate-200">
        <FolderOpen size={18} weight="fill" className="text-zinc-300 light:text-slate-400 flex-shrink-0" />
        <p className="flex-1 font-semibold text-sm text-theme-text-primary light:text-theme-text-primary">
          {t("sidebar.filesystem.title")}
        </p>
        {fileCount > 0 && (
          <span className="text-[10px] font-bold text-zinc-400 light:text-slate-500 bg-zinc-800 light:bg-slate-100 rounded-full px-2 py-0.5">
            {fileCount}
          </span>
        )}
        <button
          type="button"
          onClick={onUploadClick}
          disabled={uploading}
          className="flex items-center gap-1 text-xs font-medium text-zinc-200 light:text-slate-700 bg-white/5 light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 rounded-md px-2 py-1 transition-colors disabled:opacity-40"
          aria-label={t("sidebar.filesystem.upload")}
        >
          <Upload size={14} weight="bold" />
          <span className="hidden lg:inline">{t("sidebar.filesystem.upload")}</span>
        </button>
        <button
          type="button"
          onClick={onNewFileClick}
          className="flex items-center justify-center text-zinc-400 light:text-slate-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-1"
          aria-label={t("sidebar.filesystem.newFile")}
        >
          <Plus size={16} weight="bold" />
        </button>
        <button
          type="button"
          onClick={onToggleSysInfo}
          className="text-zinc-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-1"
          aria-label={t("sidebar.filesystem.systemInfo")}
        >
          <Info size={14} weight="bold" />
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="text-zinc-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-1"
          aria-label={t("common.refresh")}
        >
          <ArrowClockwise size={14} weight="bold" className={loading ? "animate-spin" : ""} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="text-zinc-400 light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-1"
        >
          <X size={16} weight="bold" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFileInputChange}
          accept=".txt,.md,.pdf,.csv,.json,.html,.docx,.doc,.rtf,.epub,.xlsx,.pptx,.xml,.yaml,.yml,.png,.jpg,.jpeg,.gif,.svg,.webp,.bmp,.tiff,.mp4,.avi,.mov,.mkv,.webm,.mp3,.wav,.flac,.ogg,.m4a,.zip,.tar,.gz,.rar,.7z,.js,.ts,.jsx,.tsx,.py,.go,.rs,.java,.c,.cpp"
        />
      </div>

      {showSysInfo && (
        <div className="px-4 py-3 border-b border-white/5 light:border-slate-200 bg-zinc-950/50 light:bg-slate-50">
          <div className="flex flex-col gap-2">
            {sysInfoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon size={12} className="text-zinc-500 light:text-slate-400 flex-shrink-0" />
                <span className="text-[10px] text-zinc-500 light:text-slate-400 uppercase tracking-widest flex-shrink-0">
                  {label}
                </span>
                <span className="text-xs font-mono text-zinc-300 light:text-slate-700 ml-auto truncate">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
