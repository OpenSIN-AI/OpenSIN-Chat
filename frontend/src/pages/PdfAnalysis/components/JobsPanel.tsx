// SPDX-License-Identifier: MIT
// Jobs panel: start form, job list, and individual job rows
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { UploadSimple } from "@phosphor-icons/react/dist/csr/UploadSimple";
import PdfAnalysis from "@/models/pdfAnalysis";
import { safeErrorMessage } from "@/utils/request";
import logger from "@/utils/logger";
import { formatEta } from "../utils";
import { PdfFileInput } from "./PdfFileInput";
import { ReportModal } from "./ReportModal";

export interface PdfJob {
  id: string;
  documentName: string;
  task: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: {
    chunksTotal: number;
    chunksDone: number;
    phase?: string;
    concurrency?: number;
    etaSeconds?: number;
    pagesPerMinute?: number;
  };
  error?: string;
  [key: string]: any;
}

export function JobsPanel({ isSidebar = false }: { isSidebar?: boolean }) {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<PdfJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<PdfJob | null>(null);

  const refresh = useCallback(async () => {
    try {
      setJobs((await PdfAnalysis.list()) as PdfJob[]);
    } catch (e) {
      logger.error("Failed to fetch PDF jobs:", e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <StartForm onStarted={refresh} isSidebar={isSidebar} />
      <section
        aria-label={t("pdfAnalysis.panel.jobsSection")}
        className="flex flex-col gap-3"
      >
        <h2 className="text-sm font-semibold text-theme-text-primary uppercase tracking-wide">
          {t("pdfAnalysis.panel.jobsSection")}
        </h2>
        {jobs.length === 0 && (
          <p className="text-sm text-theme-text-secondary">
            {t("pdfAnalysis.panel.noJobs")}
          </p>
        )}
        {jobs.map((job) => (
          <JobRow
            key={job.id}
            job={job}
            onShowReport={() => setSelectedJob(job)}
            onCancelled={refresh}
          />
        ))}
      </section>
      {selectedJob && (
        <ReportModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}

interface StartFormProps {
  onStarted: () => void;
  isSidebar?: boolean;
}

function StartForm({ onStarted, isSidebar = false }: StartFormProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [task, setTask] = useState("");
  const [reportType, setReportType] = useState("");
  const [factCriteria, setFactCriteria] = useState("");
  const [deepScan, setDeepScan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file || !task.trim()) {
      setError(t("pdfAnalysis.panel.fileRequired"));
      return;
    }
    setBusy(true);
    setUploadProgress(0);
    try {
      const uploaded = await PdfAnalysis.upload(file, setUploadProgress);
      setUploadProgress(null);
      if (uploaded.error) throw new Error(uploaded.error);
      const started = await PdfAnalysis.start({
        pdfPath: uploaded.pdfPath as string,
        task: task.trim(),
        reportType: reportType.trim() || undefined,
        factCriteria: factCriteria.trim() || undefined,
        deepScan,
      });
      if (started.error) throw new Error(started.error);
      setTask("");
      setReportType("");
      setFactCriteria("");
      if (fileRef.current) {
        fileRef.current.value = "";
        fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
      onStarted?.();
    } catch (err: any) {
      setError(safeErrorMessage(err));
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border"
    >
      <h2 className="text-sm font-semibold text-theme-text-primary uppercase tracking-wide">
        {t("pdfAnalysis.panel.newAnalysis")}
      </h2>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        {t("pdfAnalysis.panel.pdfFile")}
        <PdfFileInput
          inputRef={fileRef}
          label={t("pdfAnalysis.panel.chooseFile")}
          placeholder={t("pdfAnalysis.panel.noFileChosen")}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        {t("pdfAnalysis.panel.taskRequired")}
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={2}
          placeholder={t("pdfAnalysis.panel.taskPlaceholder")}
          className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary focus:outline-none focus:border-theme-text-primary"
        />
      </label>

      <div className={`flex flex-col gap-3 ${isSidebar ? "" : "md:flex-row"}`}>
        <label className="flex-1 flex flex-col gap-1 text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.reportType")}
          <input
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            placeholder={t("pdfAnalysis.panel.reportTypePlaceholder")}
            className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary focus:outline-none focus:border-theme-text-primary"
          />
        </label>
        <label className="flex-1 flex flex-col gap-1 text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.factCriteria")}
          <input
            value={factCriteria}
            onChange={(e) => setFactCriteria(e.target.value)}
            placeholder={t("pdfAnalysis.panel.factCriteriaPlaceholder")}
            className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary focus:outline-none focus:border-theme-text-primary"
          />
        </label>
      </div>

      <label
        className={`flex gap-2 text-sm text-theme-text-secondary ${isSidebar ? "items-start" : "items-center"}`}
      >
        <input
          type="checkbox"
          checked={deepScan}
          onChange={(e) => setDeepScan(e.target.checked)}
          className={`accent-current ${isSidebar ? "mt-0.5" : ""}`}
        />
        <span className={isSidebar ? "leading-snug" : ""}>
          {t("pdfAnalysis.panel.deepScan")}
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      {uploadProgress !== null && (
        <div className="flex flex-col gap-1">
          <div
            role="progressbar"
            aria-valuenow={uploadProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("pdfAnalysis.panel.uploading")}
            className="h-1.5 w-full rounded-full bg-theme-bg-container overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-theme-text-primary transition-[width] duration-200 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-theme-text-secondary">
            {t("pdfAnalysis.panel.uploadingPercent", { percent: uploadProgress })}
          </p>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-md text-sm font-medium bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:bg-theme-bg-secondary transition-colors disabled:opacity-50"
        >
          {busy ? t("pdfAnalysis.panel.submitBusy") : t("pdfAnalysis.panel.submitIdle")}
        </button>
      </div>
    </form>
  );
}

interface JobRowProps {
  job: PdfJob;
  onShowReport: () => void;
  onCancelled: () => void;
}

function JobRow({ job, onShowReport, onCancelled }: JobRowProps) {
  const { t } = useTranslation();
  const { progress = { chunksTotal: 0, chunksDone: 0 }, status } = job;
  const pct =
    progress.chunksTotal > 0
      ? Math.round((progress.chunksDone / progress.chunksTotal) * 100)
      : 0;
  const isActive = status === "pending" || status === "running";

  const PHASE_LABELS: Record<string, string> = {
    init: t("pdfAnalysis.panel.phaseInit"),
    reading: t("pdfAnalysis.panel.phaseReading"),
    analyzing: t("pdfAnalysis.panel.phaseAnalyzing"),
    synthesizing: t("pdfAnalysis.panel.phaseSynthesizing"),
    "verifying-facts": t("pdfAnalysis.panel.phaseVerifying"),
    "storing-facts": t("pdfAnalysis.panel.phaseStoring"),
    done: t("pdfAnalysis.panel.phaseDone"),
  };

  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-theme-text-primary truncate">
            {job.documentName}
          </p>
          <p className="text-xs text-theme-text-secondary truncate">
            {job.task}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs px-2 py-1 rounded-md border ${
            status === "completed"
              ? "text-green-400 border-green-400/40"
              : status === "failed"
                ? "text-red-400 border-red-400/40"
                : "text-theme-text-secondary border-theme-sidebar-border"
          }`}
        >
          {status === "completed"
            ? t("pdfAnalysis.panel.statusCompleted")
            : status === "failed"
              ? t("pdfAnalysis.panel.statusFailed")
              : PHASE_LABELS[progress.phase] || status}
        </span>
      </div>

      {isActive && (
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-2 rounded-full bg-theme-bg-container overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="w-[var(--progress-pct)] h-full bg-theme-text-secondary transition-all"
              style={{ "--progress-pct": `${pct}%` } as React.CSSProperties}
            />
          </div>
          <span className="text-xs text-theme-text-secondary w-24 text-right">
            {t("pdfAnalysis.panel.chunksCount", {
              done: progress.chunksDone,
              total: progress.chunksTotal,
            })}
          </span>
          {progress.concurrency != null && (
            <span
              className="text-xs text-theme-text-secondary whitespace-nowrap"
              title={t("pdfAnalysis.panel.agentTitle")}
            >
              · {progress.concurrency}{" "}
              {t("pdfAnalysis.panel.agentsActive", { count: progress.concurrency })}
            </span>
          )}
        </div>
      )}

      {isActive &&
        (progress.etaSeconds != null || progress.pagesPerMinute != null) && (
          <p className="text-xs text-theme-text-secondary">
            {progress.concurrency != null &&
              t("pdfAnalysis.panel.agentsActive", { count: progress.concurrency })}
            {progress.pagesPerMinute != null &&
              ` · ${t("pdfAnalysis.panel.pagesPerMin", { count: progress.pagesPerMinute })}`}
            {progress.etaSeconds != null &&
              ` · ${t("pdfAnalysis.panel.eta", { time: formatEta(progress.etaSeconds) })}`}
          </p>
        )}

      {job.error && <p className="text-xs text-red-400">{job.error}</p>}

      <div className="flex gap-2">
        {status === "completed" && (
          <button
            type="button"
            onClick={onShowReport}
            className="text-xs px-3 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:bg-theme-bg-secondary transition-colors"
          >
            {t("pdfAnalysis.panel.showReport")}
          </button>
        )}
        {isActive && (
          <button
            type="button"
            onClick={async () => {
              try {
                await PdfAnalysis.cancel(job.id);
                onCancelled?.();
              } catch (e) {
                logger.error(e);
              }
            }}
            className="text-xs px-3 py-1.5 rounded-md text-red-400 border border-red-400/40 hover:opacity-80"
          >
            {t("pdfAnalysis.panel.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}
