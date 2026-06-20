// SPDX-License-Identifier: MIT
import { useState, useEffect, useCallback } from "react";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Folder } from "@phosphor-icons/react/dist/csr/Folder";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { FileImage } from "@phosphor-icons/react/dist/csr/FileImage";
import { FileCode } from "@phosphor-icons/react/dist/csr/FileCode";
import { File } from "@phosphor-icons/react/dist/csr/File";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowClockwise } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { CheckCircle } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { HardDrive } from "@phosphor-icons/react/dist/csr/HardDrive";
import { Cpu } from "@phosphor-icons/react/dist/csr/Cpu";
import { Info } from "@phosphor-icons/react/dist/csr/Info";
import { Upload } from "@phosphor-icons/react/dist/csr/Upload";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import { Trash } from "@phosphor-icons/react/dist/csr/Trash";
import { useTranslation } from "react-i18next";
import { useFilesystem } from "@/hooks/useFilesystem";
import { useFileBrowser } from "@/hooks/useFileBrowser";
import ChatSidebar, { useFilesystemSidebar } from "../ChatSidebar";

const SUPPORTED_EXTENSIONS = [
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
];

function getFileIcon(ext) {
  if (ext === ".pdf") return FilePdf;
  if ([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"].includes(ext))
    return FileImage;
  if (
    [
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
    ].includes(ext)
  )
    return FileCode;
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
  const crumbs = [{ name: "Uploads", path: "" }];
  if (!path) return crumbs;
  const parts = path.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? current + "/" + part : part;
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
    createDirectory,
    createFile,
    deleteItem,
    toggleFileSelection,
    clearSelection,
  } = useFileBrowser();

  const [showSysInfo, setShowSysInfo] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectResult, setConnectResult] = useState(null);
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [creatingType, setCreatingType] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [itemActionMsg, setItemActionMsg] = useState(null);
  const [deletingPath, setDeletingPath] = useState(null);

  useEffect(() => {
    if (sidebarOpen && currentPath === null) {
      browse("");
    }
  }, [sidebarOpen, currentPath, browse]);

  const breadcrumbs = getBreadcrumbs(currentPath);

  const handleSelectDirectory = useCallback(() => {
    if (currentPath !== null) {
      setSelectedDirectory(currentPath);
    }
  }, [currentPath]);

  const handleConnect = useCallback(async () => {
    if (selectedFiles.length === 0 && selectedDirectory === null) return;
    setConnecting(true);
    setConnectResult(null);
    try {
      const payload =
        selectedDirectory !== null
          ? { directory: selectedDirectory }
          : { files: selectedFiles.map((f) => f.path) };
      const res = await fetch("/api/workspace/opensin-chat/connect-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setConnectResult({
          success: true,
          message:
            selectedDirectory !== null
              ? `Verzeichnis "${selectedDirectory || t("sidebar.filesystem.uploadsRoot")}" verbunden — KI hat Zugriff auf alle Dateien`
              : `${data.connected || 0} von ${data.total} Datei(en) verbunden`,
        });
        clearSelection();
        setSelectedDirectory(null);
      } else {
        setConnectResult({
          success: false,
          message: data.error || "Fehler beim Verbinden",
        });
      }
    } catch (e) {
      setConnectResult({ success: false, message: e.message });
    } finally {
      setConnecting(false);
    }
  }, [selectedFiles, selectedDirectory, clearSelection, t]);

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
          message: `${t("sidebar.filesystem.deleteFailed")}: ${err.message}`,
        });
      } finally {
        setDeletingPath(null);
      }
    },
    [deleteItem, browse, currentPath, t],
  );

  const sysInfoRows = sysInfo
    ? [
        {
          icon: Cpu,
          label: "Plattform",
          value: `${sysInfo.platform} (${sysInfo.arch})`,
        },
        { icon: Cpu, label: "Node.js", value: sysInfo.nodeVersion },
        {
          icon: HardDrive,
          label: "Speicher frei",
          value:
            sysInfo.storage?.current != null
              ? `${sysInfo.storage.current} GB / ${sysInfo.storage.capacity} GB`
              : "—",
        },
        {
          icon: Cpu,
          label: "RAM frei",
          value: `${sysInfo.freeMemMB} MB / ${sysInfo.totalMemMB} MB`,
        },
        { icon: FolderOpen, label: "Storage", value: sysInfo.uploadPath },
        { icon: Folder, label: "Arbeitsverz.", value: sysInfo.workDir },
      ]
    : [];

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div className="w-full h-full bg-zinc-900 light:bg-white light:border-l light:border-slate-300 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
          <FolderOpen
            size={15}
            className="text-zinc-400 light:text-slate-500"
          />
          <p className="flex-1 font-medium text-sm text-white light:text-slate-900">
            {t("sidebar.filesystem.title")}
          </p>
          <button
            type="button"
            onClick={() => setShowSysInfo(!showSysInfo)}
            className="text-zinc-500 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer mr-1"
            aria-label={t("sidebar.filesystem.systemInfo")}
          >
            <Info size={14} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => browse(currentPath || "")}
            disabled={loading}
            className="text-zinc-500 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40 mr-1"
            aria-label={t("common.refresh")}
          >
            <ArrowClockwise
              size={13}
              weight="bold"
              className={loading ? "animate-spin" : ""}
            />
          </button>
          <button
            onClick={closeSidebar}
            type="button"
            aria-label={t("common.close")}
            className="text-white/60 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {showSysInfo && (
          <div className="px-4 py-3 border-b border-zinc-800 light:border-slate-200 bg-zinc-950/50 light:bg-slate-50">
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

        {selectedDirectory !== null && (
          <div className="px-4 py-2 border-b border-zinc-800 light:border-slate-200 bg-blue-950/30">
            <div className="flex items-center gap-2">
              <CheckCircle
                size={14}
                weight="fill"
                className="text-blue-400 flex-shrink-0"
              />
              <span className="text-xs text-blue-300 truncate flex-1">
                {t("sidebar.filesystem.currentPath", {
                  path: selectedDirectory || t("sidebar.filesystem.uploadsRoot"),
                })}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDirectory(null)}
                className="text-xs text-zinc-400 hover:text-white border-none bg-transparent cursor-pointer"
              >
                {t("sidebar.filesystem.change")}
              </button>
            </div>
          </div>
        )}

        {selectedDirectory === null && (
          <>
            <div className="px-3 py-2 border-b border-zinc-800 light:border-slate-200 shrink-0">
              <p className="text-[11px] text-zinc-400 light:text-slate-500 mb-2">
                {t("sidebar.filesystem.description")}
              </p>
              <div className="flex items-center gap-1.5 mb-1">
                <button
                  type="button"
                  onClick={() => {
                    setCreatingType(
                      creatingType === "folder" ? null : "folder",
                    );
                    setNewItemName("");
                    setItemActionMsg(null);
                  }}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-300 light:text-slate-700 bg-zinc-800 light:bg-slate-200 hover:bg-zinc-700 light:hover:bg-slate-300 px-2 py-1 rounded-md border-none cursor-pointer transition-colors"
                >
                  <Plus size={10} weight="bold" />
                  <Folder
                    size={10}
                    weight="fill"
                    className="text-blue-400 light:text-blue-600"
                  />
                  {t("sidebar.filesystem.newFolder")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingType(creatingType === "file" ? null : "file");
                    setNewItemName("");
                    setItemActionMsg(null);
                  }}
                  className="flex items-center gap-1 text-[10px] font-medium text-zinc-300 light:text-slate-700 bg-zinc-800 light:bg-slate-200 hover:bg-zinc-700 light:hover:bg-slate-300 px-2 py-1 rounded-md border-none cursor-pointer transition-colors"
                >
                  <Plus size={10} weight="bold" />
                  <FileText
                    size={10}
                    className="text-zinc-400 light:text-slate-500"
                  />
                  {t("sidebar.filesystem.newFile")}
                </button>
              </div>
              {creatingType && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newItemName.trim()) {
                        const fn =
                          creatingType === "folder"
                            ? createDirectory
                            : createFile;
                        fn(newItemName.trim(), currentPath || "")
                          .then(() => {
                            setItemActionMsg({
                              success: true,
                              message: t("sidebar.filesystem.createSuccess"),
                            });
                            setCreatingType(null);
                            setNewItemName("");
                            browse(currentPath || "");
                          })
                          .catch((err) => {
                            setItemActionMsg({
                              success: false,
                              message: `${t("sidebar.filesystem.createFailed")}: ${err.message}`,
                            });
                          });
                      } else if (e.key === "Escape") {
                        setCreatingType(null);
                        setNewItemName("");
                      }
                    }}
                    placeholder={
                      creatingType === "folder"
                        ? t("sidebar.filesystem.folderName")
                        : t("sidebar.filesystem.fileName")
                    }
                    className="flex-1 text-xs bg-zinc-950 light:bg-white border border-zinc-700 light:border-slate-300 rounded-md px-2 py-1 text-white light:text-slate-900 outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newItemName.trim()) return;
                      const fn =
                        creatingType === "folder"
                          ? createDirectory
                          : createFile;
                      fn(newItemName.trim(), currentPath || "")
                        .then(() => {
                          setItemActionMsg({
                            success: true,
                            message: t("sidebar.filesystem.createSuccess"),
                          });
                          setCreatingType(null);
                          setNewItemName("");
                          browse(currentPath || "");
                        })
                        .catch((err) => {
                          setItemActionMsg({
                            success: false,
                            message: `${t("sidebar.filesystem.createFailed")}: ${err.message}`,
                          });
                        });
                    }}
                    className="text-[10px] font-medium text-white bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded-md border-none cursor-pointer transition-colors"
                  >
                    {t("sidebar.filesystem.create")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingType(null);
                      setNewItemName("");
                    }}
                    className="text-[10px] text-zinc-400 hover:text-white border-none bg-transparent cursor-pointer"
                  >
                    {t("sidebar.filesystem.cancel")}
                  </button>
                </div>
              )}
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

            {currentPath !== null && (
              <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800 light:border-slate-200 overflow-x-auto no-scroll shrink-0">
                {parentPath !== null && (
                  <button
                    onClick={navigateUp}
                    type="button"
                    className="text-zinc-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer flex-shrink-0"
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
                    {i > 0 && <span className="text-zinc-700 text-xs">/</span>}
                    <button
                      type="button"
                      onClick={() => navigateTo(crumb.path)}
                      className={`text-xs border-none bg-transparent cursor-pointer transition-colors ${
                        i === breadcrumbs.length - 1
                          ? "text-white light:text-slate-900 font-medium"
                          : "text-zinc-400 hover:text-white light:hover:text-slate-900"
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 no-scroll">
              {loading && (
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-2 py-2 animate-pulse"
                    >
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
                  {items
                    .filter((item) => item.type === "directory")
                    .map((item) => (
                      <div
                        key={item.path}
                        onClick={() => navigateTo(item.path)}
                        className="group flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-all hover:bg-zinc-800 light:hover:bg-slate-100 border border-transparent"
                      >
                        <Folder
                          size={16}
                          weight="fill"
                          className="text-blue-400 light:text-blue-600 flex-shrink-0"
                        />
                        <span className="text-xs text-zinc-200 light:text-slate-800 truncate flex-1">
                          {item.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.path, item.name);
                          }}
                          disabled={deletingPath === item.path}
                          className="text-zinc-600 light:text-slate-400 hover:text-red-400 light:hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 disabled:opacity-40 flex-shrink-0"
                          aria-label={t("sidebar.filesystem.delete")}
                        >
                          <Trash
                            size={12}
                            weight="bold"
                            className={
                              deletingPath === item.path ? "animate-spin" : ""
                            }
                          />
                        </button>
                      </div>
                    ))}
                  {items.filter((item) => item.type === "file").length > 0 && (
                    <div className="my-1 border-t border-zinc-800 light:border-slate-200" />
                  )}
                  {items
                    .filter((item) => item.type === "file")
                    .map((item) => {
                      const Icon = getFileIcon(item.ext);
                      const isSelected = selectedFiles.some(
                        (f) => f.path === item.path,
                      );
                      const isSupported = SUPPORTED_EXTENSIONS.includes(
                        item.ext,
                      );
                      return (
                        <div
                          key={item.path}
                          onClick={() =>
                            isSupported && toggleFileSelection(item)
                          }
                          className={`group flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-all ${
                            isSelected
                              ? "bg-blue-600/20 border border-blue-500/40"
                              : isSupported
                                ? "hover:bg-zinc-800 light:hover:bg-slate-100 border border-transparent"
                                : "opacity-40 border border-transparent"
                          }`}
                        >
                          <Icon
                            size={16}
                            className="text-zinc-400 light:text-slate-500 flex-shrink-0"
                          />
                          <span className="text-xs text-zinc-200 light:text-slate-800 truncate flex-1">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-zinc-600 light:text-slate-400 flex-shrink-0">
                            {formatSize(item.size)}
                          </span>
                          {isSelected && (
                            <CheckCircle
                              size={14}
                              weight="fill"
                              className="text-blue-400 flex-shrink-0"
                            />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.path, item.name);
                            }}
                            disabled={deletingPath === item.path}
                            className="text-zinc-600 light:text-slate-400 hover:text-red-400 light:hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer opacity-0 group-hover:opacity-100 disabled:opacity-40 flex-shrink-0"
                            aria-label={t("sidebar.filesystem.delete")}
                          >
                            <Trash
                              size={12}
                              weight="bold"
                              className={
                                deletingPath === item.path ? "animate-spin" : ""
                              }
                            />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

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
                <button
                  onClick={handleSelectDirectory}
                  disabled={currentPath === null}
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-3 py-1.5 rounded-md border-none cursor-pointer transition-colors flex-1"
                >
                  <FolderOpen size={12} weight="bold" />
                  {t("sidebar.filesystem.setDirectory")}
                </button>
                {selectedFiles.length > 0 && (
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    type="button"
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 px-3 py-1.5 rounded-md border-none cursor-pointer transition-colors"
                  >
                    <Upload size={12} weight="bold" />
                    {t("sidebar.filesystem.fileCount", {
                      count: selectedFiles.length,
                    })}
                  </button>
                )}
              </div>
              {selectedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="mt-1 text-[10px] text-zinc-500 hover:text-white border-none bg-transparent cursor-pointer w-full text-center"
                >
                  {t("sidebar.filesystem.clearSelection")}
                </button>
              )}
            </div>
          </>
        )}

        {selectedDirectory !== null && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <FolderOpen
              size={48}
              weight="fill"
              className="text-blue-400 mb-3"
            />
            <p className="text-sm text-white light:text-slate-900 font-medium text-center mb-1">
              {t("sidebar.filesystem.directoryConnected")}
            </p>
            <p className="text-xs text-zinc-400 light:text-slate-500 text-center mb-4 font-mono">
              {selectedDirectory || t("sidebar.filesystem.uploadsRoot")}
            </p>
            <p className="text-[11px] text-zinc-500 light:text-slate-400 text-center mb-4">
              {t("sidebar.filesystem.directoryAccessDescription")}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDirectory(null)}
                className="text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 px-3 py-1.5 rounded-md bg-transparent cursor-pointer transition-colors"
              >
                {t("sidebar.filesystem.change")}
              </button>
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-md border-none cursor-pointer transition-colors"
              >
                <Upload size={12} weight="bold" />
                {connecting
                  ? t("sidebar.filesystem.connecting")
                  : t("sidebar.filesystem.connect")}
              </button>
            </div>
            {connectResult && (
              <div
                className={`mt-3 text-xs px-3 py-2 rounded-md w-full text-center ${
                  connectResult.success
                    ? "bg-green-950/40 text-green-400 border border-green-800/50"
                    : "bg-red-950/40 text-red-400 border border-red-800/50"
                }`}
              >
                {connectResult.message}
              </div>
            )}
          </div>
        )}
      </div>
    </ChatSidebar>
  );
}
