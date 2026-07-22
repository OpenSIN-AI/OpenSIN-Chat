// SPDX-License-Identifier: MIT
// Report modal: displays PDF analysis results with TOC, download options, and markdown rendering
import React, { Suspense, useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
const ReactMarkdown = React.lazy(() => import("react-markdown"));
import remarkGfm from "remark-gfm";
import { FilePdf } from "@phosphor-icons/react/dist/csr/FilePdf";
import { FileDoc } from "@phosphor-icons/react/dist/csr/FileDoc";
import { FileMd } from "@phosphor-icons/react/dist/csr/FileMd";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { ListBullets } from "@phosphor-icons/react/dist/csr/ListBullets";
import PdfAnalysis from "@/models/pdfAnalysis";
import PreLoader from "@/components/Preloader";
import { copyText } from "@/utils/clipboard";
import showToast from "@/utils/toast";
import logger from "@/utils/logger";
import {
  nodeToText,
  extractHeadings,
  downloadMarkdown,
  downloadDocx,
  downloadPdf,
} from "../utils";
import type { PdfJob } from "./JobsPanel";

interface ReportResult {
  totalPages?: number;
  chunks?: number;
  factsStored?: number;
  chunkErrors?: number;
  report?: string;
  error?: string;
  [key: string]: any;
}

interface ReportModalProps {
  job: PdfJob;
  onClose: () => void;
}

export function ReportModal({ job, onClose }: ReportModalProps) {
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState<ReportResult | null>(null);
  const [tocOpen, setTocOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    PdfAnalysis.result(job.id)
      .then((res) => {
        if (!cancelled) setResult(res as ReportResult);
      })
      .catch((e) => {
        if (!cancelled) logger.error(e);
      });
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const headings = useMemo(
    () => (result?.report ? extractHeadings(result.report) : []),
    [result?.report],
  );

  function scrollToHeading(id: string) {
    const el = contentRef.current?.querySelector(`[data-heading-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAddAsSource() {
    if (result?.report) {
      copyText(result.report).then((ok) => {
        if (ok) showToast(t("pdfAnalysis.panel.addedAsSourceToast"), "success");
      });
    }
  }

  const reportMd = result?.report ?? "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("pdfAnalysis.panel.reportFor", { name: job.documentName })}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 p-4 border-b border-theme-sidebar-border shrink-0">
          <h3 className="text-sm font-semibold text-theme-text-primary truncate flex-1 min-w-0">
            {t("pdfAnalysis.panel.reportFor", { name: job.documentName })}
          </h3>

          {headings.length > 0 && (
            <button
              type="button"
              onClick={() => setTocOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-theme-bg-container text-theme-text-secondary hover:text-theme-text-primary border border-theme-sidebar-border transition-colors"
              aria-pressed={tocOpen}
              title={t("pdfAnalysis.panel.tocToggle")}
            >
              <ListBullets size={13} aria-hidden="true" />
              {t("pdfAnalysis.panel.tocToggle")}
            </button>
          )}

          <button
            type="button"
            onClick={handleAddAsSource}
            disabled={!result?.report}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:bg-theme-bg-secondary transition-colors disabled:opacity-50"
            title={t("pdfAnalysis.panel.addAsSource")}
          >
            <FilePdf size={13} aria-hidden="true" />
            {t("pdfAnalysis.panel.addAsSource")}
          </button>

          <button
            type="button"
            onClick={() =>
              downloadMarkdown(
                job.documentName,
                reportMd,
                t("pdfAnalysis.panel.reportSuffix"),
              )
            }
            disabled={!result?.report}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:bg-theme-bg-secondary transition-colors disabled:opacity-50"
            title={t("pdfAnalysis.panel.downloadMd")}
          >
            <FileMd size={13} aria-hidden="true" />
            .md
          </button>

          <button
            type="button"
            onClick={() =>
              downloadDocx(
                job.documentName,
                reportMd,
                t("pdfAnalysis.panel.reportSuffix"),
              ).catch(() => {})
            }
            disabled={!result?.report}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:bg-theme-bg-secondary transition-colors disabled:opacity-50"
            title={t("pdfAnalysis.panel.downloadDocx")}
          >
            <FileDoc size={13} aria-hidden="true" />
            .docx
          </button>

          <button
            type="button"
            onClick={() =>
              downloadPdf(
                job.documentName,
                reportMd,
                t("pdfAnalysis.panel.reportSuffix"),
              )
            }
            disabled={!result?.report}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:bg-theme-bg-secondary transition-colors disabled:opacity-50"
            title={t("pdfAnalysis.panel.downloadPdf")}
          >
            <FilePdf size={13} aria-hidden="true" />
            .pdf
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-md text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-container transition-colors"
            aria-label={t("pdfAnalysis.panel.close")}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* ── Body: TOC + Content ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {tocOpen && headings.length > 0 && (
            <nav
              aria-label={t("pdfAnalysis.panel.tocLabel")}
              className="w-56 shrink-0 border-r border-theme-sidebar-border overflow-y-auto p-4"
            >
              <p className="text-xs font-semibold text-theme-text-secondary uppercase tracking-wide mb-3">
                {t("pdfAnalysis.panel.tocLabel")}
              </p>
              <ul className="flex flex-col gap-1">
                {headings.map((h, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => scrollToHeading(h.id)}
                      className={`w-full text-left text-xs text-theme-text-secondary hover:text-theme-text-primary leading-snug py-0.5 ${
                        h.level === 1
                          ? "font-semibold"
                          : h.level === 2
                            ? "pl-3"
                            : "pl-6 opacity-80"
                      }`}
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div ref={contentRef} className="flex-1 overflow-y-auto p-5 min-w-0">
            {!result ? (
              <p className="text-sm text-theme-text-secondary">
                {t("pdfAnalysis.panel.loading")}
              </p>
            ) : result.report ? (
              <>
                <p className="text-xs text-theme-text-secondary mb-4">
                  {t("pdfAnalysis.panel.summary", {
                    totalPages: result.totalPages,
                    chunks: result.chunks,
                    factsStored: result.factsStored,
                  })}
                  {(result.chunkErrors ?? 0) > 0 &&
                    t("pdfAnalysis.panel.chunkErrors", {
                      count: result.chunkErrors,
                    })}
                </p>
                <Suspense fallback={<PreLoader />}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={
                      {
                        h1: ({ children, ...p }: any) => {
                          const text = nodeToText(children);
                          const id = text
                            .toLowerCase()
                            .replace(/[^\w\s-]/g, "")
                            .replace(/\s+/g, "-");
                          return (
                            <h1
                              data-heading-id={id}
                              className="text-lg font-bold text-theme-text-primary mt-6 mb-3 leading-snug"
                              {...p}
                            >
                              {children}
                            </h1>
                          );
                        },
                        h2: ({ children, ...p }: any) => {
                          const text = nodeToText(children);
                          const id = text
                            .toLowerCase()
                            .replace(/[^\w\s-]/g, "")
                            .replace(/\s+/g, "-");
                          return (
                            <h2
                              data-heading-id={id}
                              className="text-base font-semibold text-theme-text-primary mt-5 mb-2 leading-snug"
                              {...p}
                            >
                              {children}
                            </h2>
                          );
                        },
                        h3: ({ children, ...p }: any) => {
                          const text = nodeToText(children);
                          const id = text
                            .toLowerCase()
                            .replace(/[^\w\s-]/g, "")
                            .replace(/\s+/g, "-");
                          return (
                            <h3
                              data-heading-id={id}
                              className="text-sm font-semibold text-theme-text-primary mt-4 mb-1.5"
                              {...p}
                            >
                              {children}
                            </h3>
                          );
                        },
                        p: ({ children }: any) => (
                          <p className="text-sm text-theme-text-primary leading-relaxed mb-3">
                            {children}
                          </p>
                        ),
                        strong: ({ children }: any) => (
                          <strong className="font-semibold text-theme-text-primary">
                            {children}
                          </strong>
                        ),
                        em: ({ children }: any) => (
                          <em className="italic text-theme-text-secondary">
                            {children}
                          </em>
                        ),
                        ul: ({ children }: any) => (
                          <ul className="list-disc list-inside text-sm text-theme-text-primary mb-3 flex flex-col gap-1 pl-2">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }: any) => (
                          <ol className="list-decimal list-inside text-sm text-theme-text-primary mb-3 flex flex-col gap-1 pl-2">
                            {children}
                          </ol>
                        ),
                        li: ({ children }: any) => (
                          <li className="leading-relaxed">{children}</li>
                        ),
                        hr: () => (
                          <hr className="border-theme-sidebar-border my-4" />
                        ),
                        blockquote: ({ children }: any) => (
                          <blockquote className="border-l-2 border-theme-sidebar-border pl-3 text-sm text-theme-text-secondary italic">
                            {children}
                          </blockquote>
                        ),
                        pre: ({ children }: any) => (
                          <pre className="bg-theme-bg-container rounded-md p-3 text-xs font-mono text-theme-text-primary overflow-x-auto">
                            {children}
                          </pre>
                        ),
                        code: ({ className, children, ...props }: any) =>
                          className ? (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          ) : (
                            <code
                              className="px-1 py-0.5 rounded bg-theme-bg-container text-xs font-mono text-theme-text-primary"
                              {...props}
                            >
                              {children}
                            </code>
                          ),
                        table: ({ children }: any) => (
                          <div className="overflow-x-auto my-3">
                            <table className="text-sm w-full border-collapse">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children }: any) => (
                          <th className="text-left text-xs font-semibold text-theme-text-primary border border-theme-sidebar-border px-2 py-1">
                            {children}
                          </th>
                        ),
                        td: ({ children }: any) => (
                          <td className="text-xs text-theme-text-primary border border-theme-sidebar-border px-2 py-1">
                            {children}
                          </td>
                        ),
                      } as any
                    }
                  >
                    {result.report}
                  </ReactMarkdown>
                </Suspense>
              </>
            ) : (
              <p className="text-sm text-red-400">
                {result.error || t("pdfAnalysis.panel.noReport")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
