// SPDX-License-Identifier: MIT
/**
 * AnalysisAgent — analysiert genau einen Seiten-Chunk.
 *
 * Liefert pro Chunk:
 *  - summary: dichte Zusammenfassung mit Seitenangaben
 *  - findings: zentrale Erkenntnisse (jeweils mit Seitenbezug)
 *  - facts: Kandidaten für den Fakten-Speicher (Zitat + Seite + Confidence)
 */
const { chat, parseJson } = require("./llm");
const { MAX_CHARS_PER_CHUNK } = require("./config");

const SYSTEM_PROMPT = `Du bist ein präziser Dokument-Analyse-Agent in einem parallelen Multi-Agenten-System.
Du erhältst einen Seitenausschnitt eines (potenziell sehr großen) PDF-Dokuments.
Jede Seite ist mit "--- [Seite N] ---" markiert. Beziehe dich AUSSCHLIESSLICH auf den gegebenen Text.
Erfinde nichts. Gib jede Aussage IMMER mit exakter Seitenangabe an.
Antworte ausschließlich mit validem JSON, ohne Markdown, in exakt diesem Schema:
{
  "summary": "dichte Zusammenfassung dieses Abschnitts mit (S. N)-Verweisen",
  "findings": [{ "statement": "...", "pages": [N, ...] }],
  "facts": [{ "detail": "präzise Einzelinformation", "quote": "wörtliches Kurz-Zitat aus dem Text", "page": N, "tags": ["..."], "confidence": 0.0 }]
}`;

async function analyzeChunk({ chunk, text, task, factCriteria, documentName }) {
  const truncated =
    text.length > MAX_CHARS_PER_CHUNK
      ? text.slice(0, MAX_CHARS_PER_CHUNK) + "\n[...gekürzt...]"
      : text;

  const userPrompt = [
    `Dokument: ${documentName}`,
    `Seitenbereich dieses Chunks: ${chunk.pageStart}-${chunk.pageEnd}`,
    `Analyse-Auftrag des Nutzers: ${task}`,
    factCriteria
      ? `In "facts" NUR Informationen aufnehmen, die diesen Kriterien entsprechen: ${factCriteria}`
      : `In "facts" nur besonders relevante, verlässlich belegbare Einzelinformationen aufnehmen.`,
    ``,
    `=== DOKUMENT-AUSSCHNITT ===`,
    truncated,
  ].join("\n");

  const raw = await chat(SYSTEM_PROMPT, userPrompt);
  let parsed;
  try {
    parsed = parseJson(raw);
  } catch {
    // Fallback: Antwort als reine Zusammenfassung behandeln, Job nicht abbrechen
    parsed = { summary: raw.slice(0, 4000), findings: [], facts: [] };
  }

  return {
    chunkIndex: chunk.index,
    pageStart: chunk.pageStart,
    pageEnd: chunk.pageEnd,
    summary: String(parsed.summary || ""),
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    facts: (Array.isArray(parsed.facts) ? parsed.facts : []).map((f) => ({
      detail: String(f.detail || ""),
      quote: String(f.quote || ""),
      page: Number(f.page) || chunk.pageStart,
      tags: Array.isArray(f.tags) ? f.tags.map(String) : [],
      confidence: Number(f.confidence) || 0,
    })),
  };
}

module.exports = { analyzeChunk };
