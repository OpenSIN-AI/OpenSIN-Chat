// SPDX-License-Identifier: MIT
import { useState, useRef, useEffect } from "react";
import {
  X,
  ArrowSquareOut,
  DownloadSimple,
  Bookmark,
  CaretDown,
  FilePdf,
  FileText,
  Table,
  ChartLineUp,
  Image,
  DotsThree,
  Eye,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import DOMPurify from "@/utils/chat/purify";
import ChatSidebar from "../ChatSidebar";
import { usePreviewSidebar, useChatSidebar } from "../ChatSidebar";

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
  const [open, setOpen] = useState(false);
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
          {versions[activeVersion]?.label || `Version ${activeVersion + 1}`}
        </span>
        <CaretDown size={10} />
      </button>
      {open && (
        <div className="absolute left-0 top-[28px] z-50 bg-zinc-800 light:bg-white border border-zinc-700 light:border-slate-200 rounded-lg shadow-xl py-1 min-w-[160px]">
          {versions.map((v, idx) => (
            <button
              key={idx}
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
              {v.label || `Version ${idx + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThreeDotsMenu({ previewData, onAddToSources }: any) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref: any = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleDownload() {
    if (!previewData?.downloadUrl) return;
    const a = document.createElement("a");
    a.href = previewData.downloadUrl;
    a.download = previewData.title || "download";
    a.click();
    setOpen(false);
  }

  function handleOpenNewTab() {
    if (!previewData?.downloadUrl && !previewData?.url) return;
    window.open(previewData.downloadUrl || previewData.url, "_blank");
    setOpen(false);
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
        aria-label="Mehr Optionen"
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
            {t("preview.menu.download", "Herunterladen")}
          </button>
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 light:text-slate-600 hover:bg-zinc-700/60 light:hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-colors"
          >
            <ArrowSquareOut size={13} />
            {t("preview.menu.open_new_tab", "In neuem Tab öffnen")}
          </button>
          <div className="my-1 border-t border-zinc-700 light:border-slate-200" />
          <button
            type="button"
            onClick={handleAddToSources}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 light:text-slate-600 hover:bg-zinc-700/60 light:hover:bg-slate-50 border-none bg-transparent cursor-pointer transition-colors"
          >
            <Bookmark size={13} />
            {t("preview.menu.add_to_sources", "Zu Quellen hinzufügen")}
          </button>
        </div>
      )}
    </div>
  );
}

function IframePreview({ url, title }: any) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);

  // If the iframe never reports load (e.g. blocked/blank), reveal a fallback
  // link after a short grace period so the user is never stuck on a spinner.
  const [graceElapsed, setGraceElapsed] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setGraceElapsed(false);
    const timer = setTimeout(() => setGraceElapsed(true), 6000);
    return () => clearTimeout(timer);
  }, [url]);

  return (
    <div className="relative w-full h-full">
      <iframe
        src={url}
        onLoad={() => setLoaded(true)}
        className="w-full h-full rounded border-none bg-white"
        title={title || "Vorschau"}
        sandbox="allow-same-origin allow-scripts allow-popups"
      />
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 light:bg-white pointer-events-none">
          <FilePdf
            size={28}
            className="text-zinc-500 light:text-slate-400 animate-pulse"
          />
          <p className="text-xs text-zinc-500 light:text-slate-400">
            {t("preview.loading", "Vorschau wird geladen…")}
          </p>
          {graceElapsed && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 light:bg-slate-100 text-xs text-zinc-300 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors no-underline"
            >
              <ArrowSquareOut size={12} />
              {t("preview.open_externally", "In neuem Tab öffnen")}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewContent({ previewData, activeVersion }: any) {
  const { t } = useTranslation();
  if (!previewData) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500 light:text-slate-400">
        <Eye size={32} />
        <p className="text-sm text-center px-4">
          {t(
            "preview.empty",
            "Kein Inhalt zur Vorschau. Generiere einen Bericht oder ein Dokument, um es hier anzuzeigen.",
          )}
        </p>
      </div>
    );
  }

  const version = previewData.versions?.[activeVersion] ?? previewData;
  const iframeUrl =
    version.downloadUrl ||
    version.url ||
    previewData.downloadUrl ||
    previewData.url;

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
          __html: DOMPurify.sanitize(version.html || previewData.html),
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
  const { openSidebar } = useChatSidebar();
  const { t } = useTranslation();
  const [activeVersion, setActiveVersion] = useState(0);

  const TypeIcon = TYPE_ICONS[previewData?.type] ?? TYPE_ICONS.default;

  function handleAddToSources() {
    if (!previewData) return;
    // Navigate to sources sidebar and pass current preview as a source
    openSidebar("sources", []);
  }

  return (
    <ChatSidebar isOpen={sidebarOpen}>
      <div
        className="ml-4 w-[350px] bg-zinc-900 light:bg-white light:border-2 light:border-slate-300 md:rounded-[16px] flex flex-col overflow-hidden mt-[72px]"
        style={{ maxHeight: "calc(100% - 88px)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0 border-b border-zinc-800 light:border-slate-200">
          <TypeIcon
            size={16}
            className="text-zinc-400 light:text-slate-500 shrink-0"
          />
          <p className="flex-1 font-medium text-sm text-white light:text-slate-900 truncate">
            {previewData?.title || t("preview.title", "Vorschau")}
          </p>
          <VersionDropdown
            versions={previewData?.versions}
            activeVersion={activeVersion}
            onSelect={setActiveVersion}
          />
          <ThreeDotsMenu
            previewData={previewData}
            onAddToSources={handleAddToSources}
          />
          <button
            onClick={closeSidebar}
            type="button"
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
