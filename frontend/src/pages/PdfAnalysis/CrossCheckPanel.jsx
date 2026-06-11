// SPDX-License-Identifier: MIT
import React, { useCallback, useEffect, useState } from "react";
import PdfAnalysis from "@/models/pdfAnalysis";

const SOURCE_TYPES = [
  { value: "url", label: "Webseite (URL)" },
  { value: "youtube", label: "YouTube-Video" },
  { value: "pdf", label: "PDF (Server-Pfad)" },
  { value: "text", label: "Roh-Text" },
];

const VERDICT_STYLES = {
  supports: "text-green-400 border-green-400/40",
  contradicts: "text-red-400 border-red-400/40",
  inconclusive: "text-yellow-400 border-yellow-400/40",
};

const VERDICT_LABELS = {
  supports: "Bestätigt",
  contradicts: "Widerspricht",
  inconclusive: "Unklar",
};

export default function CrossCheckPanel({ prefillFactIds = [] }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const refresh = useCallback(async () => {
    setJobs(await PdfAnalysis.listCrossChecks());
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
        aria-label="Kreuz-Verifikationen"
        className="flex flex-col gap-3"
      >
        <h2 className="text-sm font-semibold text-theme-text-primary uppercase tracking-wide">
          Laufende &amp; abgeschlossene Verifikationen
        </h2>
        {jobs.length === 0 && (
          <p className="text-sm text-theme-text-secondary">
            Noch keine Kreuz-Verifikation gestartet.
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

function CrossCheckForm({ prefillFactIds, onStarted }) {
  const [claimsText, setClaimsText] = useState("");
  const [factIdsText, setFactIdsText] = useState(prefillFactIds.join(", "));
  const [sources, setSources] = useState([]);
  const [deepWeb, setDeepWeb] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (prefillFactIds.length) setFactIdsText(prefillFactIds.join(", "));
  }, [prefillFactIds]);

  function addSource() {
    setSources((prev) => [...prev, { type: "url", value: "" }]);
  }

  function updateSource(index, patch) {
    setSources((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  function removeSource(index) {
    setSources((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
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
    const builtSources = sources
      .filter((s) => s.value.trim())
      .map((s) =>
        s.type === "pdf"
          ? { type: "pdf", path: s.value.trim() }
          : s.type === "text"
            ? { type: "text", text: s.value.trim() }
            : { type: s.type, url: s.value.trim() }
      );

    if (!claims.length && !factIds.length) {
      setError("Mindestens eine Behauptung oder Fakt-ID angeben.");
      return;
    }
    if (!builtSources.length && !deepWeb) {
      setError(
        "Mindestens eine Vergleichsquelle ODER Deep-Web-Recherche aktivieren."
      );
      return;
    }

    setBusy(true);
    try {
      const started = await PdfAnalysis.startCrossCheck({
        claims,
        factIds,
        sources: builtSources,
        deepWeb,
      });
      if (started.error) throw new Error(started.error);
      setClaimsText("");
      setFactIdsText("");
      setSources([]);
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
        Neue Kreuz-Verifikation
      </h2>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        Behauptungen (eine pro Zeile)
        <textarea
          value={claimsText}
          onChange={(e) => setClaimsText(e.target.value)}
          rows={3}
          placeholder={
            "z.B. Das Förderprogramm endet am 31.12.2026\nDie Zuständigkeit liegt beim Landesamt"
          }
          className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60 leading-relaxed"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-theme-text-secondary">
        Fakt-IDs aus dem Fakten-Speicher (kommasepariert, optional)
        <input
          value={factIdsText}
          onChange={(e) => setFactIdsText(e.target.value)}
          placeholder="z.B. a1b2c3d4e5f6a7b8, b2c3d4e5f6a7b8c9"
          className="rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-theme-text-secondary mb-1">
          Vergleichsquellen
        </legend>
        {sources.map((source, index) => (
          <div key={index} className="flex flex-col md:flex-row gap-2">
            <select
              value={source.type}
              onChange={(e) => updateSource(index, { type: e.target.value })}
              aria-label="Quelltyp"
              className="md:w-48 rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              value={source.value}
              onChange={(e) => updateSource(index, { value: e.target.value })}
              placeholder={
                source.type === "pdf"
                  ? "/pfad/zur/datei.pdf (freigegebenes Verzeichnis)"
                  : source.type === "text"
                    ? "Roh-Text einfügen…"
                    : "https://…"
              }
              aria-label="Quellwert"
              className="flex-1 rounded-md bg-theme-bg-container border border-theme-sidebar-border p-2 text-sm text-theme-text-primary placeholder:text-theme-text-secondary/60"
            />
            <button
              type="button"
              onClick={() => removeSource(index)}
              className="text-xs px-3 py-2 rounded-md text-red-400 border border-red-400/40 hover:opacity-80"
              aria-label="Quelle entfernen"
            >
              Entfernen
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addSource}
          className="self-start text-xs px-3 py-1.5 rounded-md bg-theme-bg-container text-theme-text-primary border border-theme-sidebar-border hover:opacity-80"
        >
          Quelle hinzufügen
        </button>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-theme-text-secondary">
        <input
          type="checkbox"
          checked={deepWeb}
          onChange={(e) => setDeepWeb(e.target.checked)}
          className="accent-current"
        />
        Deep-Web-Recherche: Agenten recherchieren zusätzlich autonom im Web
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
          {busy ? "Wird gestartet…" : "Verifikation starten"}
        </button>
      </div>
    </form>
  );
}

function CrossCheckRow({ job, onShowReport, onCancelled }) {
  const { progress = {}, status } = job;
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
            {job.claims?.length > 1 && ` (+${job.claims.length - 1} weitere)`}
          </p>
          <p className="text-xs text-theme-text-secondary">
            {job.sources} Vergleichsquellen
            {job.deepWeb && " · Deep-Web-Recherche aktiv"}
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
              : "Agenten recherchieren"}
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
            {progress.tasksDone}/{progress.tasksTotal} Aufgaben
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
            Bericht anzeigen
          </button>
        )}
        {isActive && (
          <button
            type="button"
            onClick={async () => {
              await PdfAnalysis.cancelCrossCheck(job.id);
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

function CrossCheckReportModal({ job, onClose }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    PdfAnalysis.crossCheckResult(job.id).then(setResult);
  }, [job.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Verifikationsbericht"
    >
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-lg bg-theme-bg-secondary border border-theme-sidebar-border">
        <div className="flex items-center justify-between p-4 border-b border-theme-sidebar-border">
          <h3 className="text-sm font-semibold text-theme-text-primary">
            Verifikationsbericht
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
              {/* Verifikationsmatrix (kompakt) */}
              {Array.isArray(result.perClaim) && (
                <ul
                  className="flex flex-col gap-2"
                  aria-label="Urteile je Behauptung"
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
                            className={`text-xs px-2 py-0.5 rounded-md border ${VERDICT_STYLES[sv.verdict]}`}
                            title={sv.reasoning}
                          >
                            {sv.source}: {VERDICT_LABELS[sv.verdict]}
                          </span>
                        ))}
                        {pc.webResearch && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md border ${VERDICT_STYLES[pc.webResearch.overall]}`}
                          >
                            Web ({pc.webResearch.sourcesChecked} Quellen):{" "}
                            {VERDICT_LABELS[pc.webResearch.overall]}
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
              {result.error || "Kein Bericht verfügbar."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
