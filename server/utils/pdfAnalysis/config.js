// SPDX-License-Identifier: MIT
/**
 * Zentrale Konfiguration für das PDF-Analyse-Modul.
 * Alle Werte sind per ENV übersteuerbar.
 */
const path = require("path");

const STORAGE_ROOT =
  process.env.STORAGE_DIR || path.resolve(__dirname, "../../storage");

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
