// SPDX-License-Identifier: MIT
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
 */
const { chat, parseJson } = require("../llm");

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

const MAX_FINDINGS_PER_DOC = Number(
  process.env.PDF_ANALYSIS_CORPUS_FINDINGS_PER_DOC || 60
);

/**
 * @param {Array} docResults [{ documentName, masterSummary, findings: [{statement, pages}] }]
 * @param {string} task Analyse-Auftrag des Nutzers
 */
async function compareCorpus(docResults, task) {
  const findingsBlock = docResults
    .map((d) => {
      const top = (d.findings || [])
        .slice(0, MAX_FINDINGS_PER_DOC)
        .map((f) => `- ${f.statement} (S. ${(f.pages || []).join(", ")})`)
        .join("\n");
      return `=== DOKUMENT: ${d.documentName} ===\n${top}`;
    })
    .join("\n\n");

  let comparison = { agreements: [], conflicts: [], unique: [] };
  try {
    const raw = await chat(
      CONFLICT_SYSTEM,
      `Analyse-Auftrag: ${task}\n\n${findingsBlock}`
    );
    const parsed = parseJson(raw);
    comparison = {
      agreements: Array.isArray(parsed.agreements) ? parsed.agreements : [],
      conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
      unique: Array.isArray(parsed.unique) ? parsed.unique : [],
    };
  } catch {
    /* Vergleich fehlgeschlagen — Report entsteht trotzdem aus den Summaries */
  }

  const summariesBlock = docResults
    .map((d) => `=== ${d.documentName} ===\n${d.masterSummary}`)
    .join("\n\n");

  const report = await chat(
    CORPUS_REPORT_SYSTEM,
    [
      `Analyse-Auftrag: ${task}`,
      `Anzahl Dokumente: ${docResults.length}`,
      ``,
      `=== EINZELDOKUMENT-SYNTHESEN ===`,
      summariesBlock,
      ``,
      `=== STRUKTURIERTER VERGLEICH (JSON) ===`,
      JSON.stringify(comparison, null, 2),
    ].join("\n")
  );

  return { report, comparison };
}

module.exports = { compareCorpus };
