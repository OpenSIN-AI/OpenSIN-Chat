// SPDX-License-Identifier: MIT
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Cpu } from "@phosphor-icons/react/dist/csr/Cpu";
import { HardDrive } from "@phosphor-icons/react/dist/csr/HardDrive";
import { useTranslation } from "react-i18next";
import { useFilesystem } from "@/hooks/useFilesystem";
import { useFileBrowser } from "@/hooks/useFileBrowser";
import { baseHeaders } from "@/utils/request";
import { API_BASE } from "@/utils/constants";
import showToast from "@/utils/toast";
import ChatSidebar, { useFilesystemSidebar } from "../ChatSidebar";
import {
  getBreadcrumbs,
} from "./helpers";
import { SidebarHeader } from "./components/SidebarHeader";
import { SearchAndCreate } from "./components/SearchAndCreate";
import { EmptyStates } from "./components/EmptyStates";
import { FileList } from "./components/FileList";
import { Overlays } from "./components/Overlays";
import { Footer } from "./components/Footer";

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
      setUploadProgress({ current: 0, total: files.length, name: files[0].name });
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i, total: files.length, name: file.name });
        try {
          const formData = new FormData();
          formData.append("file", file, file.name);
          const res = await fetch(
            `${API_BASE}/utils/upload-file?path=${encodeURIComponent(currentPath || "")}`,
            { method: "POST", headers: baseHeaders(), body: formData },
          );
          if (res.ok) {
            successCount++;
          } else {
            const data = await res.json().catch(() => ({}));
            showToast(`${file.name}: ${data?.error || t("sidebar.filesystem.uploadFailed")}`, "error");
          }
        } catch (e) {
          showToast(`${file.name}: ${e?.message || t("sidebar.filesystem.uploadFailed")}`, "error");
        }
      }
      setUploadProgress({ current: files.length, total: files.length, name: "" });
      if (successCount > 0) {
        showToast(t("sidebar.filesystem.uploadSuccess", { count: successCount }), "success");
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
      setItemActionMsg({ success: true, message: t("sidebar.filesystem.createSuccess") });
      setCreatingType(null);
      setNewItemName("");
      browse(currentPath || "");
    } catch (err) {
      setItemActionMsg({
        success: false,
        message: `${t("sidebar.filesystem.createFailed")}: ${err?.message ?? err}`,
      });
    }
  }, [creatingType, createDirectory, createFile, newItemName, currentPath, browse, t]);

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
        { icon: Cpu, label: t("sidebar.filesystem.sysInfoPlatform", "Plattform"), value: `${sysInfo.platform} (${sysInfo.arch})` },
        { icon: Cpu, label: "Node.js", value: sysInfo.nodeVersion },
        {
          icon: HardDrive,
          label: t("sidebar.filesystem.sysInfoStorageFree", "Speicher frei"),
          value: sysInfo.storage?.current != null ? `${sysInfo.storage.current} GB / ${sysInfo.storage.capacity} GB` : "—",
        },
        { icon: Cpu, label: t("sidebar.filesystem.sysInfoRamFree", "RAM frei"), value: `${sysInfo.freeMemMB} MB / ${sysInfo.totalMemMB} MB` },
        { icon: FolderOpen, label: t("sidebar.filesystem.sysInfoStorage", "Storage"), value: sysInfo.uploadPath },
      ]
    : [];

  const folders = filteredItems.filter((item) => item.type === "directory");
  const allFiles = filteredItems.filter((item) => item.type === "file");

  const REPORT_KEYWORDS = ["bericht", "report", "analyse", "analysis", "summary", "zusammenfassung", "pdf-report", "ki-bericht"];
  const reportFiles = allFiles.filter((item) => {
    const nameLower = item.name.toLowerCase();
    return REPORT_KEYWORDS.some((kw) => nameLower.includes(kw)) || (item.ext === ".pdf" && nameLower.includes("bericht"));
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
        <Overlays isDragOver={isDragOver} uploading={uploading} uploadProgress={uploadProgress} />

        <SidebarHeader
          fileCount={fileCount}
          uploading={uploading}
          loading={loading}
          showSysInfo={showSysInfo}
          sysInfoRows={sysInfoRows}
          fileInputRef={fileInputRef}
          onUploadClick={() => fileInputRef.current?.click()}
          onNewFileClick={() => {
            setCreatingType(creatingType === "file" ? null : "file");
            setNewItemName("");
            setItemActionMsg(null);
          }}
          onToggleSysInfo={() => setShowSysInfo(!showSysInfo)}
          onRefresh={() => browse(currentPath || "")}
          onClose={closeSidebar}
          onFileInputChange={handleFileInputChange}
        />

        <SearchAndCreate
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          creatingType={creatingType}
          newItemName={newItemName}
          onNewItemNameChange={setNewItemName}
          onCreateItem={handleCreateItem}
          onCancelCreate={() => { setCreatingType(null); setNewItemName(""); }}
          itemActionMsg={itemActionMsg}
          currentPath={currentPath}
          parentPath={parentPath}
          breadcrumbs={breadcrumbs}
          onNavigateUp={navigateUp}
          onNavigateTo={navigateTo}
        />

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-2 no-scroll">
          <EmptyStates
            loading={loading}
            error={error}
            items={items}
            filteredItems={filteredItems}
            onUploadClick={() => fileInputRef.current?.click()}
          />
          {!loading && !error && filteredItems.length > 0 && (
            <FileList
              folders={folders}
              uploadFiles={uploadFiles}
              reportFiles={reportFiles}
              selectedFiles={selectedFiles}
              expandedFolders={expandedFolders}
              collapsedSections={collapsedSections}
              deletingPath={deletingPath}
              onToggleFolder={toggleFolder}
              onToggleSection={toggleSection}
              onToggleFileSelection={toggleFileSelection}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}
        </div>

        <Footer
          selectedFiles={selectedFiles}
          onClearSelection={clearSelection}
          itemActionMsg={itemActionMsg}
          creatingType={creatingType}
        />
      </div>
    </ChatSidebar>
  );
}
