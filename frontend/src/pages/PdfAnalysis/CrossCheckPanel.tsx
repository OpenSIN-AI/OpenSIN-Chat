// SPDX-License-Identifier: MIT
// Purpose: Cross-check panel: verify claims against web sources and other references.
// Docs: CrossCheckPanel.doc.md
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PdfAnalysis from "@/models/pdfAnalysis";

interface SourceInput {
  type: string;
  value: string;
}

interface BuiltSource {
  type: string;
  url?: string;
  path?: string;
  text?: string;
}

interface CrossCheckJob {
  id: string;
  claims?: string[];
  sources?: number;
  deepWeb?: boolean;
  status: "pending" | "running" | "completed" | "failed";
  progress?: {
    tasksTotal: number;
    tasksDone: number;
  };
  error?: string;
  [key: string]: any;
}

interface SourceVerdict {
  source: string;
  verdict: string;
  reasoning: string;
}

interface PerClaimResult {
  claim: string;
  sourceVerdicts: SourceVerdict[];
  webResearch?: {
    overall: string;
    sourcesChecked: number;
  };
}

interface CrossCheckReport {
  report?: string;
  perClaim?: PerClaimResult[];
  error?: string;
  [key: string]: any;
}

const SOURCE_TYPES: string[] = [
  "url",
  "youtube",
  "image",
  "video",
  "pdf",
  "text",
];

const VERDICT_STYLES: Record<string, string> = {
  supports: "text-green-400 border-green-400/40",
  contradicts: "text-red-400 border-red-400/40",
  inconclusive: "text-yellow-400 border-yellow-400/40",
};

interface CrossCheckPanelProps {
  prefillFactIds?: string[];
}

export default function CrossCheckPanel({
  prefillFactIds = [],
}: CrossCheckPanelProps) {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<CrossCheckJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<CrossCheckJob | null>(null);

  const refresh = useCallback(async () => {
    setJobs((await PdfAnalysis.listCrossChecks()) as CrossCheckJob[]);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <CrossCheckForm prefillFactIds={prefillFactIds} onStarted={refresh} />
      <section
        aria-label={t("pdfAnalysis.crossCheck.sectionLabel")}
        className="flex flex-col gap-3"
      >
        <h2 className="text-sm font-semibold text-theme-text-primary uppercase tracking-wide">
          {t("pdfAnalysis.crossCheck.sectionTitle")}
        </h2>
        {jobs.length === 0 && (
          <p className="text-sm text-theme-text-secondary">
            {t("pdfAnalysis.crossCheck.emptyText")}
          </p>
        )}
        {jobs.map((job) => (
          <CrossCheckRow
            key={job.id}
            job={job}
            onShowReport={() => setSelectedJob(job)}
            onCancelled={refresh}
          />
        ))}
      </section>
      {selectedJob && (
        <CrossCheckReportModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

interface CrossCheckFormProps {
  prefillFactIds: string[];
  onStarted: () => void;
}

function CrossCheckForm({ prefillFactIds, onStarted }: CrossCheckFormProps) {
  const { t } = useTranslation();
  const [claimsText, setClaimsText] = useState("");
  const [factIdsText, setFactIdsText] = useState(prefillFactIds.join(", "));
  const [sources, setSources] = useState<SourceInput[]>([]);
  const [deepWeb, setDeepWeb] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefillFactIds.length) setFactIdsText(prefillFactIds.join(", "));
  }, [prefillFactIds]);

  function addSource() {
    setSources((prev) => [...prev, { type: "url", value: "" }]);
  }

  function updateSource(index: number, patch: Partial<SourceInput>) {
    setSources((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function removeSource(index: number) {
    setSources((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const claims = claimsText
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
    const factIds = factIdsText
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const builtSources: BuiltSource[] = sources
      .filter((s) => s.value.trim())
      .map((s) =>
        s.type === "pdf"
          ? { type: "pdf", path: s.value.trim() }
          : s.type === "text"
            ? { type: "text", text: s.value.trim() }
            : { type: s.type, url: s.value.trim() },
      );

    if (!claims.length && !factIds.length) {
      setError(t("pdfAnalysis.crossCheck.submitError1"));
      return;
    }
    if (!builtSources.length && !deepWeb) {
      setError(t("pdfAnalysis.crossCheck.submitError2"));
      return;
    }

    setBusy(true);
    try {
      const started = await PdfAnalysis.startCrossCheck({
        claims,
        factIds,
        sources: builtSources as any,
        deepWeb,
      });
      if (started.error) throw new Error(started.error);
      setClaimsText("");
      setFactIdsText("");
      setSources([]);
      onStarted?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border"
    >
      <h2 className="text-sm font-semibold text-theme-text-primary uppercase tracking-wide">
        {t("pdfAnalysis.crossCheck.formTitle")}
      </h2>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        {t("pdfAnalysis.crossCheck.claimsLabel")}
        <textarea
          value={claimsText}
          onChange={(e) => setClaimsText(e.target.value)}
          rows={3}
          placeholder={t("pdfAnalysis.crossCheck.claimsPlaceholder")}
          className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60 leading-relaxed"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        {t("pdfAnalysis.crossCheck.factIdsLabel")}
        <input
          value={factIdsText}
          onChange={(e) => setFactIdsText(e.target.value)}
          placeholder={t("pdfAnalysis.crossCheck.factIdsPlaceholder")}
          className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-theme-text-secondary mb-1">
          {t("pdfAnalysis.crossCheck.sourcesLegend")}
        </legend>
        {sources.map((source, index) => (
          <div key={index} className="flex flex-col md:flex-row gap-2">
            <select
              value={source.type}
              onChange={(e) => updateSource(index, { type: e.target.value })}
              aria-label={t("pdfAnalysis.crossCheck.sourceTypeAriaLabel")}
              className="md:w-48 rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary"
            >
              {SOURCE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`pdfAnalysis.sourceTypes.${value}`)}
                </option>
              ))}
            </select>
            <input
              value={source.value}
              onChange={(e) => updateSource(index, { value: e.target.value })}
              placeholder={
                source.type === "pdf"
                  ? t("pdfAnalysis.crossCheck.sourceValuePdfPlaceholder")
                  : source.type === "text"
                    ? t("pdfAnalysis.crossCheck.sourceValueTextPlaceholder")
                    : t("pdfAnalysis.crossCheck.sourceValueUrlPlaceholder")
              }
              aria-label={t("pdfAnalysis.crossCheck.sourceValueAriaLabel")}
              className="flex-1 rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
            />
            <button
              type="button"
              onClick={() => removeSource(index)}
              className="text-xs px-3 py-2 rounded-md text-red-400 border border-red-400/40 hover:opacity-80"
              aria-label={t("pdfAnalysis.crossCheck.removeSourceAriaLabel")}
            >
              {t("pdfAnalysis.crossCheck.removeSource")}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addSource}
          className="self-start text-xs px-3 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
        >
          {t("pdfAnalysis.crossCheck.addSource")}
        </button>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-theme-text-secondary">
        <input
          type="checkbox"
          checked={deepWeb}
          onChange={(e) => setDeepWeb(e.target.checked)}
          className="accent-current"
        />
        {t("pdfAnalysis.crossCheck.deepWebLabel")}
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-md text-sm font-medium bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80 disabled:opacity-50"
        >
          {busy
            ? t("pdfAnalysis.crossCheck.submitBusy")
            : t("pdfAnalysis.crossCheck.submitIdle")}
        </button>
      </div>
    </form>
  );
}

interface CrossCheckRowProps {
  job: CrossCheckJob;
  onShowReport: () => void;
  onCancelled: () => void;
}

function CrossCheckRow({ job, onShowReport, onCancelled }: CrossCheckRowProps) {
  const { t } = useTranslation();
  const { progress = { tasksTotal: 0, tasksDone: 0 }, status } = job;
  const pct =
    progress.tasksTotal > 0
      ? Math.round((progress.tasksDone / progress.tasksTotal) * 100)
      : 0;
  const isActive = status === "running" || status === "pending";

  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-theme-text-primary truncate">
            {job.claims?.[0]}
            {job.claims?.length > 1 &&
              t("pdfAnalysis.crossCheck.moreClaims", {
                count: job.claims.length - 1,
              })}
          </p>
          <p className="text-xs text-theme-text-secondary">
            {t("pdfAnalysis.crossCheck.sourcesCount", { count: job.sources })}
            {job.deepWeb && t("pdfAnalysis.crossCheck.deepWebActive")}
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
            ? t("pdfAnalysis.crossCheck.statusCompleted")
            : status === "failed"
              ? t("pdfAnalysis.crossCheck.statusFailed")
              : t("pdfAnalysis.crossCheck.statusResearching")}
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
            {t("pdfAnalysis.crossCheck.progressLabel", {
              done: progress.tasksDone,
              total: progress.tasksTotal,
            })}
          </span>
        </div>
      )}

      {job.error && <p className="text-xs text-red-400">{job.error}</p>}

      <div className="flex gap-2">
        {status === "completed" && (
          <button
            type="button"
            onClick={onShowReport}
            className="text-xs px-3 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
          >
            {t("pdfAnalysis.crossCheck.showReport")}
          </button>
        )}
        {isActive && (
          <button
            type="button"
            onClick={async () => {
              try {
                await PdfAnalysis.cancelCrossCheck(job.id);
                onCancelled?.();
              } catch (e) {
                console.error(e);
              }
            }}
            className="text-xs px-3 py-1.5 rounded-md text-red-400 border border-red-400/40 hover:opacity-80"
          >
            {t("pdfAnalysis.crossCheck.cancel")}
          </button>
        )}
      </div>
    </div>
  );
}

interface CrossCheckReportModalProps {
  job: CrossCheckJob;
  onClose: () => void;
}

function CrossCheckReportModal({ job, onClose }: CrossCheckReportModalProps) {
  const { t } = useTranslation();
  const [result, setResult] = useState<CrossCheckReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    PdfAnalysis.crossCheckResult(job.id)
      .then((res) => {
        if (!cancelled) setResult(res as CrossCheckReport);
      })
      .catch((e) => {
        if (!cancelled) console.error(e);
      });
    return () => {
      cancelled = true;
    };
  }, [job.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("pdfAnalysis.crossCheck.modalAriaLabel")}
    >
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border">
        <div className="flex items-center justify-between p-4 border-b border-theme-sidebar-border gap-3">
          <h3 className="text-sm font-semibold text-theme-text-primary flex-1">
            {t("pdfAnalysis.crossCheck.modalTitle")}
          </h3>
          <a
            href={`/pdf-analysis/crosscheck/${job.id}/report/download`}
            download
            className="text-xs px-3 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80 whitespace-nowrap"
          >
            {t("pdfAnalysis.crossCheck.downloadReport")}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-theme-text-secondary hover:text-theme-text-primary"
            aria-label={t("pdfAnalysis.crossCheck.closeAriaLabel")}
          >
            {t("pdfAnalysis.crossCheck.close")}
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex flex-col gap-4">
          {!result ? (
            <p className="text-sm text-theme-text-secondary">
              {t("pdfAnalysis.crossCheck.loading")}
            </p>
          ) : result.report ? (
            <>
              {/* Verifikationsmatrix (kompakt) */}
              {Array.isArray(result.perClaim) && (
                <ul
                  className="flex flex-col gap-2"
                  aria-label={t("pdfAnalysis.crossCheck.perClaimAriaLabel")}
                >
                  {result.perClaim.map((pc, i) => (
                    <li
                      key={i}
                      className="flex flex-col gap-1 p-3 rounded-md bg-theme-bg-container border border-theme-sidebar-border"
                    >
                      <p className="text-sm text-theme-text-primary leading-relaxed">
                        {pc.claim}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {pc.sourceVerdicts.map((sv, j) => (
                          <span
                            key={j}
                            className={`text-xs px-2 py-0.5 rounded-md border ${VERDICT_STYLES[sv.verdict] ?? VERDICT_STYLES.inconclusive}`}
                            title={sv.reasoning}
                          >
                            {sv.source}:{" "}
                            {t(`pdfAnalysis.verdicts.${sv.verdict}`)}
                          </span>
                        ))}
                        {pc.webResearch && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md border ${VERDICT_STYLES[pc.webResearch.overall] ?? VERDICT_STYLES.inconclusive}`}
                          >
                            {t("pdfAnalysis.crossCheck.webResearch", {
                              count: pc.webResearch.sourcesChecked,
                            })}{" "}
                            {t(
                              `pdfAnalysis.verdicts.${pc.webResearch.overall}`,
                            )}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <pre className="whitespace-pre-wrap text-sm text-theme-text-primary leading-relaxed font-sans">
                {result.report}
              </pre>
            </>
          ) : (
            <p className="text-sm text-red-400">
              {result.error || t("pdfAnalysis.crossCheck.noReport")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
