// SPDX-License-Identifier: MIT
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/Sidebar";
import PdfAnalysis from "@/models/pdfAnalysis";
import CrossCheckPanel from "./CrossCheckPanel";
import CorpusPanel from "./CorpusPanel";
import { API_BASE } from "@/utils/constants";

function formatEta(seconds) {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h} h ${m} min`;
}

export default function PdfAnalysisPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("jobs");
  const [crossCheckFactIds, setCrossCheckFactIds] = useState([]);

  const PHASE_LABELS = {
    init: t("pdfAnalysis.panel.phaseInit"),
    reading: t("pdfAnalysis.panel.phaseReading"),
    analyzing: t("pdfAnalysis.panel.phaseAnalyzing"),
    synthesizing: t("pdfAnalysis.panel.phaseSynthesizing"),
    "verifying-facts": t("pdfAnalysis.panel.phaseVerifying"),
    "storing-facts": t("pdfAnalysis.panel.phaseStoring"),
    done: t("pdfAnalysis.panel.phaseDone"),
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <header className="flex flex-col gap-2 mb-6">
          <h1 className="text-xl font-semibold text-theme-text-primary text-balance">
            {t("pdfAnalysis.panel.title")}
          </h1>
          <p className="text-sm text-theme-text-secondary leading-relaxed">
            {t("pdfAnalysis.panel.description")}
          </p>
          <nav
            className="flex gap-2 mt-2"
            aria-label={t("pdfAnalysis.panel.tabJobs")}
          >
            <TabButton active={tab === "jobs"} onClick={() => setTab("jobs")}>
              {t("pdfAnalysis.panel.tabJobs")}
            </TabButton>
            <TabButton active={tab === "facts"} onClick={() => setTab("facts")}>
              {t("pdfAnalysis.panel.tabFacts")}
            </TabButton>
            <TabButton
              active={tab === "crosscheck"}
              onClick={() => setTab("crosscheck")}
            >
              {t("pdfAnalysis.panel.tabCrossCheck")}
            </TabButton>
            <TabButton
              active={tab === "corpus"}
              onClick={() => setTab("corpus")}
            >
              {t("pdfAnalysis.panel.tabCorpus")}
            </TabButton>
          </nav>
        </header>
        {tab === "jobs" ? (
          <JobsPanel />
        ) : tab === "facts" ? (
          <FactsPanel
            onCrossCheck={(factId) => {
              setCrossCheckFactIds([factId]);
              setTab("crosscheck");
            }}
          />
        ) : tab === "crosscheck" ? (
          <CrossCheckPanel prefillFactIds={crossCheckFactIds} />
        ) : (
          <CorpusPanel />
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm border ${
        active
          ? "bg-theme-bg-secondary text-theme-text-primary border-theme-sidebar-border"
          : "bg-transparent text-theme-text-secondary border-transparent hover:text-theme-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- Analysen: Start-Formular + Job-Liste ---------------- */

function JobsPanel() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const refresh = useCallback(async () => {
    setJobs(await PdfAnalysis.list());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <StartForm onStarted={refresh} />
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

function StartForm({ onStarted }) {
  const { t } = useTranslation();
  const fileRef = useRef(null);
  const [task, setTask] = useState("");
  const [reportType, setReportType] = useState("");
  const [factCriteria, setFactCriteria] = useState("");
  const [deepScan, setDeepScan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file || !task.trim()) {
      setError(t("pdfAnalysis.panel.fileRequired"));
      return;
    }
    setBusy(true);
    try {
      const uploaded = await PdfAnalysis.upload(file);
      if (uploaded.error) throw new Error(uploaded.error);
      const started = await PdfAnalysis.start({
        pdfPath: uploaded.pdfPath,
        task: task.trim(),
        reportType: reportType.trim() || undefined,
        factCriteria: factCriteria.trim() || undefined,
        deepScan,
      });
      if (started.error) throw new Error(started.error);
      setTask("");
      setReportType("");
      setFactCriteria("");
      if (fileRef.current) fileRef.current.value = "";
      onStarted?.();
    } catch (err) {
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
        {t("pdfAnalysis.panel.newAnalysis")}
      </h2>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        {t("pdfAnalysis.panel.pdfFile")}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="text-sm text-theme-text-primary file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-theme-bg-container file:text-theme-text-primary file:cursor-pointer"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        {t("pdfAnalysis.panel.taskRequired")}
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={2}
          placeholder={t("pdfAnalysis.panel.taskPlaceholder")}
          className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60 leading-relaxed"
        />
      </label>

      <div className="flex flex-col md:flex-row gap-3">
        <label className="flex-1 flex flex-col gap-1 text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.reportType")}
          <input
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            placeholder={t("pdfAnalysis.panel.reportTypePlaceholder")}
            className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
          />
        </label>
        <label className="flex-1 flex flex-col gap-1 text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.factCriteria")}
          <input
            value={factCriteria}
            onChange={(e) => setFactCriteria(e.target.value)}
            placeholder={t("pdfAnalysis.panel.factCriteriaPlaceholder")}
            className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-theme-text-secondary">
        <input
          type="checkbox"
          checked={deepScan}
          onChange={(e) => setDeepScan(e.target.checked)}
          className="accent-current"
        />
        {t("pdfAnalysis.panel.deepScan")}
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
            ? t("pdfAnalysis.panel.submitBusy")
            : t("pdfAnalysis.panel.submitIdle")}
        </button>
      </div>
    </form>
  );
}

function JobRow({ job, onShowReport, onCancelled }) {
  const { t } = useTranslation();
  const { progress = {}, status } = job;
  const pct =
    progress.chunksTotal > 0
      ? Math.round((progress.chunksDone / progress.chunksTotal) * 100)
      : 0;
  const isActive = status === "pending" || status === "running";

  const PHASE_LABELS = {
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
              style={{ "--progress-pct": `${pct}%` }}
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
              {t("pdfAnalysis.panel.agentsActive", {
                count: progress.concurrency,
              })}
            </span>
          )}
        </div>
      )}

      {isActive &&
        (progress.etaSeconds != null || progress.pagesPerMinute != null) && (
          <p className="text-xs text-theme-text-secondary">
            {progress.concurrency != null &&
              t("pdfAnalysis.panel.agentsActive", {
                count: progress.concurrency,
              })}
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
            className="text-xs px-3 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
          >
            {t("pdfAnalysis.panel.showReport")}
          </button>
        )}
        {isActive && (
          <button
            type="button"
            onClick={async () => {
              await PdfAnalysis.cancel(job.id);
              onCancelled?.();
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

function ReportModal({ job, onClose }) {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);

  useEffect(() => {
    PdfAnalysis.result(job.id).then(setResult);
  }, [job.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("pdfAnalysis.panel.reportFor", { name: job.documentName })}
    >
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border">
        <div className="flex items-center justify-between p-4 border-b border-theme-sidebar-border gap-3">
          <h3 className="text-sm font-semibold text-theme-text-primary truncate flex-1">
            {t("pdfAnalysis.panel.reportFor", { name: job.documentName })}
          </h3>
          <a
            href={`${API_BASE}/pdf-analysis/${job.id}/report/download`}
            download
            className="text-xs px-3 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80 whitespace-nowrap"
          >
            {t("pdfAnalysis.panel.downloadReport")}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-theme-text-secondary hover:text-theme-text-primary"
            aria-label={t("pdfAnalysis.panel.close")}
          >
            {t("pdfAnalysis.panel.close")}
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {!result ? (
            <p className="text-sm text-theme-text-secondary">
              {t("pdfAnalysis.panel.loading")}
            </p>
          ) : result.report ? (
            <>
              <p className="text-xs text-theme-text-secondary mb-3">
                {t("pdfAnalysis.panel.summary", {
                  totalPages: result.totalPages,
                  chunks: result.chunks,
                  factsStored: result.factsStored,
                })}
                {result.chunkErrors > 0 &&
                  t("pdfAnalysis.panel.chunkErrors", {
                    count: result.chunkErrors,
                  })}
              </p>
              <pre className="whitespace-pre-wrap text-sm text-theme-text-primary leading-relaxed font-sans">
                {result.report}
              </pre>
            </>
          ) : (
            <p className="text-sm text-red-400">
              {result.error || t("pdfAnalysis.panel.noReport")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Fakten-Speicher: Suche mit Quellenbezug ---------------- */

function FactsPanel({ onCrossCheck }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [documentFilter, setDocumentFilter] = useState("");
  const [facts, setFacts] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    setFacts(await PdfAnalysis.searchFacts({ q, document: documentFilter }));
    setLoading(false);
  }, [q, documentFilter]);

  useEffect(() => {
    search();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="flex flex-col md:flex-row gap-3 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("pdfAnalysis.panel.searchPlaceholder")}
          aria-label={t("pdfAnalysis.panel.searchAria")}
          className="flex-1 rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
        />
        <input
          value={documentFilter}
          onChange={(e) => setDocumentFilter(e.target.value)}
          placeholder={t("pdfAnalysis.panel.documentFilterPlaceholder")}
          aria-label={t("pdfAnalysis.panel.documentFilterAria")}
          className="md:w-64 rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md text-sm font-medium bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
        >
          {t("pdfAnalysis.panel.search")}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.searching")}
        </p>
      ) : facts.length === 0 ? (
        <p className="text-sm text-theme-text-secondary">
          {t("pdfAnalysis.panel.noFacts")}
        </p>
      ) : (
        <ul
          className="flex flex-col gap-3"
          aria-label={t("pdfAnalysis.panel.foundFactsAria")}
        >
          {facts.map((fact) => (
            <li
              key={fact.id}
              className="flex flex-col gap-1 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border"
            >
              <p className="text-sm text-theme-text-primary leading-relaxed">
                {fact.detail}
              </p>
              {fact.quote && (
                <blockquote className="text-xs text-theme-text-secondary italic border-l-2 border-theme-sidebar-border pl-2">
                  {`"${fact.quote}"`}
                </blockquote>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-theme-text-secondary">
                  {t("pdfAnalysis.panel.sourceLabel", {
                    docName: fact.source.documentName,
                    page: fact.source.page,
                  })}
                  {fact.source.pageCorrected && (
                    <span
                      className="ml-1 text-blue-400"
                      title={t("pdfAnalysis.panel.pageCorrectedAria")}
                    >
                      {t("pdfAnalysis.panel.pageCorrected")}
                    </span>
                  )}
                  {fact.verified === true && (
                    <span className="ml-1 text-green-400">
                      {t("pdfAnalysis.panel.verified")}
                    </span>
                  )}
                  {fact.verified === false && (
                    <span className="ml-1 text-yellow-400">
                      {t("pdfAnalysis.panel.notVerified")}
                    </span>
                  )}
                </span>
                {fact.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-md bg-theme-bg-container text-theme-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
                {fact.crossCheck && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md border ${
                      fact.crossCheck.webOverall === "supports"
                        ? "text-green-400 border-green-400/40"
                        : fact.crossCheck.webOverall === "contradicts"
                          ? "text-red-400 border-red-400/40"
                          : "text-yellow-400 border-yellow-400/40"
                    }`}
                    title={t("pdfAnalysis.panel.checkedAt", {
                      date: new Date(fact.crossCheck.checkedAt).toLocaleString(
                        "de-DE",
                      ),
                    })}
                  >
                    {t("pdfAnalysis.panel.crossChecked")}{" "}
                    {fact.crossCheck.webOverall === "supports"
                      ? t("pdfAnalysis.panel.crossCheckSupports")
                      : fact.crossCheck.webOverall === "contradicts"
                        ? t("pdfAnalysis.panel.crossCheckContradicts")
                        : t("pdfAnalysis.panel.crossCheckInconclusive")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onCrossCheck?.(fact.id)}
                  className="ml-auto text-xs px-2 py-0.5 rounded-md text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
                  aria-label={t("pdfAnalysis.panel.checkSourcesAria", {
                    text: fact.detail.slice(0, 40),
                  })}
                >
                  {t("pdfAnalysis.panel.checkSources")}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await PdfAnalysis.deleteFact(fact.id);
                    search();
                  }}
                  className="text-xs text-red-400 hover:opacity-80"
                  aria-label={t("pdfAnalysis.panel.deleteFactAria", {
                    text: fact.detail.slice(0, 40),
                  })}
                >
                  {t("pdfAnalysis.panel.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
