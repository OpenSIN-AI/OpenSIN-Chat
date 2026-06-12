// SPDX-License-Identifier: MIT
/**
 * Zentrale Konfiguration für das PDF-Analyse-Modul.
 * Alle Werte sind per ENV übersteuerbar.
 */
const path = require("path");
const { getStoragePath } = require("../paths");

const STORAGE_ROOT = getStoragePath("pdf-analysis");

// Roh-ENV-Werte parsen, mit defensiver Fallback- und Range-Validierung.
// Number(undefined) -> NaN; Number("") -> 0. Beides wollen wir abfangen.
function intEnv(name, fallback, { min = 1, max = 1024 } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    console.warn(
      `[pdfAnalysis/config] Ungültiger ENV-Wert ${name}=${JSON.stringify(raw)} — Fallback ${fallback} wird verwendet (erlaubt: ${min}..${max}).`
    );
    return fallback;
  }
  return Math.trunc(n);
}

module.exports = {
  // Verzeichnisse
  STORAGE_DIR: path.join(STORAGE_ROOT, "pdf-analysis"),
  CHECKPOINT_DIR: path.join(STORAGE_ROOT, "pdf-analysis", "checkpoints"),
  REPORT_DIR: path.join(STORAGE_ROOT, "pdf-analysis", "reports"),
  FACTS_FILE: path.join(STORAGE_ROOT, "pdf-analysis", "facts.json"),

  // Parallelisierung
  AGENT_CONCURRENCY: Number(process.env.PDF_ANALYSIS_CONCURRENCY || 6),
  PAGES_PER_CHUNK: Number(process.env.PDF_ANALYSIS_PAGES_PER_CHUNK || 8),
  CHUNK_OVERLAP_PAGES: Number(process.env.PDF_ANALYSIS_OVERLAP_PAGES || 1),

  // Job-Limits
  MAX_ACTIVE_JOBS: Number(process.env.PDF_ANALYSIS_MAX_ACTIVE_JOBS || 2),
  MAX_PAGES: Number(process.env.PDF_ANALYSIS_MAX_PAGES || 0), // 0 = unbegrenzt

  // Korpus-Pipeline ───────────────────────────────────────
  // Maximal gleichzeitig laufende EINZEL-Analysen innerhalb eines Korpus-Jobs.
  //
  // Hintergrund: Jede Einzel-Analyse öffnet intern AGENT_CONCURRENCY (default 6)
  // LLM-Worker. Ohne diese Bremse würden N PDFs gleichzeitig starten und damit
  // bis zu N*AGENT_CONCURRENCY parallele LLM-Calls erzeugen — der LLM-Endpoint
  // antwortet dann schnell mit 429, AIMD drosselt aggressiv, und alle Jobs
  // werden langsamer statt schneller.
  //
  // Korpus-Vergleichs-Prompts (comparator.js) sind obendrein sehr groß (Top-
  // Findings aus allen Dokumenten); dort helfen dieselben AIMD-Mechanismen
  // nicht, weil sie nicht in agentPool laufen. Wir begrenzen die Korpus-
  // Parallelität deshalb hart, damit auch der Vergleich-Endpoint atmen kann.
  //
  // Default 3 — entspricht "max 3 PDFs * 6 Agents = 18 gleichzeitige LLM-Calls
  // aus EINEM Korpus-Job" zusätzlich zu den 2 MAX_ACTIVE_JOBS * 6 = 12 Calls
  // aus regulären Jobs. Wer einen großzügigen LLM-Provider hat, kann via
  // PDF_ANALYSIS_CORPUS_CONCURRENCY auf 4-5 hochdrehen; 1 bleibt der sichere
  // Fallback für kleine Instanzen.
  CORPUS_CONCURRENCY: intEnv("PDF_ANALYSIS_CORPUS_CONCURRENCY", 3, {
    min: 1,
    max: 16,
  }),

  // Synthese (hierarchisches Reduce)
  REDUCE_GROUP_SIZE: Number(process.env.PDF_ANALYSIS_REDUCE_GROUP_SIZE || 20),

  // LLM
  LLM_TEMPERATURE: Number(process.env.PDF_ANALYSIS_TEMPERATURE || 0),
  MAX_CHARS_PER_CHUNK: Number(
    process.env.PDF_ANALYSIS_MAX_CHARS_PER_CHUNK || 24000
  ),

  // Fakten
  FACT_MIN_CONFIDENCE: Number(process.env.PDF_ANALYSIS_FACT_MIN_CONF || 0.7),
};
