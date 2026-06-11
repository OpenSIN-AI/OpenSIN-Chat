// SPDX-License-Identifier: MIT
import { memo, useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import { useTranslation } from "react-i18next";
import { DownloadSimple, CircleNotch, Eye } from "@phosphor-icons/react";
import { humanFileSize } from "@/utils/numbers";
import StorageFiles from "@/models/files";
import { useChatSidebar } from "../../ChatSidebar";
import { API_BASE } from "@/utils/constants";
import useAuthenticatedBlobUrl from "@/hooks/useAuthenticatedBlobUrl";

const autoPreviewedFiles = new Set();

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

const FILE_TYPE_MAP = {
  ppt: {
    badge: "PPT",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700",
    fileType: "PowerPoint",
  },
  pptx: {
    badge: "PPT",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700",
    fileType: "PowerPoint",
  },
  pdf: {
    badge: "PDF",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    fileType: "PDF Document",
  },
  doc: {
    badge: "DOC",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    fileType: "Word Document",
  },
  docx: {
    badge: "DOC",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    fileType: "Word Document",
  },
  xls: {
    badge: "XLS",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
    fileType: "Spreadsheet",
  },
  xlsx: {
    badge: "XLS",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
    fileType: "Spreadsheet",
  },
  csv: {
    badge: "CSV",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
    fileType: "Spreadsheet",
  },
  png: {
    badge: "IMG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileType: "Image",
  },
  jpg: {
    badge: "IMG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileType: "Image",
  },
  jpeg: {
    badge: "IMG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileType: "Image",
  },
  gif: {
    badge: "IMG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileType: "Image",
  },
  webp: {
    badge: "IMG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileType: "Image",
  },
  svg: {
    badge: "SVG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileType: "Vector Image",
  },
};

export function getFileDisplayInfo(filename) {
  const extension = filename?.split(".")?.pop()?.toLowerCase() ?? "txt";
  const isImage = IMAGE_EXTENSIONS.has(extension);
  const previewType = isImage ? "image" : extension === "pdf" ? "pdf" : "doc";
  const base = FILE_TYPE_MAP[extension] ?? {
    badge: extension.toUpperCase().slice(0, 4),
    badgeBg: "bg-slate-200",
    badgeText: "text-slate-700",
    fileType: "File",
  };
  return { ...base, extension, isImage, previewType };
}

function FileDownloadCard({ props, autoPreview = false }) {
  const { t } = useTranslation();
  const { filename, storageFilename, fileSize, downloadUrl } =
    props.content || {};
  const { badge, badgeBg, badgeText, fileType, isImage, previewType } =
    getFileDisplayInfo(filename);
  const [downloading, setDownloading] = useState(false);
  const { openPreview } = useChatSidebar();

  const previewUrl =
    downloadUrl ||
    (storageFilename
      ? `${API_BASE}/agent-skills/generated-files/${encodeURIComponent(storageFilename)}`
      : null);

  function buildPreviewData() {
    return {
      title: filename || t("preview.title"),
      type: previewType,
      downloadUrl: previewUrl,
      versions: [],
      content: null,
    };
  }

  function handlePreview() {
    openPreview(buildPreviewData());
  }

  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (!autoPreview || isImage || didAutoOpen.current || !previewUrl) return;
    const key = storageFilename || downloadUrl || filename;
    if (!key || autoPreviewedFiles.has(key)) return;
    autoPreviewedFiles.add(key);
    didAutoOpen.current = true;
    openPreview(buildPreviewData());
  }, [
    autoPreview,
    isImage,
    previewUrl,
    storageFilename,
    downloadUrl,
    filename,
  ]);

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
        {isImage && previewUrl && (
          <ImagePreviewBanner
            url={previewUrl}
            alt={filename || t("preview.generated_image")}
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
                {filename || t("preview.unknown_file")}
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
                <span>{t("preview.open")}</span>
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
              <span>
                {downloading ? t("preview.downloading") : t("preview.download")}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImagePreviewBanner({ url, alt }) {
  const { blobUrl, error, loading } = useAuthenticatedBlobUrl(url);

  if (error) return null;

  if (loading) {
    return (
      <div className="mb-2 rounded-xl overflow-hidden border border-zinc-700 light:border-slate-200 bg-zinc-900 light:bg-slate-50 h-[200px] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin" />
      </div>
    );
  }

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

export default memo(FileDownloadCard);
