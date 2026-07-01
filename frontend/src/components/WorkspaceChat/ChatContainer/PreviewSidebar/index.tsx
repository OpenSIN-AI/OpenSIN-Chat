// SPDX-License-Identifier: MIT
import { useState, useRef, useEffect, Suspense, lazy } from "react";
import { useParams } from "react-router-dom";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { DownloadSimple } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { Bookmark } from "@phosphor-icons/react/dist/csr/Bookmark";
import { CaretDown } from "@phosphor-icons/react/dist/csr/CaretDown";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { FileText } from "@phosphor-icons/react/dist/csr/FileText";
import { Table } from "@phosphor-icons/react/dist/csr/Table";
import { ChartLineUp } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { Image } from "@phosphor-icons/react/dist/csr/Image";
import { DotsThree } from "@phosphor-icons/react/dist/csr/DotsThree";
import { Eye } from "@phosphor-icons/react/dist/csr/Eye";
import { CircleNotch } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { useTranslation } from "react-i18next";
import DOMPurify from "@/utils/chat/purify";
import ChatSidebar from "../ChatSidebar";
import { usePreviewSidebar } from "../ChatSidebar";
import { baseHeaders } from "@/utils/request";
import useAuthenticatedBlobUrl from "@/hooks/useAuthenticatedBlobUrl";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";

const HTML_PREVIEW_SANITIZE_OPTS = {
  ALLOWED_TAGS: [
    "a",
    "b",
    "i",
    "u",
    "strong",
    "em",
    "br",
    "p",
    "span",
    "div",
    "section",
    "article",
    "ul",
    "ol",
    "li",
    "blockquote",
    "pre",
    "code",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "img",
    "figure",
    "figcaption",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "id", "target", "rel"],
};
const safeHtml = (html) => DOMPurify.sanitize(html, HTML_PREVIEW_SANITIZE_OPTS);

// Icon map for preview content types
const TYPE_ICONS = {
  pdf: FilePdf,
  doc: FileText,
  table: Table,
  report: ChartLineUp,
  image: Image,
  social: FileText,
  default: FileText,
};

function VersionDropdown({ versions, activeVersion, onSelect }: any) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false as any);
  const ref: any = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!versions || versions.length <= 1) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2 h-6 rounded border border-zinc-700 light:border-slate-300 bg-zinc-800 light:bg-slate-100 text-xs text-zinc-300 light:text-slate-600 hover:border-zinc-500 light:hover:border-slate-400 transition-colors cursor-pointer"
      >
        <span className="truncate max-w-[120px]">
          {versions[activeVersion]?.label ||
            t("preview.version", { number: activeVersion + 1 })}
        </span>
        <CaretDown size={10} />
      </button>
      {open && (
        <div className="absolute left-0 top-[28px] z-50 bg-zinc-800 light:bg-white border border-zinc-700 light:border-slate-200 rounded-lg shadow-xl py-1 min-w-[160px]">
          {(versions as any).map((v, idx) => (
            <button
              key={v.label || idx}
              type="button"
              onClick={() => {
                onSelect(idx);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors border-none cursor-pointer ${
                idx === activeVersion
                  ? "bg-zinc-700 light:bg-slate-100 text-white light:text-slate-900"
                  : "bg-transparent text-zinc-300 light:text-slate-600 hover:bg-zinc-700/60 light:hover:bg-slate-50"
              }`}
            >
              {v.label || t("preview.version", { number: idx + 1 })}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreeDotsMenu({ previewData, onAddToSources, addingSource }: any) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false as any);
  const ref: any = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Agent-generated files live behind an auth-protected route, so a plain
  // <a href> / window.open (which sends no Bearer token) gets a 401. We fetch
  // the file with the auth header and hand the browser a blob: URL instead.
  async function fetchAsBlobUrl(targetUrl) {
    const res = await fetch(targetUrl, { headers: baseHeaders() });
    if (!res.ok) throw new Error(`${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  async function handleDownload() {
    const targetUrl = previewData?.downloadUrl || previewData?.url;
    if (!targetUrl) return;
    setOpen(false);
    try {
      const objectUrl = await fetchAsBlobUrl(targetUrl);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = previewData.title || "download";
      a.click();
      // Revoke after the click has had a chance to start the download.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch {
      // Fall back to a direct navigation (works for public/non-auth URLs).
      window.open(targetUrl, "_blank");
    }
  }

  async function handleOpenNewTab() {
    const targetUrl = previewData?.downloadUrl || previewData?.url;
    if (!targetUrl) return;
    setOpen(false);
    try {
      const objectUrl = await fetchAsBlobUrl(targetUrl);
      window.open(objectUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      window.open(targetUrl, "_blank");
    }
  }

  function handleAddToSources() {
    onAddToSources?.();
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-6 h-6 rounded border-none bg-transparent text-zinc-400 light:text-slate-500 hover:text-white light:hover:text-slate-900 hover:bg-zinc-700 light:hover:bg-slate-100 cursor-pointer transition-colors"
        aria-label={t("common.moreOptions")}
      >
        <DotsThree size={16} weight="bold" />
      </button>
      {open && (
        <div className="absolute right-0 top-[28px] z-50 bg-zinc-800 light:bg-white border border-zinc-700 light:border-slate-200 rounded-lg shadow-xl py-1 w-[192px]">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 light:text-slate-600 hover:bg-zinc-700/60 light:hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-colors"
          >
            <DownloadSimple size={13} />
            {t("preview.menu.download")}
          </button>
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 light:text-slate-600 hover:bg-zinc-700/60 light:hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-colors"
          >
            <ArrowSquareOut size={13} />
            {t("preview.menu.open_new_tab")}
          </button>
          <div className="my-1 border-t border-zinc-700 light:border-slate-200" />
          <button
            type="button"
            onClick={handleAddToSources}
            disabled={addingSource}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 light:text-slate-600 hover:bg-zinc-700/60 light:hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingSource ? (
              <CircleNotch size={13} weight="bold" className="animate-spin" />
            ) : (
              <Bookmark size={13} />
            )}
            {addingSource
              ? t("preview.adding")
              : t("preview.menu.add_to_sources")}
          </button>
        </div>
      )}
    </div>
  );
}

const PdfPreview = lazy(() => import("./PdfPreview"));

function IframePreview({ url, title }: any) {
  const { t } = useTranslation();
  const { blobUrl, error: fetchError } = useAuthenticatedBlobUrl(url);
  const [loaded, setLoaded] = useState(false);
  const [isPdf, setIsPdf] = useState(false);

  useEffect(() => {
    setIsPdf(!!url && url.includes("/api/utils/reports/"));
  }, [url]);

  useEffect(() => {
    setLoaded(false);
  }, [blobUrl, url]);

  if (fetchError && !url?.includes("/api/utils/reports/")) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-zinc-900 light:bg-white">
        <FilePdf size={28} className="text-zinc-500 light:text-slate-400" />
        <p className="text-xs text-zinc-500 light:text-slate-400 text-center px-4">
          {t("preview.load_error")}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 light:bg-slate-100 text-xs text-zinc-300 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors no-underline"
        >
          <ArrowSquareOut size={12} />
          {t("preview.open_externally")}
        </a>
      </div>
    );
  }

  if (isPdf && blobUrl) {
    return (
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center h-full gap-3 bg-zinc-900 light:bg-white">
            <FilePdf
              size={28}
              className="text-zinc-500 light:text-slate-400 animate-pulse"
            />
            <p className="text-xs text-zinc-500 light:text-slate-400">
              {t("preview.loading")}
            </p>
          </div>
        }
      >
        <PdfPreview blobUrl={blobUrl} title={title} />
      </Suspense>
    );
  }

  if (isPdf && !blobUrl && !fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-zinc-900 light:bg-white">
        <FilePdf
          size={28}
          className="text-zinc-500 light:text-slate-400 animate-pulse"
        />
        <p className="text-xs text-zinc-500 light:text-slate-400">
          {t("preview.loading")}
        </p>
      </div>
    );
  }

  if (isPdf && fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-zinc-900 light:bg-white">
        <FilePdf size={28} className="text-zinc-500 light:text-slate-400" />
        <p className="text-xs text-zinc-500 light:text-slate-400 text-center px-4">
          {t("preview.load_error")}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 light:bg-slate-100 text-xs text-zinc-300 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors no-underline"
        >
          <ArrowSquareOut size={12} />
          {t("preview.open_externally")}
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {blobUrl && (
        <iframe
          src={blobUrl}
          onLoad={() => setLoaded(true)}
          className="w-full h-full rounded border-none bg-white"
          title={title || t("preview.iframe_title")}
        />
      )}
      {!blobUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 light:bg-white">
          <FilePdf
            size={28}
            className="text-zinc-500 light:text-slate-400 animate-pulse"
          />
          <p className="text-xs text-zinc-500 light:text-slate-400">
            {t("preview.loading")}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Renders a generated image fetched via auth-bearer blob URL.
 * A plain <img src> without Bearer token would get a 401 from the
 * protected /agent-skills/ endpoint, so we fetch via objectURL.
 */
function ImagePreview({ url, title }: { url: string; title?: string }) {
  const { t } = useTranslation();
  const { blobUrl, error: fetchError } = useAuthenticatedBlobUrl(url);

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-zinc-900 light:bg-white">
        <Image size={28} className="text-zinc-500 light:text-slate-400" />
        <p className="text-xs text-zinc-500 light:text-slate-400 text-center px-4">
          {t("preview.load_error")}
        </p>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900 light:bg-white">
        <Image
          size={28}
          className="text-zinc-500 light:text-slate-400 animate-pulse"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-zinc-900 light:bg-slate-50 p-4">
      <img
        src={blobUrl}
        alt={title || t("preview.generated_image")}
        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
      />
    </div>
  );
}

function PreviewContent({ previewData, activeVersion }: any) {
  const { t } = useTranslation();
  if (!previewData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500 light:text-slate-400">
        <Eye size={32} />
        <p className="text-sm text-center px-4">{t("preview.empty")}</p>
      </div>
    );
  }

  const version = previewData.versions?.[activeVersion] ?? previewData;
  const iframeUrl =
    version.downloadUrl ||
    version.url ||
    previewData.downloadUrl ||
    previewData.url;

  // Image preview — render inline <img> instead of <iframe>
  if (previewData.type === "image" && iframeUrl) {
    return <ImagePreview url={iframeUrl} title={previewData.title} />;
  }

  // PDF / URL preview via iframe (includes downloadUrl from generate-report)
  if (iframeUrl) {
    return <IframePreview url={iframeUrl} title={previewData.title} />;
  }

  // HTML content inline
  if (version.html || previewData.html) {
    return (
      <div
        className="w-full h-full overflow-auto p-4 bg-white rounded text-sm text-slate-800"
        dangerouslySetInnerHTML={{
          __html: safeHtml(version.html || previewData.html),
        }}
      />
    );
  }

  // Plain text / markdown
  return (
    <div className="w-full h-full overflow-auto p-4">
      <pre className="text-xs text-zinc-300 light:text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
        {version.content || previewData.content || ""}
      </pre>
    </div>
  );
}

// Import Eye for empty state icon

export default function PreviewSidebar() {
  const { sidebarOpen, previewData, closeSidebar } = usePreviewSidebar();
  const { t } = useTranslation();
  const { slug: workspaceSlug } = useParams();
  const [activeVersion, setActiveVersion] = useState(0 as any);
  const [addingSource, setAddingSource] = useState(false);

  useEffect(() => {
    setActiveVersion(0);
  }, [previewData]);

  const TypeIcon = TYPE_ICONS[previewData?.type] ?? TYPE_ICONS.default;

  async function handleAddToSources() {
    if (!previewData || !workspaceSlug) return;
    const targetUrl =
      previewData.downloadUrl ||
      previewData.url ||
      previewData.versions?.[activeVersion]?.downloadUrl;
    if (!targetUrl) return;

    setAddingSource(true);
    try {
      const res = await fetch(targetUrl, { headers: baseHeaders() });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const blob = await res.blob();

      const title = previewData.title || `report-${Date.now()}`;
      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], title, {
          type: blob.type || "application/octet-stream",
        }),
      );

      const { response, data } = await Workspace.parseFile(
        workspaceSlug,
        formData,
      );
      if (!response.ok) throw new Error(data?.error || "Parse failed");
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
      console.error("Failed to add to sources:", err);
      showToast(t("preview.source_add_failed"), "error");
    } finally {
      setAddingSource(false);
    }
  }

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div className="w-full h-full bg-zinc-900 light:bg-white light:border-l light:border-slate-300 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
          <TypeIcon
            size={16}
            className="text-zinc-400 light:text-slate-500 shrink-0"
          />
          <p className="flex-1 font-medium text-sm text-white light:text-slate-900 truncate">
            {previewData?.title || t("preview.title")}
          </p>
          <VersionDropdown
            versions={previewData?.versions}
            activeVersion={activeVersion}
            onSelect={setActiveVersion}
          />
          <ThreeDotsMenu
            previewData={previewData}
            onAddToSources={handleAddToSources}
            addingSource={addingSource}
          />
          <button
            onClick={closeSidebar}
            type="button"
            aria-label={t("common.close")}
            className="text-white/60 light:text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors border-none bg-transparent cursor-pointer flex-shrink-0"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <PreviewContent
            previewData={previewData}
            activeVersion={activeVersion}
          />
        </div>
      </div>
    </ChatSidebar>
  );
}
