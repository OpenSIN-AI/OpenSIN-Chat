// SPDX-License-Identifier: MIT
/**
 * Synthesizer — hierarchisches Map-Reduce über alle Chunk-Ergebnisse.
 *
 * Stufe 1..n: Gruppen von Chunk-Zusammenfassungen werden zu Zwischen-
 *             zusammenfassungen verdichtet (rekursiv, bis eine übrig ist).
 * Finale Stufe: State-of-the-Art Best-Practices-Report (Markdown) mit
 *               Executive Summary, Kernerkenntnissen, Empfehlungen und
 *               durchgängigen Seitenverweisen.
 */
const { chat } = require("./llm");
const { REDUCE_GROUP_SIZE } = require("./config");

const REDUCE_SYSTEM = `Du verdichtest Teilanalysen eines sehr großen Dokuments.
Erhalte ALLE Seitenverweise (S. N) exakt. Erfinde nichts. Antworte als kompakter Fließtext mit Zwischenüberschriften.`;

const REPORT_SYSTEM = `Du bist ein Senior-Analyst und erstellst einen umfassenden, professionellen Best-Practices-Bericht
auf Basis vollständiger Dokumentanalysen. Anforderungen:
- Struktur: # Titel, ## Executive Summary, ## Methodik, ## Kernerkenntnisse, ## Best-Practices & Empfehlungen, ## Risiken & offene Punkte, ## Quellenverweise
- JEDE wesentliche Aussage mit Seitenverweis (S. N) belegen.
- Präzise, faktentreu, ohne Spekulation. Sprache: Deutsch. Format: Markdown.`;

async function reduceGroup(summaries, task) {
  const body = summaries
    .map((s, i) => `### Teilanalyse ${i + 1} (Seiten ${s.range})\n${s.text}`)
    .join("\n\n");
  const text = await chat(
    REDUCE_SYSTEM,
    `Analyse-Auftrag: ${task}\n\nVerdichte die folgenden Teilanalysen verlustarm:\n\n${body}`,
  );
  return text;
}

async function synthesize(chunkResults, { task, reportType, documentName }) {
  let level = chunkResults
    .filter((r) => r && r.summary)
    .map((r) => ({ range: `${r.pageStart}-${r.pageEnd}`, text: r.summary }));

  // Hierarchisches Reduce bis eine Zusammenfassung übrig ist
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += REDUCE_GROUP_SIZE) {
      const group = level.slice(i, i + REDUCE_GROUP_SIZE);
      if (group.length === 1) {
        next.push(group[0]);
        continue;
      }
      const text = await reduceGroup(group, task);
      next.push({
        range: `${group[0].range.split("-")[0]}-${group[group.length - 1].range.split("-")[1]}`,
        text,
      });
    }
    level = next;
  }

  const masterSummary = level.length ? level[0].text : "(kein Inhalt)";

  // Top-Findings für den Report sammeln
  const findings = [];
  for (const r of chunkResults) {
    for (const f of r.findings || [])
      findings.push(`- ${f.statement} (S. ${(f.pages || []).join(", ")})`);
  }
  const findingsBlock = findings.slice(0, 200).join("\n");

  const report = await chat(
    REPORT_SYSTEM,
    [
      `Dokument: ${documentName}`,
      `Analyse-Auftrag: ${task}`,
      `Gewünschter Berichtstyp: ${reportType || "umfassender Best-Practices-Bericht"}`,
      ``,
      `=== GESAMT-SYNTHESE DES DOKUMENTS ===`,
      masterSummary,
      ``,
      `=== EINZELERKENNTNISSE MIT SEITENVERWEISEN ===`,
      findingsBlock,
    ].join("\n"),
  );

  // "Citations or die": Absätze ohne Seitenverweis deterministisch erkennen
  const PAGE_REF = /\(S\.\s*\d+/;
  const paragraphs = report
    .split(/\n{2,}/)
    .filter((p) => p.trim().length > 120 && !p.trim().startsWith("#"));
  const uncited = paragraphs.filter((p) => !PAGE_REF.test(p));
  const groundingRatio =
    paragraphs.length === 0
      ? 1
      : (paragraphs.length - uncited.length) / paragraphs.length;

  let finalReport = report;
  if (uncited.length > 0) {
    finalReport +=
      `\n\n---\n\n> **Grounding-Hinweis:** ${uncited.length} von ${paragraphs.length} ` +
      `inhaltlichen Absätzen enthalten keinen Seitenverweis (Deckungsgrad ` +
      `${Math.round(groundingRatio * 100)} %). Aussagen ohne (S. N)-Verweis ` +
      `sollten vor Weiterverwendung gegen das Quelldokument geprüft werden — ` +
      `z.B. per Kreuz-Verifikation.`;
  }

  return { report: finalReport, masterSummary, groundingRatio };
}

module.exports = { synthesize };
