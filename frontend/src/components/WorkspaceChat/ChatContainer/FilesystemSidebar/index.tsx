// SPDX-License-Identifier: MIT
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Folder } from "@phosphor-icons/react/dist/csr/Folder";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { FileImage } from "@phosphor-icons/react/dist/csr/FileImage";
import { FileCode } from "@phosphor-icons/react/dist/csr/FileCode";
import { FileVideo } from "@phosphor-icons/react/dist/csr/FileVideo";
import { FileAudio } from "@phosphor-icons/react/dist/csr/FileAudio";
import { FileArchive } from "@phosphor-icons/react/dist/csr/FileArchive";
import { File } from "@phosphor-icons/react/dist/csr/File";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { HardDrive } from "@phosphor-icons/react/dist/csr/HardDrive";
import { Cpu } from "@phosphor-icons/react/dist/csr/Cpu";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { Upload } from "@phosphor-icons/react/dist/csr/Upload";
import { CloudArrowUp } from "@phosphor-icons/react/dist/csr/CloudArrowUp";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { Download } from "@phosphor-icons/react/dist/csr/Download";
import { SpinnerGap } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { Warning } from "@phosphor-icons/react/dist/csr/Warning";
import { ChartBar } from "@phosphor-icons/react/dist/csr/ChartBar";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretRight } from "@phosphor-icons/react/dist/csr/CaretRight";
import { useTranslation } from "react-i18next";
import { useFilesystem } from "@/hooks/useFilesystem";
import { useFileBrowser } from "@/hooks/useFileBrowser";
import { baseHeaders } from "@/utils/request";
import { API_BASE } from "@/utils/constants";
import showToast from "@/utils/toast";
import ChatSidebar, { useFilesystemSidebar } from "../ChatSidebar";

const ALL_FILE_EXTENSIONS = [
  ".txt",
  ".md",
  ".pdf",
  ".csv",
  ".json",
  ".html",
  ".docx",
  ".doc",
  ".rtf",
  ".epub",
  ".xlsx",
  ".pptx",
  ".xml",
  ".yaml",
  ".yml",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".bmp",
  ".tiff",
  ".mp4",
  ".avi",
  ".mov",
  ".mkv",
  ".webm",
  ".mp3",
  ".wav",
  ".flac",
  ".ogg",
  ".m4a",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
];

const IMAGE_EXTS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".bmp",
  ".tiff",
];
const VIDEO_EXTS = [".mp4", ".avi", ".mov", ".mkv", ".webm"];
const AUDIO_EXTS = [".mp3", ".wav", ".flac", ".ogg", ".m4a"];
const ARCHIVE_EXTS = [".zip", ".tar", ".gz", ".rar", ".7z"];
const CODE_EXTS = [
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".c",
  ".cpp",
];

function getFileIcon(ext) {
  if (ext === ".pdf") return FilePdf;
  if (IMAGE_EXTS.includes(ext)) return FileImage;
  if (VIDEO_EXTS.includes(ext)) return FileVideo;
  if (AUDIO_EXTS.includes(ext)) return FileAudio;
  if (ARCHIVE_EXTS.includes(ext)) return FileArchive;
  if (CODE_EXTS.includes(ext)) return FileCode;
  if (ALL_FILE_EXTENSIONS.includes(ext)) return FileText;
  return File;
}

function getFileColor(ext) {
  if (ext === ".pdf") return "text-red-400 light:text-red-500";
  if (IMAGE_EXTS.includes(ext)) return "text-green-400 light:text-green-500";
  if (VIDEO_EXTS.includes(ext)) return "text-purple-400 light:text-purple-500";
  if (AUDIO_EXTS.includes(ext)) return "text-amber-400 light:text-amber-500";
  if (ARCHIVE_EXTS.includes(ext))
    return "text-orange-400 light:text-orange-500";
  if (CODE_EXTS.includes(ext)) return "text-blue-400 light:text-blue-500";
  return "text-zinc-400 light:text-slate-500";
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatRelativeDate(dateStr, t) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t("sidebar.filesystem.today", "heute");
  if (diffDays === 1) return t("sidebar.filesystem.yesterday", "gestern");
  if (diffDays < 7)
    return t("sidebar.filesystem.daysAgo", "vor {{count}} Tagen", {
      count: diffDays,
    });
  if (diffDays < 30)
    return t("sidebar.filesystem.weeksAgo", "vor {{count}} Wochen", {
      count: Math.floor(diffDays / 7),
    });
  return date.toLocaleDateString();
}

function getBreadcrumbs(path, t) {
  const crumbs = [{ name: t("sidebar.filesystem.uploadsRoot"), path: "" }];
  if (!path) return crumbs;
  const parts = path.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? current + "/" + part : part;
    crumbs.push({ name: part, path: current });
  }
  return crumbs;
}

export default function FilesystemSidebar({ workspace = null }: any) {
  const { sidebarOpen, closeSidebar } = useFilesystemSidebar();
  const { t } = useTranslation();
  const { slug: paramSlug } = useParams();
  const workspaceSlug = workspace?.slug || paramSlug || "opensin-chat";
  const { data: sysInfo } = useFilesystem();
  const {
    currentPath,
    items,
    parentPath,
    loading,
    error,
    selectedFiles,
    browse,
    navigateTo,
    navigateUp,
    createDirectory,
    createFile,
    deleteItem,
    toggleFileSelection,
    clearSelection,
  } = useFileBrowser();

  const [showSysInfo, setShowSysInfo] = useState(false);
  const [creatingType, setCreatingType] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [itemActionMsg, setItemActionMsg] = useState(null);
  const [deletingPath, setDeletingPath] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
    name: "",
  });
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    if (sidebarOpen && currentPath === null) {
      browse("");
    }
  }, [sidebarOpen, currentPath, browse]);

  const breadcrumbs = getBreadcrumbs(currentPath, t);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const fileCount = useMemo(
    () => items.filter((i) => i.type === "file").length,
    [items],
  );

  const handleDelete = useCallback(
    async (itemPath, itemName) => {
      if (
        !window.confirm(
          t("sidebar.filesystem.confirmDelete") +
            (itemName ? `\n${itemName}` : ""),
        )
      )
        return;
      setDeletingPath(itemPath);
      setItemActionMsg(null);
      try {
        await deleteItem(itemPath);
        setItemActionMsg({
          success: true,
          message: t("sidebar.filesystem.deleteSuccess"),
        });
        browse(currentPath || "");
      } catch (err) {
        setItemActionMsg({
          success: false,
          message: `${t("sidebar.filesystem.deleteFailed")}: ${err?.message ?? err}`,
        });
      } finally {
        setDeletingPath(null);
      }
    },
    [deleteItem, browse, currentPath, t],
  );

  const handleUploadFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;
      setUploading(true);
      setUploadProgress({
        current: 0,
        total: files.length,
        name: files[0].name,
      });
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i, total: files.length, name: file.name });
        try {
          const formData = new FormData();
          formData.append("file", file, file.name);
          const res = await fetch(
            `${API_BASE}/utils/upload-file?path=${encodeURIComponent(currentPath || "")}`,
            {
              method: "POST",
              headers: baseHeaders(),
              body: formData,
            },
          );
          if (res.ok) {
            successCount++;
          } else {
            const data = await res.json().catch(() => ({}));
            showToast(
              `${file.name}: ${data?.error || t("sidebar.filesystem.uploadFailed")}`,
              "error",
            );
          }
        } catch (e) {
          showToast(
            `${file.name}: ${e?.message || t("sidebar.filesystem.uploadFailed")}`,
            "error",
          );
        }
      }
      setUploadProgress({
        current: files.length,
        total: files.length,
        name: "",
      });
      if (successCount > 0) {
        showToast(
          t("sidebar.filesystem.uploadSuccess", {
            count: successCount,
          }),
          "success",
        );
        browse(currentPath || "");
      }
      setUploading(false);
      setUploadProgress({ current: 0, total: 0, name: "" });
    },
    [browse, currentPath, t],
  );

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types && e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleUploadFiles(e.dataTransfer.files);
      }
    },
    [handleUploadFiles],
  );

  const handleFileInputChange = useCallback(
    (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleUploadFiles(e.target.files);
      }
      e.target.value = "";
    },
    [handleUploadFiles],
  );

  const handleCreateItem = useCallback(async () => {
    if (!newItemName.trim()) return;
    const fn = creatingType === "folder" ? createDirectory : createFile;
    try {
      await fn(newItemName.trim(), currentPath || "");
      setItemActionMsg({
        success: true,
        message: t("sidebar.filesystem.createSuccess"),
      });
      setCreatingType(null);
      setNewItemName("");
      browse(currentPath || "");
    } catch (err) {
      setItemActionMsg({
        success: false,
        message: `${t("sidebar.filesystem.createFailed")}: ${err?.message ?? err}`,
      });
    }
  }, [
    creatingType,
    createDirectory,
    createFile,
    newItemName,
    currentPath,
    browse,
    t,
  ]);

  const handleDownload = useCallback(
    async (item) => {
      try {
        const res = await fetch(
          `${API_BASE}/utils/download-file?path=${encodeURIComponent(item.path)}`,
          { headers: baseHeaders() },
        );
        if (!res.ok) throw new Error("Download failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(t("sidebar.filesystem.downloadStarted"), "info");
      } catch (e) {
        showToast(t("sidebar.filesystem.downloadFailed"), "error");
      }
    },
    [t],
  );

  const sysInfoRows = sysInfo
    ? [
        {
          icon: Cpu,
          label: t("sidebar.filesystem.sysInfoPlatform", "Plattform"),
          value: `${sysInfo.platform} (${sysInfo.arch})`,
        },
        { icon: Cpu, label: "Node.js", value: sysInfo.nodeVersion },
        {
          icon: HardDrive,
          label: t("sidebar.filesystem.sysInfoStorageFree", "Speicher frei"),
          value:
            sysInfo.storage?.current != null
              ? `${sysInfo.storage.current} GB / ${sysInfo.storage.capacity} GB`
              : "—",
        },
        {
          icon: Cpu,
          label: t("sidebar.filesystem.sysInfoRamFree", "RAM frei"),
          value: `${sysInfo.freeMemMB} MB / ${sysInfo.totalMemMB} MB`,
        },
        {
          icon: FolderOpen,
          label: t("sidebar.filesystem.sysInfoStorage", "Storage"),
          value: sysInfo.uploadPath,
        },
      ]
    : [];

  const folders = filteredItems.filter((item) => item.type === "directory");
  const allFiles = filteredItems.filter((item) => item.type === "file");

  const REPORT_KEYWORDS = [
    "bericht",
    "report",
    "analyse",
    "analysis",
    "summary",
    "zusammenfassung",
    "pdf-report",
    "ki-bericht",
  ];
  const reportFiles = allFiles.filter((item) => {
    const nameLower = item.name.toLowerCase();
    return (
      REPORT_KEYWORDS.some((kw) => nameLower.includes(kw)) ||
      (item.ext === ".pdf" && nameLower.includes("bericht"))
    );
  });
  const uploadFiles = allFiles.filter((item) => !reportFiles.includes(item));

  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleFolder = useCallback(
    async (folderPath) => {
      setExpandedFolders((prev) => {
        const isExpanded = !!prev[folderPath];
        const next = { ...prev };
        if (isExpanded) {
          delete next[folderPath];
        } else {
          next[folderPath] = { items: [], loading: true };
        }
        return next;
      });

      if (!expandedFolders[folderPath]) {
        try {
          const res = await fetch(
            `${API_BASE}/utils/browse-directory?path=${encodeURIComponent(folderPath)}`,
            { headers: baseHeaders() },
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setExpandedFolders((prev) => ({
            ...prev,
            [folderPath]: { items: data.items || [], loading: false },
          }));
        } catch (e) {
          setExpandedFolders((prev) => ({
            ...prev,
            [folderPath]: { items: [], loading: false, error: e.message },
          }));
        }
      }
    },
    [expandedFolders],
  );

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div
        className="w-full h-full bg-zinc-900 light:bg-white flex flex-col overflow-hidden"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-50 bg-zinc-900/95 light:bg-white/95 flex items-center justify-center rounded-2xl border-2 border-dashed border-white/20 light:border-slate-300">
            <div className="flex flex-col items-center gap-3">
              <CloudArrowUp
                size={48}
                weight="duotone"
                className="text-zinc-300 light:text-slate-400"
              />
              <p className="text-lg font-semibold text-theme-text-primary light:text-theme-text-primary">
                {t("sidebar.filesystem.dropHere")}
              </p>
              <p className="text-sm text-zinc-400 light:text-slate-500">
                {t("sidebar.filesystem.dropHint")}
              </p>
            </div>
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div className="absolute top-0 left-0 right-0 z-40 bg-zinc-800/95 light:bg-slate-800/95 px-4 py-2 flex items-center gap-3">
            <SpinnerGap
              size={16}
              weight="bold"
              className="text-white animate-spin flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {uploadProgress.name}
              </p>
              <div className="mt-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{
                    width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-xs text-theme-text-primary flex-shrink-0">
              {uploadProgress.current + 1}/{uploadProgress.total}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-white/5 light:border-slate-200">
          <FolderOpen
            size={18}
            weight="fill"
            className="text-zinc-300 light:text-slate-400 flex-shrink-0"
          />
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
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs font-medium text-zinc-200 light:text-slate-700 bg-white/5 light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 disabled:opacity-50 rounded-lg px-2.5 py-1.5 border border-white/10 light:border-slate-200 cursor-pointer transition-colors"
            aria-label={t("sidebar.filesystem.upload")}
          >
            <Upload size={14} weight="bold" />
            <span className="hidden lg:inline">
              {t("sidebar.filesystem.upload")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCreatingType(creatingType === "file" ? null : "file");
              setNewItemName("");
              setItemActionMsg(null);
            }}
            className="flex items-center justify-center text-zinc-400 light:text-slate-500 hover:text-theme-text-primary light:hover:text-theme-text-primary hover:bg-white/5 light:hover:bg-slate-100 rounded-lg w-7 h-7 border-none cursor-pointer transition-colors"
            aria-label={t("sidebar.filesystem.newFile")}
          >
            <Plus size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setShowSysInfo(!showSysInfo)}
            className="text-zinc-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer"
            aria-label={t("sidebar.filesystem.systemInfo")}
          >
            <Info size={14} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => browse(currentPath || "")}
            disabled={loading}
            className="text-zinc-500 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40"
            aria-label={t("common.refresh")}
          >
            <ArrowClockwise
              size={14}
              weight="bold"
              className={loading ? "animate-spin" : ""}
            />
          </button>
          <button
            type="button"
            onClick={closeSidebar}
            aria-label={t("common.close")}
            className="text-zinc-400 light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={16} weight="bold" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            accept=".txt,.md,.pdf,.csv,.json,.html,.docx,.doc,.rtf,.epub,.xlsx,.pptx,.xml,.yaml,.yml,.png,.jpg,.jpeg,.gif,.svg,.webp,.mp4,.avi,.mov,.mkv,.webm,.mp3,.wav,.flac,.ogg,.m4a,.zip,.tar,.gz,.rar,.7z"
          />
        </div>

        {/* System info (collapsible) */}
        {showSysInfo && (
          <div className="px-4 py-3 border-b border-white/5 light:border-slate-200 bg-zinc-950/50 light:bg-slate-50">
            <div className="flex flex-col gap-2">
              {sysInfoRows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon
                    size={12}
                    className="text-zinc-500 light:text-slate-400 flex-shrink-0"
                  />
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("sidebar.filesystem.searchPlaceholder")}
              className="w-full text-xs bg-zinc-800 light:bg-slate-100 border border-white/5 light:border-slate-200 rounded-lg pl-8 pr-3 py-2 text-theme-text-primary light:text-theme-text-primary placeholder:text-zinc-500 light:placeholder:text-slate-400 outline-none focus:border-white/20 light:focus:border-slate-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
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
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateItem();
                  else if (e.key === "Escape") {
                    setCreatingType(null);
                    setNewItemName("");
                  }
                }}
                placeholder={
                  creatingType === "folder"
                    ? t("sidebar.filesystem.folderName")
                    : t("sidebar.filesystem.fileName")
                }
                className="flex-1 text-xs bg-zinc-950 light:bg-white border border-zinc-700 light:border-slate-300 rounded-md px-2 py-1.5 text-theme-text-primary light:text-theme-text-primary outline-none focus:border-white/30 light:focus:border-slate-400"
              />
              <button
                type="button"
                onClick={handleCreateItem}
                disabled={!newItemName.trim()}
                className="text-xs font-medium text-zinc-200 light:text-slate-700 bg-white/5 light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 disabled:opacity-40 px-2 py-1.5 rounded-md border border-white/10 light:border-slate-200 cursor-pointer transition-colors"
              >
                {t("sidebar.filesystem.create")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingType(null);
                  setNewItemName("");
                }}
                className="text-xs text-zinc-400 hover:text-theme-text-primary light:hover:text-theme-text-primary border-none bg-transparent cursor-pointer"
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
          <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5 light:border-slate-200 overflow-x-auto no-scroll shrink-0">
            {parentPath !== null && (
              <button
                type="button"
                onClick={navigateUp}
                className="text-zinc-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer flex-shrink-0"
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
                  onClick={() => navigateTo(crumb.path)}
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

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-2 no-scroll">
          {/* Loading skeletons */}
          {loading && (
            <div className="flex flex-col gap-1">
              {/* index key OK: static list */}
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
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex items-center gap-2">
              <Warning size={16} weight="fill" className="flex-shrink-0" />
              <span>
                {t("sidebar.filesystem.error", "Fehler beim Laden:")} {error}
              </span>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && items.length === 0 && (
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
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-200 light:text-slate-700 bg-white/5 light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 rounded-lg px-4 py-2 border border-white/10 light:border-slate-200 cursor-pointer transition-colors"
              >
                <Upload size={14} weight="bold" />
                {t("sidebar.filesystem.uploadFirst")}
              </button>
            </div>
          )}

          {/* No search results */}
          {!loading &&
            !error &&
            items.length > 0 &&
            filteredItems.length === 0 && (
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
            )}

          {/* File items — sectioned */}
          {!loading && !error && filteredItems.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {/* Folders — expandable inline trees */}
              {folders.map((item) => {
                const folderState = expandedFolders[item.path];
                const isExpanded = !!folderState;
                const folderItems = folderState?.items || [];
                const folderLoading = folderState?.loading;
                const subFolders = folderItems.filter(
                  (i) => i.type === "directory",
                );
                const subFiles = folderItems.filter((i) => i.type === "file");
                return (
                  <div key={item.path}>
                    <div
                      onClick={() => toggleFolder(item.path)}
                      className="group flex items-center gap-2 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-white/5 light:hover:bg-slate-50 border border-transparent"
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
                          handleDelete(item.path, item.name);
                        }}
                        disabled={deletingPath === item.path}
                        className="text-zinc-600 light:text-slate-400 hover:text-red-400 light:hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 disabled:opacity-40 flex-shrink-0 p-1"
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
                          <div className="mx-2.5 my-1.5 p-2 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400 flex items-center gap-1.5">
                            <Warning size={12} weight="fill" className="flex-shrink-0" />
                            <span>{t("sidebar.filesystem.error", "Fehler beim Laden:")} {folderState.error}</span>
                          </div>
                        )}
                        {!folderLoading && !folderState?.error && folderItems.length === 0 && (
                          <p className="px-2.5 py-1.5 text-xs text-zinc-600 light:text-slate-400">
                            {t("sidebar.filesystem.folderEmpty", "Empty")}
                          </p>
                        )}
                        {!folderLoading && !folderState?.error &&
                          subFolders.map((sub) => (
                            <div
                              key={sub.path}
                              onClick={() => toggleFolder(sub.path)}
                              className="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all hover:bg-white/5 light:hover:bg-slate-50 border border-transparent"
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
                              <p className="text-xs text-theme-text-primary light:text-theme-text-primary font-medium truncate flex-1">
                                {sub.name}
                              </p>
                            </div>
                          ))}
                        {!folderLoading && !folderState?.error &&
                          subFiles.map((file) => {
                            const Icon = getFileIcon(file.ext);
                            const iconColor = getFileColor(file.ext);
                            return (
                              <div
                                key={file.path}
                                onClick={() => toggleFileSelection(file)}
                                className="group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all hover:bg-white/5 light:hover:bg-slate-50 border border-transparent"
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
                                      handleDownload(file);
                                    }}
                                    className="text-zinc-500 light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-0.5"
                                  >
                                    <Download size={12} weight="regular" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(file.path, file.name);
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
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => toggleSection("uploads")}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 light:text-slate-500 hover:text-zinc-200 light:hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                  >
                    <CaretDown
                      size={12}
                      weight="bold"
                      className={`transition-transform flex-shrink-0 ${collapsedSections.uploads ? "-rotate-90" : ""}`}
                    />
                    <Upload size={12} weight="bold" className="flex-shrink-0" />
                    {t("sidebar.filesystem.sectionUploads", "Uploads")}
                    <span className="text-[10px] font-normal text-zinc-600 light:text-slate-400 normal-case tracking-normal">
                      {uploadFiles.length}
                    </span>
                  </button>
                  {!collapsedSections.uploads && (
                    <div className="flex flex-col gap-0.5">
                      {uploadFiles.map((item) => {
                        const Icon = getFileIcon(item.ext);
                        const iconColor = getFileColor(item.ext);
                        const isSelected = selectedFiles.some(
                          (f) => f.path === item.path,
                        );
                        return (
                          <div
                            key={item.path}
                            onClick={() => toggleFileSelection(item)}
                            className={`group flex items-center gap-3 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? "bg-white/10 light:bg-slate-100 border border-white/15 light:border-slate-300"
                                : "hover:bg-white/5 light:hover:bg-slate-50 border border-transparent"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg bg-white/5 light:bg-slate-100 flex items-center justify-center flex-shrink-0`}
                            >
                              <Icon
                                size={16}
                                weight="regular"
                                className={iconColor}
                              />
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
                                  handleDownload(item);
                                }}
                                className="text-zinc-500 light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-1"
                                aria-label={t("sidebar.filesystem.download")}
                              >
                                <Download size={14} weight="regular" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item.path, item.name);
                                }}
                                disabled={deletingPath === item.path}
                                className="text-zinc-500 light:text-slate-400 hover:text-red-400 light:hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40 p-1"
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
              )}

              {/* Section: Analyse-Berichte */}
              {reportFiles.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => toggleSection("reports")}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 light:text-slate-500 hover:text-zinc-200 light:hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer"
                  >
                    <CaretDown
                      size={12}
                      weight="bold"
                      className={`transition-transform flex-shrink-0 ${collapsedSections.reports ? "-rotate-90" : ""}`}
                    />
                    <ChartBar
                      size={12}
                      weight="bold"
                      className="flex-shrink-0"
                    />
                    {t("sidebar.filesystem.sectionReports", "Analyse-Berichte")}
                    <span className="text-[10px] font-normal text-zinc-600 light:text-slate-400 normal-case tracking-normal">
                      {reportFiles.length}
                    </span>
                  </button>
                  {!collapsedSections.reports && (
                    <div className="flex flex-col gap-0.5">
                      {reportFiles.map((item) => {
                        const Icon = getFileIcon(item.ext);
                        const iconColor = getFileColor(item.ext);
                        const isSelected = selectedFiles.some(
                          (f) => f.path === item.path,
                        );
                        return (
                          <div
                            key={item.path}
                            onClick={() => toggleFileSelection(item)}
                            className={`group flex items-center gap-3 px-2.5 py-2.5 rounded-lg cursor-pointer transition-all ${
                              isSelected
                                ? "bg-white/10 light:bg-slate-100 border border-white/15 light:border-slate-300"
                                : "hover:bg-white/5 light:hover:bg-slate-50 border border-transparent"
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg bg-white/5 light:bg-slate-100 flex items-center justify-center flex-shrink-0`}
                            >
                              <Icon
                                size={16}
                                weight="regular"
                                className={iconColor}
                              />
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
                                  handleDownload(item);
                                }}
                                className="text-zinc-500 light:text-slate-400 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors border-none bg-transparent cursor-pointer p-1"
                                aria-label={t("sidebar.filesystem.download")}
                              >
                                <Download size={14} weight="regular" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item.path, item.name);
                                }}
                                disabled={deletingPath === item.path}
                                className="text-zinc-500 light:text-slate-400 hover:text-red-400 light:hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40 p-1"
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
              )}
            </div>
          )}
        </div>

        {/* Footer — selection actions */}
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
                onClick={clearSelection}
                className="text-xs text-zinc-400 hover:text-theme-text-primary light:hover:text-theme-text-primary border-none bg-transparent cursor-pointer transition-colors"
              >
                {t("sidebar.filesystem.clearSelection")}
              </button>
            </div>
          </div>
        )}

        {/* Item action message */}
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
      </div>
    </ChatSidebar>
  );
}
