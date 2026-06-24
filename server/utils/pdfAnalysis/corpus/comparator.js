// SPDX-License-Identifier: MIT
const consoleLogger = require("../../logger/console.js");

/**
 * CorpusComparator — vergleicht die Analyse-Ergebnisse mehrerer Dokumente.
 *
 * Eingabe: pro Dokument die Master-Synthese + Top-Findings (jeweils mit
 * Seitenverweisen) aus der Einzel-Pipeline.
 *
 * Zwei Stufen:
 *  1. Paarweise/gruppenweise Konfliktanalyse (deterministisch vorbereitet,
 *     LLM-bewertet): Welche Aussagen stützen sich, welche widersprechen
 *     sich zwischen den Dokumenten?
 *  2. Konsolidierter Korpus-Report: Executive Summary über den gesamten
 *     Bestand, Gemeinsamkeiten, Widersprüche (mit "Dokument A S. 12 vs.
 *     Dokument B S. 340"-Belegen), dokumentspezifische Besonderheiten.
 *
 * Concurrency-Modell:
 *   * Die zwei LLM-Calls (Konfliktanalyse + Report) laufen SEQUENZIELL.
 *     Sie laufen NICHT durch agentPool, profitieren also NICHT von AIMD —
 *     jeder Aufruf geht direkt durch llm.js. Wir halten das sequential, damit
 *     kein Korpus-Job zwei schwere Prompts gleichzeitig abschickt.
 *   * Bei sehr großen Korpora (>COMPARE_BATCH_SIZE Dokumente) wird die
 *     Konfliktanalyse in Batches aufgeteilt und mit asyncPool(COMPARE_BATCH_CONCURRENCY, ...)
 *     parallelisiert — das hält pro Batch den LLM-Prompt klein und die Anzahl
 *     gleichzeitiger Requests begrenzt.
 *   * Grobe Schutzzäune (MAX_FINDINGS_PER_DOC, MAX_PROMPT_CHARS) verhindern,
 *     dass ein einzelner Prompt das Context-Window des LLM sprengt.
 */
const { chat, parseJson } = require("../llm");
const { asyncPool } = require("./asyncPool");

const CONFLICT_SYSTEM = `Du bist ein forensischer Dokument-Vergleichsanalyst.
Du erhältst Kernbefunde aus MEHREREN Dokumenten (jeweils mit Dokumentname und Seitenverweisen).
Identifiziere:
1. ÜBEREINSTIMMUNGEN: Aussagen, die sich über Dokumente hinweg stützen.
2. WIDERSPRÜCHE: Aussagen, die sich zwischen Dokumenten widersprechen.
3. ALLEINSTELLUNGEN: wichtige Aussagen, die nur in EINEM Dokument vorkommen.
Beziehe dich ausschließlich auf die gegebenen Befunde. Erfinde nichts.
Jede Aussage MUSS mit Dokumentname und Seite belegt sein.
Antworte ausschließlich mit validem JSON:
{
  "agreements": [{ "statement": "...", "evidence": [{ "document": "...", "pages": [N] }] }],
  "conflicts": [{ "topic": "...", "positions": [{ "document": "...", "claim": "...", "pages": [N] }] }],
  "unique": [{ "document": "...", "statement": "...", "pages": [N] }]
}`;

const CORPUS_REPORT_SYSTEM = `Du bist ein Senior-Analyst und erstellst einen konsolidierten Korpus-Bericht über MEHRERE Dokumente.
Struktur: # Titel, ## Executive Summary (gesamter Bestand), ## Dokumentübersicht (je Dokument 2-3 Sätze),
## Übereinstimmungen zwischen den Dokumenten, ## Widersprüche (Position je Dokument mit Beleg),
## Dokumentspezifische Befunde, ## Best-Practices & Empfehlungen, ## Quellenverweise.
JEDE wesentliche Aussage mit (Dokumentname, S. N) belegen. Präzise, faktentreu, ohne Spekulation.
Sprache: Deutsch. Format: Markdown.`;

// ── Concurrency & Größenlimits ──────────────────────────────────────
// Per-Dokument-Limit für Findings, die in den Konflikt-Prompt einfließen.
// Schützt vor extremen Korpus-Größen.
const MAX_FINDINGS_PER_DOC = Number(
  process.env.PDF_ANALYSIS_CORPUS_FINDINGS_PER_DOC || 60,
);

// Maximaler Prompt-Umfang (Zeichen) für den Konflikt-LLM-Call.
// Hard-Cap, damit auch bei n>20 Dokumenten / riesigen Findings das
// Context-Window nicht gesprengt wird. 200k Zeichen ≈ 50k Tokens.
const MAX_CONFLICT_PROMPT_CHARS = Number(
  process.env.PDF_ANALYSIS_CORPUS_MAX_CONFLICT_CHARS || 200000,
);

// Bei mehr als COMPARE_BATCH_SIZE Dokumenten teilen wir die Dokumente in
// Batches; jeder Batch erzeugt einen eigenen Konflikt-Call, am Ende mergen
// wir die Ergebnisse. Default 10 — hält den Prompt meist unter dem Char-Cap.
const COMPARE_BATCH_SIZE = Number(
  process.env.PDF_ANALYSIS_CORPUS_BATCH_SIZE || 10,
);

// Concurrency für die Batch-Konflikt-Calls. Sequential (1) ist sicher und
// einfach; wer einen kräftigen LLM-Endpoint hat, kann auf 2-3 hochgehen.
const COMPARE_BATCH_CONCURRENCY = Number(
  process.env.PDF_ANALYSIS_CORPUS_BATCH_CONCURRENCY || 1,
);

/**
 * Reduziert die Findings pro Dokument auf MAX_FINDINGS_PER_DOC.
 * @param {Array} docResults
 */
function trimFindings(docResults) {
  return docResults.map((d) => ({
    ...d,
    findings: (d.findings || []).slice(0, MAX_FINDINGS_PER_DOC),
  }));
}

/**
 * Baut den Konflikt-Prompt für eine Teilmenge von Dokumenten.
 * Bricht AB (gibt null zurück), wenn der Prompt zu lang wäre — der Aufrufer
 * behandelt das als leeren Vergleichsbeitrag.
 *
 * @param {Array} docsSubset
 * @param {string} task
 * @returns {string|null}
 */
function buildConflictPrompt(docsSubset, task) {
  const findingsBlock = docsSubset
    .map((d) => {
      const top = (d.findings || [])
        .map((f) => `- ${f.statement} (S. ${(f.pages || []).join(", ")})`)
        .join("\n");
      return `=== DOKUMENT: ${d.documentName} ===\n${top}`;
    })
    .join("\n\n");

  const prompt = `Analyse-Auftrag: ${task}\n\n${findingsBlock}`;
  if (prompt.length > MAX_CONFLICT_PROMPT_CHARS) {
    consoleLogger.warn(
      `[corpus/comparator] Konflikt-Prompt zu lang (${prompt.length} > ${MAX_CONFLICT_PROMPT_CHARS}) — Batch wird übersprungen.`,
    );
    return null;
  }
  return prompt;
}

/**
 * Führt einen einzelnen Konflikt-LLM-Call für eine Dokument-Teilmenge aus.
 * Wirft NICHT — Fehler werden zu leerem Vergleichsbeitrag, damit ein
 * fehlgeschlagener Batch nicht den ganzen Korpus-Report kippt.
 *
 * @param {Array} docsSubset
 * @param {string} task
 * @returns {Promise<{agreements:Array, conflicts:Array, unique:Array}>}
 */
async function runConflictBatch(docsSubset, task) {
  const prompt = buildConflictPrompt(docsSubset, task);
  if (!prompt) {
    return { agreements: [], conflicts: [], unique: [] };
  }
  try {
    const raw = await chat(CONFLICT_SYSTEM, prompt);
    const parsed = parseJson(raw);
    return {
      agreements: Array.isArray(parsed.agreements) ? parsed.agreements : [],
      conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
      unique: Array.isArray(parsed.unique) ? parsed.unique : [],
    };
  } catch (e) {
    consoleLogger.warn(
      `[corpus/comparator] Konflikt-Batch fehlgeschlagen (${docsSubset.length} Dokumente): ${e.message}`,
    );
    return { agreements: [], conflicts: [], unique: [] };
  }
}

/**
 * Zerlegt docResults in Batches fester Größe.
 * @param {Array} docResults
 */
function chunkDocs(docResults) {
  const out = [];
  for (let i = 0; i < docResults.length; i += COMPARE_BATCH_SIZE) {
    out.push(docResults.slice(i, i + COMPARE_BATCH_SIZE));
  }
  return out;
}

/**
 * Merged mehrere Konflikt-Ergebnisse (aus verschiedenen Batches) in eines.
 * @param {Array<{agreements:Array, conflicts:Array, unique:Array}>} parts
 */
function mergeComparison(parts) {
  const merged = { agreements: [], conflicts: [], unique: [] };
  for (const p of parts) {
    if (p?.agreements) merged.agreements.push(...p.agreements);
    if (p?.conflicts) merged.conflicts.push(...p.conflicts);
    if (p?.unique) merged.unique.push(...p.unique);
  }
  return merged;
}

/**
 * @param {Array} docResults [{ documentName, masterSummary, findings: [{statement, pages}] }]
 * @param {string} task Analyse-Auftrag des Nutzers
 */
async function compareCorpus(docResults, task) {
  const trimmed = trimFindings(docResults);
  const batches = chunkDocs(trimmed);

  // Phase 1: Konfliktanalyse — ggf. in Batches, mit begrenzter Parallelität.
  // Bei einem Batch (kleiner Korpus) läuft einfach ein einzelner Call.
  // Bei vielen Batches: asyncPool sorgt dafür, dass nie mehr als
  // COMPARE_BATCH_CONCURRENCY LLM-Calls gleichzeitig offen sind.
  const batchResults = await asyncPool(
    COMPARE_BATCH_CONCURRENCY,
    batches,
    (batch) => runConflictBatch(batch, task),
  );
  const comparison = mergeComparison(batchResults);

  // Phase 2: Konsolidierter Report — sequenziell, da dieser Prompt ALLE
  // Dokumente + das gesamte Vergleichs-JSON enthält (typischerweise der
  // größte Call im Korpus). Erst NACH der Konfliktanalyse starten, damit
  // wir im Report auf die strukturierten Agreements/Conflicts verweisen
  // können.
  const summariesBlock = trimmed
    .map((d) => `=== ${d.documentName} ===\n${d.masterSummary}`)
    .join("\n\n");

  const report = await chat(
    CORPUS_REPORT_SYSTEM,
    [
      `Analyse-Auftrag: ${task}`,
      `Anzahl Dokumente: ${trimmed.length}`,
      ``,
      `=== EINZELDOKUMENT-SYNTHESEN ===`,
      summariesBlock,
      ``,
      `=== STRUKTURIERTER VERGLEICH (JSON) ===`,
      JSON.stringify(comparison, null, 2),
    ].join("\n"),
  );

  return { report, comparison };
}

module.exports = { compareCorpus };
