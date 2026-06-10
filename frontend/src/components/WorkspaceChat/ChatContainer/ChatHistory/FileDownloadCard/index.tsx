// SPDX-License-Identifier: MIT
import { memo, useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import { DownloadSimple, CircleNotch, Eye } from "@phosphor-icons/react";
import { humanFileSize } from "@/utils/numbers";
import StorageFiles from "@/models/files";
import { useChatSidebar } from "../../ChatSidebar";
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

// Extensions that get an image <img> preview instead of an <iframe>.
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

// Module-level guard so a freshly generated report only auto-opens the preview
// once — never again on re-renders or when the chat history reloads.
const autoPreviewedFiles = new Set();

/**
 * @param {{content: {filename: string, storageFilename?: string, fileSize?: number}}} props
 * @param {boolean} [autoPreview] - When true (live agent output), opens the
 *   preview sidebar automatically the first time this report is rendered (#55).
 */
function FileDownloadCard({ props, autoPreview = false }: any) {
  const { filename, storageFilename, fileSize, downloadUrl } = props.content || {};
  const { badge, badgeBg, badgeText, fileType, isImage } = getFileDisplayInfo(filename);
  const [downloading, setDownloading] = useState(false as any);
  const { openPreview } = useChatSidebar();

  // Derive content type for the preview sidebar
  const ext = filename?.split(".")?.pop()?.toLowerCase() ?? "";
  const previewType = IMAGE_EXTENSIONS.has(ext) ? "image" : ext === "pdf" ? "pdf" : "doc";

  const previewUrl =
    downloadUrl ||
    (storageFilename
      ? `${API_BASE}/agent-skills/generated-files/${encodeURIComponent(storageFilename)}`
      : null);

  function buildPreviewData() {
    return {
      title: filename || "Vorschau",
      type: previewType,
      downloadUrl: previewUrl,
      versions: [],
      content: null,
    };
  }

  function handlePreview() {
    openPreview(buildPreviewData());
  }

  // #55: Automatically reveal the preview sidebar when an agent generates a
  // new file. Keyed by the file identity so it fires exactly once.
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
        {/* Inline image preview for generated images */}
        {isImage && previewUrl && (
          <ImagePreviewBanner
            url={previewUrl}
            alt={filename || "Generated image"}
          />
        )}

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
            {(downloadUrl || storageFilename) && !isImage && (
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
 * Renders a generated image inline above the download bar.
 * Fetches via auth-header so the protected /agent-skills/ endpoint
 * returns 200 (a plain <img src> without Bearer would get 401).
 */
function ImagePreviewBanner({ url, alt }: { url: string; alt: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    fetch(url, { headers: baseHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (error || (!blobUrl)) return null;

  return (
    <div className="mb-2 rounded-xl overflow-hidden border border-zinc-700 light:border-slate-200 bg-zinc-900 light:bg-slate-50 flex items-center justify-center max-h-[420px]">
      <img
        src={blobUrl}
        alt={alt}
        className="max-w-full max-h-[420px] object-contain"
      />
    </div>
  );
}

/**
 * Get display info for a file based on its extension.
 */
function getFileDisplayInfo(filename: any) {
  const extension = filename?.split(".")?.pop()?.toLowerCase() ?? "txt";
  switch (extension) {
    case "pptx":
    case "ppt":
      return {
        badge: "PPT",
        badgeBg: "bg-orange-100",
        badgeText: "text-orange-700",
        fileType: "PowerPoint",
        isImage: false,
      };
    case "pdf":
      return {
        badge: "PDF",
        badgeBg: "bg-red-100",
        badgeText: "text-red-700",
        fileType: "PDF Document",
        isImage: false,
      };
    case "doc":
    case "docx":
      return {
        badge: "DOC",
        badgeBg: "bg-blue-100",
        badgeText: "text-blue-700",
        fileType: "Word Document",
        isImage: false,
      };
    case "xls":
    case "xlsx":
      return {
        badge: "XLS",
        badgeBg: "bg-green-100",
        badgeText: "text-green-700",
        fileType: "Spreadsheet",
        isImage: false,
      };
    case "csv":
      return {
        badge: "CSV",
        badgeBg: "bg-green-100",
        badgeText: "text-green-700",
        fileType: "Spreadsheet",
        isImage: false,
      };
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
      return {
        badge: "IMG",
        badgeBg: "bg-purple-100",
        badgeText: "text-purple-700",
        fileType: "Image",
        isImage: true,
      };
    case "svg":
      return {
        badge: "SVG",
        badgeBg: "bg-purple-100",
        badgeText: "text-purple-700",
        fileType: "Vector Image",
        isImage: true,
      };
    default:
      return {
        badge: extension.toUpperCase().slice(0, 4),
        badgeBg: "bg-slate-200",
        badgeText: "text-slate-700",
        fileType: "File",
        isImage: false,
      };
  }
}

export default memo(FileDownloadCard);
