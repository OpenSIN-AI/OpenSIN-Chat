// SPDX-License-Identifier: MIT
import { useState, useEffect, useCallback } from "react";
import {
  X,
  FolderOpen,
  Folder,
  FileText,
  FilePdf,
  FileImage,
  FileCode,
  File,
  ArrowLeft,
  ArrowClockwise,
  CheckCircle,
  HardDrive,
  Cpu,
  Info,
  Upload,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { useFilesystem } from "@/hooks/useFilesystem";
import { useFileBrowser } from "@/hooks/useFileBrowser";
import ChatSidebar, { useFilesystemSidebar } from "../ChatSidebar";

const SUPPORTED_EXTENSIONS = [
  ".txt", ".md", ".pdf", ".csv", ".json", ".html", ".docx",
  ".doc", ".rtf", ".epub", ".xlsx", ".pptx", ".xml", ".yaml", ".yml",
];

function getFileIcon(ext) {
  if (ext === ".pdf") return FilePdf;
  if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"].includes(ext)) return FileImage;
  if ([".js", ".ts", ".jsx", ".tsx", ".py", ".go", ".rs", ".java", ".c", ".cpp"].includes(ext)) return FileCode;
  if (SUPPORTED_EXTENSIONS.includes(ext)) return FileText;
  return File;
}

function formatSize(bytes) {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getBreadcrumbs(path) {
  if (!path) return [];
  const parts = path.split("/").filter(Boolean);
  const crumbs = [{ name: "/", path: "/" }];
  let current = "";
  for (const part of parts) {
    current += "/" + part;
    crumbs.push({ name: part, path: current });
  }
  return crumbs;
}

export default function FilesystemSidebar() {
  const { sidebarOpen, closeSidebar } = useFilesystemSidebar();
  const { t } = useTranslation();
  const { data: sysInfo, refresh: refreshSysInfo } = useFilesystem();
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
    toggleFileSelection,
    clearSelection,
  } = useFileBrowser();

  const [showSysInfo, setShowSysInfo] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectResult, setConnectResult] = useState(null);

  useEffect(() => {
    if (sidebarOpen && !currentPath) {
      browse("");
    }
  }, [sidebarOpen, currentPath, browse]);

  const breadcrumbs = getBreadcrumbs(currentPath);

  const handleConnect = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setConnecting(true);
    setConnectResult(null);
    try {
      const res = await fetch("/api/workspace/opensin-chat/connect-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: selectedFiles.map((f) => f.path),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConnectResult({
          success: true,
          message: `${data.connected || 0} von ${data.total} Datei(en) verbunden`,
        });
        clearSelection();
      } else {
        setConnectResult({ success: false, message: data.error || "Fehler beim Verbinden" });
      }
    } catch (e) {
      setConnectResult({ success: false, message: e.message });
    } finally {
      setConnecting(false);
    }
  }, [selectedFiles, clearSelection]);

  const sysInfoRows = sysInfo
    ? [
        { icon: Cpu, label: "Plattform", value: `${sysInfo.platform} (${sysInfo.arch})` },
        { icon: Cpu, label: "Node.js", value: sysInfo.nodeVersion },
        { icon: HardDrive, label: "Speicher frei", value: sysInfo.storage?.current != null ? `${sysInfo.storage.current} GB / ${sysInfo.storage.capacity} GB` : "—" },
        { icon: Cpu, label: "RAM frei", value: `${sysInfo.freeMemMB} MB / ${sysInfo.totalMemMB} MB` },
        { icon: FolderOpen, label: "Storage", value: sysInfo.uploadPath },
        { icon: Folder, label: "Arbeitsverz.", value: sysInfo.workDir },
      ]
    : [];

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div className="w-full h-full bg-zinc-900 light:bg-white light:border-l light:border-slate-300 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
          <FolderOpen size={15} className="text-zinc-400 light:text-slate-500" />
          <p className="flex-1 font-medium text-sm text-white light:text-slate-900">
            {t("sidebar.filesystem.title", "Verzeichnis")}
          </p>
          <button
            onClick={() => setShowSysInfo(!showSysInfo)}
            type="button"
            className="text-zinc-500 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer mr-1"
            aria-label="System-Info"
          >
            <Info size={14} weight="bold" />
          </button>
          <button
            onClick={() => browse(currentPath || "")}
            type="button"
            disabled={loading}
            className="text-zinc-500 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40 mr-1"
            aria-label={t("common.refresh")}
          >
            <ArrowClockwise size={13} weight="bold" className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={closeSidebar}
            type="button"
            className="text-white/60 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* System Info Panel (toggle) */}
        {showSysInfo && (
          <div className="px-4 py-3 border-b border-zinc-800 light:border-slate-200 bg-zinc-950/50 light:bg-slate-50">
            <div className="flex flex-col gap-2">
              {sysInfoRows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={12} className="text-zinc-500 light:text-slate-400 flex-shrink-0" />
                  <span className="text-[10px] text-zinc-500 light:text-slate-400 uppercase tracking-widest flex-shrink-0">{label}</span>
                  <span className="text-xs font-mono text-zinc-300 light:text-slate-700 ml-auto truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Breadcrumbs */}
        {currentPath !== null && (
          <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800 light:border-slate-200 overflow-x-auto no-scroll shrink-0">
            {parentPath !== null && (
              <button
                onClick={navigateUp}
                type="button"
                className="text-zinc-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer flex-shrink-0"
                aria-label="Aufwärts"
              >
                <ArrowLeft size={14} weight="bold" />
              </button>
            )}
            {breadcrumbs.map((crumb, i) => (
              <div key={crumb.path} className="flex items-center gap-1 flex-shrink-0">
                {i > 0 && <span className="text-zinc-700 text-xs">/</span>}
                <button
                  onClick={() => navigateTo(crumb.path)}
                  type="button"
                  className={`text-xs border-none bg-transparent cursor-pointer transition-colors ${
                    i === breadcrumbs.length - 1
                      ? "text-white light:text-slate-900 font-medium"
                      : "text-zinc-400 hover:text-white light:hover:text-slate-900"
                  }`}
                >
                  {crumb.name === "/" ? "Root" : crumb.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-2 no-scroll">
          {loading && (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2 animate-pulse">
                  <div className="w-5 h-5 rounded bg-zinc-800 light:bg-slate-200 flex-shrink-0" />
                  <div className="h-3 w-32 rounded bg-zinc-800 light:bg-slate-200" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-400">
              {t("sidebar.filesystem.error", "Fehler beim Laden:")} {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="text-center py-8 text-xs text-zinc-500 light:text-slate-400">
              {t("sidebar.filesystem.empty", "Verzeichnis ist leer")}
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {items.map((item) => {
                const Icon = item.type === "directory" ? Folder : getFileIcon(item.ext);
                const isSelected = selectedFiles.some((f) => f.path === item.path);
                const isSupported = item.type === "file" && SUPPORTED_EXTENSIONS.includes(item.ext);

                return (
                  <div
                    key={item.path}
                    onClick={() => {
                      if (item.type === "directory") {
                        navigateTo(item.path);
                      } else if (isSupported) {
                        toggleFileSelection(item);
                      }
                    }}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-600/20 border border-blue-500/40"
                        : item.type === "file" && !isSupported
                          ? "opacity-40"
                          : "hover:bg-zinc-800 light:hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <Icon
                      size={16}
                      weight={item.type === "directory" ? "fill" : "regular"}
                      className={`flex-shrink-0 ${
                        item.type === "directory"
                          ? "text-blue-400 light:text-blue-600"
                          : "text-zinc-400 light:text-slate-500"
                      }`}
                    />
                    <span className="text-xs text-zinc-200 light:text-slate-800 truncate flex-1">
                      {item.name}
                    </span>
                    {item.type === "file" && (
                      <span className="text-[10px] text-zinc-600 light:text-slate-400 flex-shrink-0">
                        {formatSize(item.size)}
                      </span>
                    )}
                    {isSelected && (
                      <CheckCircle size={14} weight="fill" className="text-blue-400 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Connect to Workspace Bar */}
        {selectedFiles.length > 0 && (
          <div className="border-t border-zinc-800 light:border-slate-200 p-3 bg-zinc-950 light:bg-slate-50 shrink-0">
            {connectResult && (
              <div
                className={`mb-2 text-xs px-2 py-1.5 rounded-md ${
                  connectResult.success
                    ? "bg-green-950/40 text-green-400 border border-green-800/50"
                    : "bg-red-950/40 text-red-400 border border-red-800/50"
                }`}
              >
                {connectResult.message}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 light:text-slate-500 flex-1">
                {selectedFiles.length} Datei(en) ausgewählt
              </span>
              <button
                onClick={clearSelection}
                type="button"
                className="text-xs text-zinc-400 hover:text-white light:hover:text-slate-900 px-2 py-1 rounded border-none bg-transparent cursor-pointer transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting}
                type="button"
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-md border-none cursor-pointer transition-colors"
              >
                <Upload size={12} weight="bold" />
                {connecting ? "Verbinde..." : "Verbinden"}
              </button>
            </div>
          </div>
        )}
      </div>
    </ChatSidebar>
  );
}
