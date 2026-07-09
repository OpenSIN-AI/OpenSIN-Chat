// SPDX-License-Identifier: MIT
// File list section: folder trees, upload files, and report files
import { Folder } from "@phosphor-icons/react/dist/csr/Folder";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { Upload } from "@phosphor-icons/react/dist/csr/Upload";
import { ChartBar } from "@phosphor-icons/react/dist/csr/ChartBar";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Download } from "@phosphor-icons/react/dist/csr/Download";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { SpinnerGap } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { useTranslation } from "react-i18next";
import {
  getFileIcon,
  getFileColor,
  formatSize,
  formatRelativeDate,
} from "../helpers";

interface FileListProps {
  folders: any[];
  uploadFiles: any[];
  reportFiles: any[];
  selectedFiles: any[];
  expandedFolders: Record<string, any>;
  collapsedSections: Record<string, boolean>;
  deletingPath: string | null;
  onToggleFolder: (path: string) => void;
  onToggleSection: (section: string) => void;
  onToggleFileSelection: (file: any) => void;
  onDownload: (item: any) => void;
  onDelete: (itemPath: string, itemName: string) => void;
}

export function FileList({
  folders,
  uploadFiles,
  reportFiles,
  selectedFiles,
  expandedFolders,
  collapsedSections,
  deletingPath,
  onToggleFolder,
  onToggleSection,
  onToggleFileSelection,
  onDownload,
  onDelete,
}: FileListProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-0.5">
      {/* Folders — expandable inline trees */}
      {folders.map((item) => {
        const folderState = expandedFolders[item.path];
        const isExpanded = !!folderState;
        const folderItems = folderState?.items || [];
        const folderLoading = folderState?.loading;
        const subFolders = folderItems.filter(
          (i: any) => i.type === "directory",
        );
        const subFiles = folderItems.filter((i: any) => i.type === "file");
        return (
          <div key={item.path}>
            <div
              onClick={() => onToggleFolder(item.path)}
              className="group flex items-center gap-2 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-white/5 light:hover:bg-slate-50"
            >
              {isExpanded ? (
                <CaretDown
                  size={12}
                  weight="bold"
                  className="text-zinc-500 light:text-slate-400 flex-shrink-0"
                />
              ) : (
                <CaretRight
                  size={12}
                  weight="bold"
                  className="text-zinc-500 light:text-slate-400 flex-shrink-0"
                />
              )}
              <div className="w-7 h-7 rounded-lg bg-white/5 light:bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Folder
                  size={14}
                  weight="fill"
                  className={
                    isExpanded
                      ? "text-zinc-200 light:text-slate-600"
                      : "text-zinc-400 light:text-slate-500"
                  }
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-theme-text-primary light:text-theme-text-primary font-medium truncate">
                  {item.name}
                </p>
                <p className="text-xs text-zinc-500 light:text-slate-400">
                  {formatRelativeDate(item.modifiedAt, t)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.path, item.name);
                }}
                disabled={deletingPath === item.path}
                className="text-zinc-600 light:text-slate-400 hover:text-red-400 light:hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer p-1"
                aria-label={t("sidebar.filesystem.delete")}
              >
                {deletingPath === item.path ? (
                  <SpinnerGap
                    size={14}
                    weight="bold"
                    className="animate-spin"
                  />
                ) : (
                  <Trash size={14} weight="regular" />
                )}
              </button>
            </div>
            {isExpanded && (
              <div className="ml-4 border-l border-white/5 light:border-slate-200 pl-1">
                {folderLoading && (
                  <div className="px-2.5 py-2">
                    <SpinnerGap
                      size={12}
                      weight="bold"
                      className="animate-spin text-zinc-500"
                    />
                  </div>
                )}
                {folderState?.error && (
                  <div className="mx-2.5 my-1.5 p-2 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex items-center gap-2">
                    <Warning
                      size={12}
                      weight="fill"
                      className="flex-shrink-0"
                    />
                    <span>
                      {t("sidebar.filesystem.error", "Fehler beim Laden:")}{" "}
                      {folderState.error}
                    </span>
                  </div>
                )}
                {!folderLoading &&
                  !folderState?.error &&
                  folderItems.length === 0 && (
                    <p className="px-2.5 py-1.5 text-xs text-zinc-600 light:text-slate-400">
                      {t("sidebar.filesystem.folderEmpty", "Empty")}
                    </p>
                  )}
                {!folderLoading &&
                  !folderState?.error &&
                  subFolders.map((sub: any) => (
                    <div
                      key={sub.path}
                      onClick={() => onToggleFolder(sub.path)}
                      className="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all hover:bg-white/5 light:hover:bg-slate-50"
                    >
                      {expandedFolders[sub.path] ? (
                        <CaretDown
                          size={10}
                          weight="bold"
                          className="text-zinc-500 flex-shrink-0"
                        />
                      ) : (
                        <CaretRight
                          size={10}
                          weight="bold"
                          className="text-zinc-500 flex-shrink-0"
                        />
                      )}
                      <Folder
                        size={12}
                        weight="fill"
                        className="text-zinc-400 light:text-slate-500 flex-shrink-0"
                      />
                      <p className="text-xs text-theme-text-primary light:text-theme-text-primary font-medium truncate flex-1 min-w-0">
                        {sub.name}
                      </p>
                    </div>
                  ))}
                {!folderLoading &&
                  !folderState?.error &&
                  subFiles.map((file: any) => {
                    const Icon = getFileIcon(file.ext);
                    const iconColor = getFileColor(file.ext);
                    return (
                      <div
                        key={file.path}
                        onClick={() => onToggleFileSelection(file)}
                        className="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all hover:bg-white/5 light:hover:bg-slate-50"
                      >
                        <div className="w-6 h-6 rounded-md bg-white/5 light:bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Icon
                            size={12}
                            weight="regular"
                            className={iconColor}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-theme-text-primary light:text-theme-text-primary font-medium truncate">
                            {file.name}
                          </p>
                          <span className="text-[10px] text-zinc-500 light:text-slate-400">
                            {formatSize(file.size)}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownload(file);
                            }}
                            className="text-zinc-500 light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-0.5"
                          >
                            <Download size={12} weight="regular" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(file.path, file.name);
                            }}
                            className="text-zinc-500 light:text-slate-400 hover:text-red-400 light:hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer p-0.5"
                          >
                            <Trash size={12} weight="regular" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}

      {/* Section: Uploads */}
      {uploadFiles.length > 0 && (
        <FileSection
          sectionKey="uploads"
          label={t("sidebar.filesystem.sectionUploads", "Uploads")}
          count={uploadFiles.length}
          icon={<Upload size={12} weight="bold" className="flex-shrink-0" />}
          collapsed={!!collapsedSections.uploads}
          onToggle={() => onToggleSection("uploads")}
          items={uploadFiles}
          selectedFiles={selectedFiles}
          deletingPath={deletingPath}
          onToggleFileSelection={onToggleFileSelection}
          onDownload={onDownload}
          onDelete={onDelete}
          t={t}
        />
      )}

      {/* Section: Analyse-Berichte */}
      {reportFiles.length > 0 && (
        <FileSection
          sectionKey="reports"
          label={t("sidebar.filesystem.sectionReports", "Analyse-Berichte")}
          count={reportFiles.length}
          icon={<ChartBar size={12} weight="bold" className="flex-shrink-0" />}
          collapsed={!!collapsedSections.reports}
          onToggle={() => onToggleSection("reports")}
          items={reportFiles}
          selectedFiles={selectedFiles}
          deletingPath={deletingPath}
          onToggleFileSelection={onToggleFileSelection}
          onDownload={onDownload}
          onDelete={onDelete}
          t={t}
        />
      )}
    </div>
  );
}

interface FileSectionProps {
  sectionKey: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  items: any[];
  selectedFiles: any[];
  deletingPath: string | null;
  onToggleFileSelection: (file: any) => void;
  onDownload: (item: any) => void;
  onDelete: (itemPath: string, itemName: string) => void;
  t: any;
}

function FileSection({
  sectionKey,
  label,
  count,
  icon,
  collapsed,
  onToggle,
  items,
  selectedFiles,
  deletingPath,
  onToggleFileSelection,
  onDownload,
  onDelete,
  t,
}: FileSectionProps) {
  return (
    <div className={sectionKey === "reports" ? "mt-3" : "mt-2"}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary border-none bg-transparent cursor-pointer transition-colors"
      >
        <CaretDown
          size={12}
          weight="bold"
          className={`transition-transform flex-shrink-0 ${collapsed ? "-rotate-90" : ""}`}
        />
        {icon}
        {label}
        <span className="text-[10px] font-normal text-zinc-600 light:text-slate-400 normal-case tracking-normal">
          {count}
        </span>
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = getFileIcon(item.ext);
            const iconColor = getFileColor(item.ext);
            const isSelected = selectedFiles.some((f) => f.path === item.path);
            return (
              <div
                key={item.path}
                onClick={() => onToggleFileSelection(item)}
                className={`group flex items-center gap-3 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? "bg-white/10 light:bg-slate-100 border border-white/15 light:border-slate-300"
                    : "hover:bg-white/5 light:hover:bg-slate-50 border border-transparent"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 light:bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} weight="regular" className={iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-theme-text-primary light:text-theme-text-primary font-medium truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 light:text-slate-400">
                      {formatSize(item.size)}
                    </span>
                    {item.modifiedAt && (
                      <>
                        <span className="text-zinc-700 light:text-slate-300 text-xs">
                          ·
                        </span>
                        <span className="text-xs text-zinc-500 light:text-slate-400">
                          {formatRelativeDate(item.modifiedAt, t)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle
                    size={16}
                    weight="fill"
                    className="text-zinc-300 light:text-slate-500 flex-shrink-0"
                  />
                )}
                <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(item);
                    }}
                    className="text-zinc-500 light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-0.5"
                    aria-label={t("sidebar.filesystem.download")}
                  >
                    <Download size={14} weight="regular" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.path, item.name);
                    }}
                    disabled={deletingPath === item.path}
                    className="text-zinc-500 light:text-slate-400 hover:text-red-400 light:hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer p-0.5"
                    aria-label={t("sidebar.filesystem.delete")}
                  >
                    {deletingPath === item.path ? (
                      <SpinnerGap
                        size={14}
                        weight="bold"
                        className="animate-spin"
                      />
                    ) : (
                      <Trash size={14} weight="regular" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
