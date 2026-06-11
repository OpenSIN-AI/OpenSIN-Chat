// SPDX-License-Identifier: MIT
import React, { useEffect, useRef, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import PdfAnalysis from "@/models/pdfAnalysis";
import CrossCheckPanel from "./CrossCheckPanel";

const PHASE_LABELS = {
  init: "Initialisierung",
  reading: "Dokument wird gelesen",
  analyzing: "Parallele Agenten-Analyse",
  synthesizing: "Report-Synthese",
  "verifying-facts": "Fakten werden gegen Quelltext verifiziert",
  "storing-facts": "Fakten werden gespeichert",
  done: "Abgeschlossen",
};

function formatEta(seconds) {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h} h ${m} min`;
}

export default function PdfAnalysisPage() {
  const [tab, setTab] = useState("jobs"); // "jobs" | "facts" | "crosscheck"
  const [crossCheckFactIds, setCrossCheckFactIds] = useState([]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <header className="flex flex-col gap-2 mb-6">
          <h1 className="text-xl font-semibold text-theme-text-primary text-balance">
            PDF-Analyse (Multi-Agenten)
          </h1>
          <p className="text-sm text-theme-text-secondary leading-relaxed">
            Großes PDF hochladen, Auftrag beschreiben — die Agenten analysieren
            autonom, erstellen einen Best-Practices-Report und speichern
            ausgewählte Fakten mit Quellenbezug.
          </p>
          <nav className="flex gap-2 mt-2" aria-label="Bereiche">
            <TabButton active={tab === "jobs"} onClick={() => setTab("jobs")}>
              Analysen
            </TabButton>
            <TabButton active={tab === "facts"} onClick={() => setTab("facts")}>
              Fakten-Speicher
            </TabButton>
            <TabButton
              active={tab === "crosscheck"}
              onClick={() => setTab("crosscheck")}
            >
              Kreuz-Verifikation
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
        ) : (
          <CrossCheckPanel prefillFactIds={crossCheckFactIds} />
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
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const refresh = useCallback(async () => {
    setJobs(await PdfAnalysis.list());
  }, []);

  // Polling, solange Jobs aktiv sind
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <StartForm onStarted={refresh} />
      <section aria-label="Analyse-Jobs" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-theme-text-primary uppercase tracking-wide">
          Laufende &amp; abgeschlossene Analysen
        </h2>
        {jobs.length === 0 && (
          <p className="text-sm text-theme-text-secondary">
            Noch keine Analysen gestartet.
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
      setError("PDF-Datei und Analyse-Auftrag sind erforderlich.");
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
        Neue Analyse starten
      </h2>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        PDF-Datei
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="text-sm text-theme-text-primary file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-theme-bg-container file:text-theme-text-primary file:cursor-pointer"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        Analyse-Auftrag (erforderlich)
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={2}
          placeholder="z.B. Vollständige Analyse aller Förderprogramme inkl. Bedingungen"
          className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60 leading-relaxed"
        />
      </label>

      <div className="flex flex-col md:flex-row gap-3">
        <label className="flex-1 flex flex-col gap-1 text-sm text-theme-text-secondary">
          Berichtstyp (optional)
          <input
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            placeholder="z.B. Management-Summary, technischer Tiefenbericht"
            className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
          />
        </label>
        <label className="flex-1 flex flex-col gap-1 text-sm text-theme-text-secondary">
          Fakten-Kriterien (optional)
          <input
            value={factCriteria}
            onChange={(e) => setFactCriteria(e.target.value)}
            placeholder="z.B. Beträge, Fristen, Zuständigkeiten"
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
        Deep Scan: jede Seite visuell lesen (lokales Vision-Modell — präziser bei
        Tabellen, Scans &amp; komplexen Layouts, aber langsamer)
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
          {busy ? "Wird hochgeladen & gestartet…" : "Analyse starten"}
        </button>
      </div>
    </form>
  );
}

function JobRow({ job, onShowReport, onCancelled }) {
  const { progress = {}, status } = job;
  const pct =
    progress.chunksTotal > 0
      ? Math.round((progress.chunksDone / progress.chunksTotal) * 100)
      : 0;
  const isActive = status === "pending" || status === "running";

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
            ? "Abgeschlossen"
            : status === "failed"
              ? "Fehlgeschlagen"
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
              className="h-full bg-theme-text-secondary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-theme-text-secondary w-24 text-right">
            {progress.chunksDone}/{progress.chunksTotal} Chunks
          </span>
          {progress.concurrency != null && (
            <span
              className="text-xs text-theme-text-secondary whitespace-nowrap"
              title="Aktuelle parallele Agenten (AIMD-reguliert)"
            >
              · {progress.concurrency} Agenten
            </span>
          )}
        </div>
      )}

      {isActive && (progress.etaSeconds != null || progress.pagesPerMinute != null) && (
        <p className="text-xs text-theme-text-secondary">
          {progress.concurrency != null &&
            `${progress.concurrency} Agenten aktiv`}
          {progress.pagesPerMinute != null &&
            ` · ${progress.pagesPerMinute} Seiten/min`}
          {progress.etaSeconds != null &&
            ` · ETA ${formatEta(progress.etaSeconds)}`}
          )}
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
            Report anzeigen
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
            Abbrechen
          </button>
        )}
      </div>
    </div>
  );
}

function ReportModal({ job, onClose }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    PdfAnalysis.result(job.id).then(setResult);
  }, [job.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Report für ${job.documentName}`}
    >
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border">
        <div className="flex items-center justify-between p-4 border-b border-theme-sidebar-border">
          <h3 className="text-sm font-semibold text-theme-text-primary truncate">
            Report: {job.documentName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-theme-text-secondary hover:text-theme-text-primary"
            aria-label="Schließen"
          >
            Schließen
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {!result ? (
            <p className="text-sm text-theme-text-secondary">Wird geladen…</p>
          ) : result.report ? (
            <>
              <p className="text-xs text-theme-text-secondary mb-3">
                {result.totalPages} Seiten · {result.chunks} Chunks ·{" "}
                {result.factsStored} Fakten gespeichert
                {result.chunkErrors > 0 &&
                  ` · ${result.chunkErrors} Chunk-Fehler`}
              </p>
              <pre className="whitespace-pre-wrap text-sm text-theme-text-primary leading-relaxed font-sans">
                {result.report}
              </pre>
            </>
          ) : (
            <p className="text-sm text-red-400">
              {result.error || "Kein Report verfügbar."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Fakten-Speicher: Suche mit Quellenbezug ---------------- */

function FactsPanel({ onCrossCheck }) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          placeholder="Freitext-Suche (z.B. Frist, Betrag, Name)…"
          aria-label="Freitext-Suche"
          className="flex-1 rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
        />
        <input
          value={documentFilter}
          onChange={(e) => setDocumentFilter(e.target.value)}
          placeholder="Dokumentname filtern…"
          aria-label="Dokumentname filtern"
          className="md:w-64 rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md text-sm font-medium bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
        >
          Suchen
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-theme-text-secondary">Wird gesucht…</p>
      ) : facts.length === 0 ? (
        <p className="text-sm text-theme-text-secondary">
          Keine gespeicherten Fakten gefunden.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Gefundene Fakten">
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
                  Quelle: {fact.source.documentName}, S. {fact.source.page}
                  {fact.source.pageCorrected && (
                    <span
                      className="ml-1 text-blue-400"
                      title="Seitenangabe automatisch korrigiert (Zitat lag auf einer Nachbarseite)"
                    >
                      · S. korrigiert
                    </span>
                  )}
                  {fact.verified === true && (
                    <span className="ml-1 text-green-400">
                      · Zitat verifiziert
                    </span>
                  )}
                  {fact.verified === false && (
                    <span className="ml-1 text-yellow-400">
                      · nicht verifiziert
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
                    title={`Geprüft am ${new Date(fact.crossCheck.checkedAt).toLocaleString("de-DE")}`}
                  >
                    Kreuz-geprüft:{" "}
                    {fact.crossCheck.webOverall === "supports"
                      ? "extern bestätigt"
                      : fact.crossCheck.webOverall === "contradicts"
                        ? "Widerspruch gefunden"
                        : "unklar"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onCrossCheck?.(fact.id)}
                  className="ml-auto text-xs px-2 py-0.5 rounded-md text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
                  aria-label={`Gegen Quellen prüfen: ${fact.detail.slice(0, 40)}`}
                >
                  Gegen Quellen prüfen
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await PdfAnalysis.deleteFact(fact.id);
                    search();
                  }}
                  className="text-xs text-red-400 hover:opacity-80"
                  aria-label={`Fakt löschen: ${fact.detail.slice(0, 40)}`}
                >
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
