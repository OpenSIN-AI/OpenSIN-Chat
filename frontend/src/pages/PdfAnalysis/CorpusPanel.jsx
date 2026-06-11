// SPDX-License-Identifier: MIT
import React, { useCallback, useEffect, useRef, useState } from "react";
import PdfAnalysis from "@/models/pdfAnalysis";

const CORPUS_PHASE_LABELS = {
  "analyzing-documents": "Dokumente werden analysiert",
  comparing: "Dokumentübergreifender Vergleich",
  done: "Abgeschlossen",
};

export default function CorpusPanel() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const refresh = useCallback(async () => {
    setJobs(await PdfAnalysis.listCorpus());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <CorpusForm onStarted={refresh} />
      <section aria-label="Korpus-Analysen" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-theme-text-primary uppercase tracking-wide">
          Laufende &amp; abgeschlossene Korpus-Analysen
        </h2>
        {jobs.length === 0 && (
          <p className="text-sm text-theme-text-secondary">
            Noch keine Korpus-Analyse gestartet.
          </p>
        )}
        {jobs.map((job) => (
          <CorpusRow
            key={job.id}
            job={job}
            onShowReport={() => setSelectedJob(job)}
            onCancelled={refresh}
          />
        ))}
      </section>
      {selectedJob && (
        <CorpusReportModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

function CorpusForm({ onStarted }) {
  const fileRef = useRef(null);
  const [task, setTask] = useState("");
  const [factCriteria, setFactCriteria] = useState("");
  const [deepScan, setDeepScan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const files = Array.from(fileRef.current?.files || []);
    if (files.length < 2 || !task.trim()) {
      setError(
        "Mindestens 2 PDF-Dateien und ein Vergleichsauftrag sind erforderlich.",
      );
      return;
    }
    setBusy(true);
    try {
      // Dateien sequenziell hochladen (Riesen-Dateien: kein Parallel-Upload)
      const pdfPaths = [];
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Upload ${i + 1}/${files.length}: ${files[i].name}`);
        const uploaded = await PdfAnalysis.upload(files[i]);
        if (uploaded.error)
          throw new Error(`${files[i].name}: ${uploaded.error}`);
        pdfPaths.push(uploaded.pdfPath);
      }
      setUploadProgress(null);

      const started = await PdfAnalysis.startCorpus({
        pdfPaths,
        task: task.trim(),
        factCriteria: factCriteria.trim() || undefined,
        deepScan,
      });
      if (started.error) throw new Error(started.error);
      setTask("");
      setFactCriteria("");
      if (fileRef.current) fileRef.current.value = "";
      onStarted?.();
    } catch (err) {
      setError(err.message);
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
        Neue Korpus-Analyse (mehrere PDFs vergleichen)
      </h2>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        PDF-Dateien (mindestens 2)
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          className="text-sm text-theme-text-primary file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-theme-bg-container file:text-theme-text-primary file:cursor-pointer"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        Vergleichsauftrag (erforderlich)
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={2}
          placeholder="z.B. Vergleiche die Förderbedingungen, Fristen und Zuständigkeiten in allen Dokumenten"
          className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60 leading-relaxed"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        Fakten-Kriterien (optional)
        <input
          value={factCriteria}
          onChange={(e) => setFactCriteria(e.target.value)}
          placeholder="z.B. Beträge, Fristen, Zuständigkeiten"
          className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-theme-text-secondary">
        <input
          type="checkbox"
          checked={deepScan}
          onChange={(e) => setDeepScan(e.target.checked)}
          className="accent-current"
        />
        Deep Scan: jede Seite aller Dokumente visuell lesen (langsamer)
      </label>

      {uploadProgress && (
        <p className="text-sm text-theme-text-secondary" aria-live="polite">
          {uploadProgress}
        </p>
      )}
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
          {busy ? "Wird hochgeladen & gestartet…" : "Korpus-Analyse starten"}
        </button>
      </div>
    </form>
  );
}

function CorpusRow({ job, onShowReport, onCancelled }) {
  const { progress = {}, status } = job;
  const pct =
    progress.docsTotal > 0
      ? Math.round((progress.docsDone / progress.docsTotal) * 100)
      : 0;
  const isActive = status === "running" || status === "pending";

  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-theme-text-primary truncate">
            {job.documents?.join(" · ")}
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
              : CORPUS_PHASE_LABELS[progress.phase] || status}
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
          <span className="text-xs text-theme-text-secondary w-28 text-right">
            {progress.docsDone}/{progress.docsTotal} Dokumente
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
            Vergleichs-Report anzeigen
          </button>
        )}
        {isActive && (
          <button
            type="button"
            onClick={async () => {
              await PdfAnalysis.cancelCorpus(job.id);
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

function CorpusReportModal({ job, onClose }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    PdfAnalysis.corpusResult(job.id).then(setResult);
  }, [job.id]);

  const conflicts = result?.comparison?.conflicts || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Korpus-Vergleichs-Report"
    >
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border">
        <div className="flex items-center justify-between p-4 border-b border-theme-sidebar-border">
          <h3 className="text-sm font-semibold text-theme-text-primary">
            Korpus-Report ({job.documents?.length} Dokumente)
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
        <div className="overflow-y-auto p-4 flex flex-col gap-4">
          {!result ? (
            <p className="text-sm text-theme-text-secondary">Wird geladen…</p>
          ) : result.report ? (
            <>
              {conflicts.length > 0 && (
                <div className="flex flex-col gap-2 p-3 rounded-md bg-theme-bg-container border border-red-400/40">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                    {conflicts.length} Widersprüche zwischen Dokumenten
                  </p>
                  <ul className="flex flex-col gap-2">
                    {conflicts.map((c, i) => (
                      <li
                        key={i}
                        className="text-xs text-theme-text-primary leading-relaxed"
                      >
                        <span className="font-medium">{c.topic}:</span>{" "}
                        {(c.positions || [])
                          .map(
                            (p) =>
                              `${p.document} (S. ${(p.pages || []).join(
                                ", ",
                              )}): ${p.claim}`,
                          )
                          .join(" — vs. — ")}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-theme-text-secondary">
                {result.documentsAnalyzed} Dokumente analysiert
                {result.documentsFailed > 0 &&
                  ` · ${result.documentsFailed} fehlgeschlagen`}
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
