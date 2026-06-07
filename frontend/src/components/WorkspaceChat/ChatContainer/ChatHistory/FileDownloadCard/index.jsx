// SPDX-License-Identifier: MIT
import { memo, useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import { DownloadSimple, CircleNotch, Eye } from "@phosphor-icons/react";
import { humanFileSize } from "@/utils/numbers";
import StorageFiles from "@/models/files";
import { useChatSidebar } from "../../ChatSidebar";

// Module-level guard so a freshly generated report only auto-opens the preview
// once — never again on re-renders or when the chat history reloads.
const autoPreviewedFiles = new Set();

/**
 * @param {{content: {filename: string, storageFilename?: string, fileSize?: number}}} props
 * @param {boolean} [autoPreview] - When true (live agent output), opens the
 *   preview sidebar automatically the first time this report is rendered (#55).
 */
function FileDownloadCard({ props, autoPreview = false }) {
  const { filename, storageFilename, fileSize, downloadUrl } = props.content || {};
  const { badge, badgeBg, badgeText, fileType } = getFileDisplayInfo(filename);
  const [downloading, setDownloading] = useState(false);
  const { openPreview } = useChatSidebar();

  const previewUrl =
    downloadUrl || (storageFilename ? `/api/files/${storageFilename}` : null);

  function buildPreviewData() {
    return {
      title: filename || "Vorschau",
      type: filename?.endsWith(".pdf") ? "pdf" : "doc",
      downloadUrl: previewUrl,
      versions: [],
      content: null,
    };
  }

  function handlePreview() {
    openPreview(buildPreviewData());
  }

  // #55: Automatically reveal the preview sidebar when an agent generates a
  // new report. Keyed by the file identity so it fires exactly once.
  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (!autoPreview || didAutoOpen.current || !previewUrl) return;
    const key = storageFilename || downloadUrl || filename;
    if (!key || autoPreviewedFiles.has(key)) return;
    autoPreviewedFiles.add(key);
    didAutoOpen.current = true;
    openPreview(buildPreviewData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPreview, previewUrl, storageFilename, downloadUrl, filename]);

  const handleDownload = async () => {
    if (downloading) return;
    if (!storageFilename) return;

    setDownloading(true);
    try {
      const blob = await StorageFiles.download(storageFilename);
      if (!blob) throw new Error("Failed to download file");
      saveAs(blob, filename || storageFilename);
    } catch {
      console.error("Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex justify-center w-full my-2">
      <div className="w-full max-w-[750px] mr-4">
        <div className="flex items-center justify-between bg-zinc-800 light:bg-slate-100 light:border light:border-slate-200/50 rounded-xl px-2 py-1">
          <div className="flex items-center gap-x-3 min-w-0">
            <div
              className={`${badgeBg} ${badgeText} rounded-lg flex items-center justify-center flex-shrink-0 h-[48px] w-[48px] text-xs font-bold`}
            >
              {badge}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-white light:text-slate-900 text-sm font-medium truncate leading-snug">
                {filename || "Unknown file"}
              </p>
              <p className="text-zinc-400 light:text-slate-500 text-xs leading-snug">
                {humanFileSize(fileSize, true, 1)}
                {fileSize && fileType ? " · " : ""}
                {fileType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-x-2 flex-shrink-0 ml-4">
            {(downloadUrl || storageFilename) && (
              <button
                onClick={handlePreview}
                type="button"
                className="flex items-center gap-x-1.5 px-3 py-2 rounded-lg border border-zinc-700 light:border-theme-sidebar-border hover:bg-zinc-700 light:hover:bg-theme-bg-secondary transition-colors text-zinc-300 light:text-theme-text-secondary text-sm font-medium"
              >
                <Eye size={15} weight="regular" />
                <span>Vorschau</span>
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-x-2 px-4 py-2 rounded-lg border border-zinc-600 light:border-theme-sidebar-border hover:bg-zinc-700 light:hover:bg-theme-bg-secondary transition-colors text-white light:text-theme-text-primary text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <CircleNotch size={16} weight="bold" className="animate-spin" />
              ) : (
                <DownloadSimple size={16} weight="bold" />
              )}
              <span>{downloading ? "Downloading..." : "Download"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Get display info for a file based on its extension
 * @param {string} filename
 * @returns {{badge: string, badgeBg: string, badgeText: string, fileType: string}}
 */
function getFileDisplayInfo(filename) {
  const extension = filename?.split(".")?.pop()?.toLowerCase() ?? "txt";
  switch (extension) {
    case "pptx":
    case "ppt":
      return {
        badge: "PPT",
        badgeBg: "bg-orange-100",
        badgeText: "text-orange-700",
        fileType: "PowerPoint",
      };
    case "pdf":
      return {
        badge: "PDF",
        badgeBg: "bg-red-100",
        badgeText: "text-red-700",
        fileType: "PDF Document",
      };
    case "doc":
    case "docx":
      return {
        badge: "DOC",
        badgeBg: "bg-blue-100",
        badgeText: "text-blue-700",
        fileType: "Word Document",
      };
    case "xls":
    case "xlsx":
      return {
        badge: "XLS",
        badgeBg: "bg-green-100",
        badgeText: "text-green-700",
        fileType: "Spreadsheet",
      };
    case "csv":
      return {
        badge: "CSV",
        badgeBg: "bg-green-100",
        badgeText: "text-green-700",
        fileType: "Spreadsheet",
      };
    default:
      return {
        badge: extension.toUpperCase().slice(0, 4),
        badgeBg: "bg-slate-200",
        badgeText: "text-slate-700",
        fileType: "File",
      };
  }
}

export default memo(FileDownloadCard);
