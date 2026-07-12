import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export default function PdfPreview({ blobUrl }: { blobUrl: string }) {
  const { t } = useTranslation();
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-zinc-900 light:bg-white">
        <FilePdf size={28} className="text-zinc-500 light:text-slate-400" />
        <p className="text-xs text-zinc-500 light:text-slate-400 text-center px-4">
          {t("pdfPreview.loadError")}
        </p>
        <a
          href={blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 light:bg-slate-100 text-xs text-zinc-300 light:text-slate-600 hover:text-theme-text-primary light:hover:text-theme-text-primary transition-colors no-underline"
        >
          <ArrowSquareOut size={12} />
          {t("pdfPreview.openInNewTab")}
        </a>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-auto bg-zinc-800 light:bg-slate-100 flex flex-col items-center"
    >
      <Document
        file={blobUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={() => setError(true)}
        loading={
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <FilePdf
              size={28}
              className="text-zinc-500 light:text-slate-400 animate-pulse"
            />
            <p className="text-xs text-zinc-500 light:text-slate-400">
              PDF wird geladen...
            </p>
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page
            key={i}
            pageNumber={i + 1}
            width={
              containerWidth > 0
                ? Math.min(containerWidth - 20, 800)
                : undefined
            }
            className="mb-2 shadow-lg"
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        ))}
      </Document>
    </div>
  );
}
