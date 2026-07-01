// SPDX-License-Identifier: MIT
import { memo, useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { saveAs } from "file-saver";
import { useTranslation } from "react-i18next";
import { DownloadSimple } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { Bookmark } from "@phosphor-icons/react/dist/csr/Bookmark";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { humanFileSize } from "@/utils/numbers";
import StorageFiles from "@/models/files";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { useChatSidebar } from "../../ChatSidebar";
import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";
import useAuthenticatedBlobUrl from "@/hooks/useAuthenticatedBlobUrl";

const AUTO_PREVIEW_MAX = 200;
const autoPreviewedFiles = new Set();

/**
 * Resolve a server-relative "/api/..." URL to the configured API base.
 * When the frontend is served from a different origin than the API
 * (VITE_API_BASE is a full URL), rewrite the "/api" prefix so the
 * iframe / fetch targets the API host, not the frontend origin.
 * Mirrors ReportPreviewListener.resolveUrl.
 */
function resolveApiUrl(url: string | null | undefined): string | null {
  if (!url) return url ?? null;
  if (API_BASE !== "/api" && url.startsWith("/api/")) {
    return `${API_BASE}${url.slice(4)}`;
  }
  return url;
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

const FILE_TYPE_MAP = {
  ppt: {
    badge: "PPT",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700",
    fileTypeKey: "powerpoint",
  },
  pptx: {
    badge: "PPT",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700",
    fileTypeKey: "powerpoint",
  },
  pdf: {
    badge: "PDF",
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    fileTypeKey: "pdf",
  },
  doc: {
    badge: "DOC",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    fileTypeKey: "word",
  },
  docx: {
    badge: "DOC",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-700",
    fileTypeKey: "word",
  },
  xls: {
    badge: "XLS",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
    fileTypeKey: "spreadsheet",
  },
  xlsx: {
    badge: "XLS",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
    fileTypeKey: "spreadsheet",
  },
  csv: {
    badge: "CSV",
    badgeBg: "bg-green-100",
    badgeText: "text-green-700",
    fileTypeKey: "spreadsheet",
  },
  png: {
    badge: "IMG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileTypeKey: "image",
  },
  jpg: {
    badge: "IMG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileTypeKey: "image",
  },
  jpeg: {
    badge: "IMG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileTypeKey: "image",
  },
  gif: {
    badge: "IMG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileTypeKey: "image",
  },
  webp: {
    badge: "IMG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileTypeKey: "image",
  },
  svg: {
    badge: "SVG",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    fileTypeKey: "vectorImage",
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
    fileTypeKey: "file",
  };
  return { ...base, extension, isImage, previewType };
}

function FileDownloadCard({ props, autoPreview = false }) {
  const { t } = useTranslation();
  const { slug: workspaceSlug } = useParams();
  const { filename, storageFilename, fileSize, downloadUrl } =
    props.content || {};
  const { badge, badgeBg, badgeText, fileTypeKey, isImage, previewType } =
    getFileDisplayInfo(filename);
  const [downloading, setDownloading] = useState(false);
  const [addingSource, setAddingSource] = useState(false);
  const { openPreview } = useChatSidebar();

  const previewUrl = resolveApiUrl(
    downloadUrl ||
      (storageFilename
        ? `${API_BASE}/agent-skills/generated-files/${encodeURIComponent(storageFilename)}`
        : null),
  );

  function buildPreviewData() {
    return {
      title: filename || t("preview.title"),
      type: previewType,
      downloadUrl: previewUrl,
      versions: props.content?.versions || [],
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
    if (autoPreviewedFiles.size > AUTO_PREVIEW_MAX) {
      const first = autoPreviewedFiles.values().next().value;
      if (first !== undefined) autoPreviewedFiles.delete(first);
    }
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
    if (!storageFilename && !downloadUrl) return;

    setDownloading(true);
    try {
      let blob: Blob | null = null;
      if (storageFilename) {
        blob = await StorageFiles.download(storageFilename);
      } else if (downloadUrl) {
        const res = await fetch(resolveApiUrl(downloadUrl), {
          headers: baseHeaders(),
        });
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        blob = await res.blob();
      }
      if (!blob) throw new Error("Failed to download file");
      saveAs(blob, filename || storageFilename || "download");
    } catch {
      console.error("Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  const handleAddToSource = async () => {
    if (addingSource || !workspaceSlug) return;
    setAddingSource(true);
    try {
      let blob: Blob | null = null;
      if (storageFilename) {
        blob = await StorageFiles.download(storageFilename);
      } else if (downloadUrl) {
        const res = await fetch(resolveApiUrl(downloadUrl), {
          headers: baseHeaders(),
        });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        blob = await res.blob();
      }
      if (!blob) throw new Error("Failed to fetch file");

      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], filename || storageFilename || "report", {
          type: blob.type || "application/octet-stream",
        }),
      );

      const { response, data } = await Workspace.parseFile(
        workspaceSlug,
        formData,
      );
      if (!response.ok) {
        throw new Error(data?.error || "Parse failed");
      }
      const parsedFile = data.files?.[0];
      if (!parsedFile) throw new Error("No parsed file returned");

      const embedResult = await Workspace.embedParsedFile(
        workspaceSlug,
        parsedFile.id,
      );
      if (!embedResult.response.ok) {
        throw new Error(embedResult.data?.error || "Embed failed");
      }
      showToast(t("preview.source_added"), "success");
    } catch (err) {
      console.error("Failed to add to source:", err);
      showToast(t("preview.source_add_failed"), "error");
    } finally {
      setAddingSource(false);
    }
  };

  const handleOpenNewTab = async () => {
    try {
      let blob: Blob | null = null;
      if (storageFilename) {
        blob = await StorageFiles.download(storageFilename);
      } else if (downloadUrl) {
        const res = await fetch(resolveApiUrl(downloadUrl), {
          headers: baseHeaders(),
        });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        blob = await res.blob();
      }
      if (!blob) throw new Error("Failed to fetch file");
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      if (previewUrl) window.open(previewUrl, "_blank");
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

        <div className="flex flex-col gap-2 bg-zinc-800 light:bg-slate-100 light:border light:border-slate-200/50 rounded-xl p-3">
          <div className="flex items-center gap-x-3 min-w-0">
            <div
              className={`${badgeBg} ${badgeText} rounded-lg flex items-center justify-center flex-shrink-0 h-[48px] w-[48px] text-xs font-bold`}
            >
              {badge}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-white light:text-slate-900 text-sm font-medium truncate leading-snug">
                {filename || t("preview.unknown_file")}
              </p>
              <p className="text-zinc-400 light:text-slate-500 text-xs leading-snug">
                {humanFileSize(fileSize, true, 1)}
                {fileSize && fileTypeKey ? " · " : ""}
                {t(`preview.fileType.${fileTypeKey}`)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(downloadUrl || storageFilename) && !isImage && (
              <button
                onClick={handlePreview}
                type="button"
                className="flex items-center gap-x-1.5 px-3 py-2 rounded-lg bg-primary-button text-slate-900 hover:opacity-90 transition-colors text-sm font-medium border-none"
              >
                <Eye size={15} weight="bold" />
                <span>{t("preview.open")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              aria-busy={downloading}
              className="flex items-center gap-x-2 px-4 py-2 rounded-lg border border-zinc-600 light:border-theme-sidebar-border hover:bg-zinc-700 light:hover:bg-theme-bg-secondary transition-colors text-white light:text-theme-text-primary text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <CircleNotch
                  size={16}
                  weight="bold"
                  className="animate-spin"
                />
              ) : (
                <DownloadSimple size={16} weight="bold" />
              )}
              <span>
                {downloading ? t("preview.downloading") : t("preview.download")}
              </span>
            </button>
            {(downloadUrl || storageFilename) && (
              <button
                onClick={handleOpenNewTab}
                type="button"
                aria-label={t("preview.open_new_tab")}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-700 light:border-theme-sidebar-border hover:bg-zinc-700 light:hover:bg-theme-bg-secondary transition-colors text-zinc-300 light:text-theme-text-secondary"
              >
                <ArrowSquareOut size={15} weight="regular" />
              </button>
            )}
            {(downloadUrl || storageFilename) && workspaceSlug && (
              <button
                type="button"
                onClick={handleAddToSource}
                disabled={addingSource}
                aria-busy={addingSource}
                className="flex items-center gap-x-1.5 px-3 py-2 rounded-lg border border-zinc-700 light:border-theme-sidebar-border hover:bg-zinc-700 light:hover:bg-theme-bg-secondary transition-colors text-zinc-300 light:text-theme-text-secondary text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingSource ? (
                  <CircleNotch
                    size={15}
                    weight="bold"
                    className="animate-spin"
                  />
                ) : (
                  <Bookmark size={15} weight="regular" />
                )}
                <span>
                  {addingSource
                    ? t("preview.adding")
                    : t("preview.add_to_source")}
                </span>
              </button>
            )}
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
