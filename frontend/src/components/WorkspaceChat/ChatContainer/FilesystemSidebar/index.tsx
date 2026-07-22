// SPDX-License-Identifier: MIT
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useContext,
} from "react";
import { useParams } from "react-router";
import { FolderOpen } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { Cpu } from "@phosphor-icons/react/dist/csr/Cpu";
import { HardDrive } from "@phosphor-icons/react/dist/csr/HardDrive";
import { useTranslation } from "react-i18next";
import { useFilesystem } from "@/hooks/useFilesystem";
import { useFileBrowser } from "@/hooks/useFileBrowser";
import useConfirm from "@/hooks/useConfirm";
import { baseHeaders } from "@/utils/request";
import { API_BASE } from "@/utils/constants";
import showToast from "@/utils/toast";
import ChatSidebar, {
  useFilesystemSidebar,
  usePreviewSidebar,
} from "../ChatSidebar";
import { DndUploaderContext, REMOVE_ATTACHMENT_EVENT } from "../DnDWrapper";
import { getBreadcrumbs, getPreviewType, mimeFromExt } from "./helpers";
import { SidebarHeader } from "./components/SidebarHeader";
import { SearchAndCreate } from "./components/SearchAndCreate";
import { EmptyStates } from "./components/EmptyStates";
import { FileList } from "./components/FileList";
import { Overlays } from "./components/Overlays";
import { Footer } from "./components/Footer";

interface FilesystemItem {
  name: string;
  type: "file" | "directory";
  path: string;
  ext: string;
}

/**
 * Inner file-manager body. Extracted from the former default export so it can
 * be embedded as the "Dateien" tab inside the consolidated Quellen panel
 * (SourcesSidebar) as well as rendered standalone by the thin default export
 * below. It no longer depends on the sidebar-open context: the parent controls
 * visibility/mount, and `active` gates the initial browse so the listing loads
 * when the Dateien tab becomes visible.
 */
export function FilesystemPanelBody({
  workspace = null,
  onClose,
  active = true,
}: any) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { slug: paramSlug } = useParams();
  const workspaceSlug = workspace?.slug || paramSlug || "opensin-chat";
  const { data: sysInfo } = useFilesystem();

  // Scope toggle for the Dateien tab.
  // - "workspace": browses the shared uploads tree (`/utils/*`), the default
  //   store for files uploaded/created through this panel.
  // - "global": browses the deployment-wide global store (`/utils/global/*`),
  //   a real separate storage root (STORAGE_DIR/global) shared across ALL
  //   workspaces — files like a global agents.md / memory.md live here and
  //   exist independently of any workspace. Browse/upload/create/delete all
  //   target the global endpoints in this mode.
  const [scope, setScope] = useState<"workspace" | "global">("workspace");

  // API route prefix for the active scope. The global store mirrors the uploads
  // route shape under /utils/global (see server/endpoints/utils/globalFiles.js).
  const apiPrefix = scope === "global" ? "/utils/global" : "/utils";

  const { openPreview } = usePreviewSidebar();
  const { attachExternalFile } = useContext(DndUploaderContext);
  // Maps a browsed file's path → the chat-attachment uid it produced, so list
  // selection and the chat pill stay in sync bidirectionally.
  const pathToUidRef = useRef<Map<string, string>>(new Map());

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
  } = useFileBrowser(scope);
  const [showSysInfo, setShowSysInfo] = useState(false);
  const [creatingType, setCreatingType] = useState<any>(null);
  const [newItemName, setNewItemName] = useState("");
  const [itemActionMsg, setItemActionMsg] = useState<any>(null);
  const [deletingPath, setDeletingPath] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<any>({});
  const [expandedFolders, setExpandedFolders] = useState<any>({});
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
    name: "",
  });
  const fileInputRef = useRef<any>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    if (active && currentPath === null) {
      browse("");
    }
  }, [active, currentPath, browse]);

  // Re-browse from the root whenever the scope toggles. `browse` is a fresh
  // callback per scope (its route prefix changes), so switching stores reloads
  // the listing against the correct backend instead of showing stale items.
  useEffect(() => {
    if (active) browse("");
  }, [scope]);

  const breadcrumbs = getBreadcrumbs(currentPath || "", t);

  // The "workspace" and "global" scopes are already separate storage roots on
  // the server (`/utils/*` = the shared uploads tree, `/utils/global/*` = the
  // deployment-wide global store). Each scope's browse listing therefore only
  // ever contains files that belong to that store — no client-side scoping is
  // needed. A previous version additionally filtered the workspace listing
  // against `workspace.documents`, but those entries are embedded-document JSON
  // paths under `documents/custom-documents/` — a different namespace from the
  // raw `uploads/` filenames shown here — so the filter matched nothing and
  // hid every file this panel manages (counter showed N, list showed "none").
  const filteredItems = useMemo(() => {
    const typedItems = items as FilesystemItem[];
    if (!searchQuery.trim()) return typedItems;
    const q = searchQuery.toLowerCase();
    return typedItems.filter((item: FilesystemItem) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const fileCount = useMemo(
    () => (items as FilesystemItem[]).filter((i: FilesystemItem) => i.type === "file").length,
    [items],
  );

  const handleDelete = useCallback(
    async (itemPath: string, itemName: string) => {
      if (
        !(await confirm({
          title:
            t("sidebar.filesystem.confirmDelete") +
            (itemName ? `\n${itemName}` : ""),
          confirmLabel: t("common.delete"),
          destructive: true,
        }))
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
      } catch (err: unknown) {
        setItemActionMsg({
          success: false,
          message: `${t("sidebar.filesystem.deleteFailed")}: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setDeletingPath(null);
      }
    },
    [deleteItem, browse, currentPath, t, confirm],
  );

  const handleUploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList) as File[];
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
            `${API_BASE}${apiPrefix}/upload-file?path=${encodeURIComponent(currentPath || "")}`,
            { method: "POST", headers: baseHeaders(), body: formData },
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
        } catch (e: unknown) {
          showToast(
            `${file.name}: ${e instanceof Error ? e.message : t("sidebar.filesystem.uploadFailed")}`,
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
          t("sidebar.filesystem.uploadSuccess", { count: successCount }),
          "success",
        );
        browse(currentPath || "");
      }
      setUploading(false);
      setUploadProgress({ current: 0, total: 0, name: "" });
    },
    [browse, currentPath, t, apiPrefix],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types && e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
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
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err: unknown) {
      setItemActionMsg({
        success: false,
        message: `${t("sidebar.filesystem.createFailed")}: ${err instanceof Error ? err.message : String(err)}`,
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
    async (item: FilesystemItem) => {
      try {
        const res = await fetch(
          `${API_BASE}${apiPrefix}/download-file?path=${encodeURIComponent(item.path)}`,
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
    [t, apiPrefix],
  );

  const handlePreview = useCallback(
    (item: FilesystemItem) => {
      openPreview({
        type: getPreviewType(item.ext),
        title: item.name,
        downloadUrl: `${API_BASE}${apiPrefix}/download-file?path=${encodeURIComponent(item.path)}`,
      });
    },
    [openPreview, apiPrefix],
  );

  // Wraps panel selection: on select, fetch the file's bytes and attach it as a
  // chat-context pill (tracking path→uid); on deselect, remove that pill. The
  // reverse direction (pill X → deselect here) is handled by the effect below.
  const handleToggleSelection = useCallback(
    async (item: FilesystemItem) => {
      const alreadySelected = (selectedFiles as FilesystemItem[]).some((f: FilesystemItem) => f.path === item.path);
      toggleFileSelection(item);
      if (alreadySelected) {
        const uid = pathToUidRef.current.get(item.path);
        if (uid) {
          // Delete before dispatching so the reverse-sync listener below finds
          // no mapping and doesn't toggle the selection a second time.
          pathToUidRef.current.delete(item.path);
          window.dispatchEvent(
            new CustomEvent(REMOVE_ATTACHMENT_EVENT, {
              detail: { uid, document: null },
            }),
          );
        }
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE}${apiPrefix}/download-file?path=${encodeURIComponent(item.path)}`,
          { headers: baseHeaders() },
        );
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        const file = new File([blob], item.name, {
          type: blob.type || mimeFromExt(item.ext),
        });
        const uid = await attachExternalFile?.(file);
        if (uid) pathToUidRef.current.set(item.path, uid);
        showToast(t("sidebar.filesystem.addedAsContext"), "success");
      } catch (e) {
        showToast(t("sidebar.filesystem.contextFailed"), "error");
      }
    },
    [selectedFiles, toggleFileSelection, attachExternalFile, apiPrefix, t],
  );

  // Reverse sync: when a pill is removed via its X (REMOVE_ATTACHMENT_EVENT),
  // deselect the matching file in the list so the CheckCircle clears too.
  useEffect(() => {
    function onRemove(e: any) {
      const uid = e?.detail?.uid;
      if (!uid) return;
      for (const [path, mappedUid] of pathToUidRef.current.entries()) {
        if (mappedUid !== uid) continue;
        pathToUidRef.current.delete(path);
        const item = (selectedFiles as FilesystemItem[]).find((f: FilesystemItem) => f.path === path);
        if (item) toggleFileSelection(item);
        break;
      }
    }
    window.addEventListener(REMOVE_ATTACHMENT_EVENT, onRemove);
    return () => window.removeEventListener(REMOVE_ATTACHMENT_EVENT, onRemove);
  }, [selectedFiles, toggleFileSelection]);

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

  const folders = filteredItems.filter((item: FilesystemItem) => item.type === "directory");
  const allFiles = filteredItems.filter((item: FilesystemItem) => item.type === "file");

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
  const reportFiles = allFiles.filter((item: FilesystemItem) => {
    const nameLower = item.name.toLowerCase();
    return (
      REPORT_KEYWORDS.some((kw) => nameLower.includes(kw)) ||
      (item.ext === ".pdf" && nameLower.includes("bericht"))
    );
  });
  const uploadFiles = allFiles.filter((item: FilesystemItem) => !reportFiles.includes(item));

  const toggleSection = (section: string) => {
    setCollapsedSections((prev: Record<string, boolean>) => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleFolder = useCallback(
    async (folderPath: string) => {
      setExpandedFolders((prev: Record<string, any>) => {
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
            `${API_BASE}${apiPrefix}/browse-directory?path=${encodeURIComponent(folderPath)}`,
            { headers: baseHeaders() },
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setExpandedFolders((prev: Record<string, any>) => ({
            ...prev,
            [folderPath]: { items: data.items || [], loading: false },
          }));
        } catch (e: unknown) {
          setExpandedFolders((prev: Record<string, any>) => ({
            ...prev,
            [folderPath]: { items: [], loading: false, error: e instanceof Error ? e.message : String(e) },
          }));
        }
      }
    },
    [expandedFolders, apiPrefix],
  );

  return (
    <div
      className="w-full h-full bg-zinc-900 light:bg-white flex flex-col overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Overlays
        isDragOver={isDragOver}
        uploading={uploading}
        uploadProgress={uploadProgress}
      />

      {/* Arbeitsbereich / Global scope toggle */}
      <div className="flex items-center gap-1 px-3 pt-3 shrink-0">
        <button
          type="button"
          onClick={() => setScope("workspace")}
          aria-pressed={scope === "workspace"}
          className={`flex-1 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium transition-colors ${
            scope === "workspace"
              ? "bg-theme-bg-tertiary text-theme-text-primary"
              : "bg-transparent hover:bg-theme-bg-secondary text-theme-text-muted"
          }`}
        >
          {t("chat_window.sources_tabs.scope_workspace", "Arbeitsbereich")}
        </button>
        <button
          type="button"
          onClick={() => setScope("global")}
          aria-pressed={scope === "global"}
          className={`flex-1 h-7 px-3 rounded-full border-none cursor-pointer text-xs font-medium transition-colors ${
            scope === "global"
              ? "bg-theme-bg-tertiary text-theme-text-primary"
              : "bg-transparent hover:bg-theme-bg-secondary text-theme-text-muted"
          }`}
        >
          {t("chat_window.sources_tabs.scope_global", "Global")}
        </button>
      </div>

      <SidebarHeader
        fileCount={fileCount}
        uploading={uploading}
        loading={loading}
        showSysInfo={showSysInfo}
        sysInfoRows={sysInfoRows}
        fileInputRef={fileInputRef}
        creatingType={creatingType}
        onUploadClick={() => fileInputRef.current?.click()}
        onNewFileClick={() => {
          setCreatingType(creatingType === "file" ? null : "file");
          setNewItemName("");
          setItemActionMsg(null);
        }}
        onToggleSysInfo={() => setShowSysInfo(!showSysInfo)}
        onRefresh={() => browse(currentPath || "")}
        onClose={onClose}
        onFileInputChange={handleFileInputChange}
      />

      <SearchAndCreate
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        creatingType={creatingType}
        newItemName={newItemName}
        onNewItemNameChange={setNewItemName}
        onCreateItem={handleCreateItem}
        onCancelCreate={() => {
          setCreatingType(null);
          setNewItemName("");
        }}
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
            onToggleFileSelection={handleToggleSelection}
            onPreview={handlePreview}
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
  );
}

/**
 * Thin wrapper kept for backward compatibility (and the existing test). The
 * "filesystem" icon has been removed from the right rail, so this is no longer
 * reachable from the UI — the file manager now lives in the Quellen panel's
 * "Dateien" tab (see SourcesSidebar). Left in place so nothing that still
 * imports the default export breaks.
 */
export default function FilesystemSidebar({ workspace = null }: any) {
  const { sidebarOpen, closeSidebar } = useFilesystemSidebar();
  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <FilesystemPanelBody
        workspace={workspace}
        onClose={closeSidebar}
        active={sidebarOpen}
      />
    </ChatSidebar>
  );
}
