// SPDX-License-Identifier: MIT
/**
 * CriticAgent — zweite, unabhängige Prüfinstanz (Multi-Agent-Reflexion).
 *
 * Forschungsbefund: Selbstkritik desselben Agenten leidet unter Confirmation
 * Bias. Daher prüft hier ein SEPARATER Critic mit eigener Persona die
 * Chunk-Ergebnisse — deterministisch vorgefiltert (billig), LLM-Kritik nur
 * für verdächtige Chunks (teuer, aber selten):
 *
 *  Stufe 1 (deterministisch, kostenlos):
 *   - leere Summary trotz nicht-leerem Seitentext
 *   - Findings ohne Seitenangaben
 *   - auffällig kurze Summary bei langem Input
 *  Stufe 2 (LLM-Critic, nur für Verdachtsfälle):
 *   - Qualitätsurteil; bei "insufficient" => genau EIN Repair-Versuch
 *     durch erneute Analyse des Chunks mit Critic-Feedback im Prompt.
 */
const { chat, parseJson } = require("./llm");
const { analyzeChunk } = require("./analysisAgent");

const CRITIC_ENABLED = !/^false$/i.test(
  process.env.PDF_ANALYSIS_CRITIC || "true"
);
const MIN_SUMMARY_RATIO = 0.004; // Summary-Zeichen pro Input-Zeichen

const CRITIC_SYSTEM = `Du bist ein strenger, unabhängiger Qualitätsprüfer für Dokumentanalysen.
Du hast die Analyse NICHT selbst erstellt. Prüfe: Deckt die Zusammenfassung den Quelltext ab?
Sind alle Findings mit Seitenangaben belegt und im Text nachvollziehbar? Fehlen offensichtliche Kernaussagen?
Antworte ausschließlich mit validem JSON:
{ "quality": "sufficient" | "insufficient", "issues": ["konkretes Problem 1", "..."] }`;

function deterministicFlags(result, sourceText) {
  const issues = [];
  const sourceLen = (sourceText || "").replace(/\s/g, "").length;
  if (sourceLen > 200 && !result.summary)
    issues.push("Leere Zusammenfassung trotz vorhandenem Seitentext.");
  if (
    sourceLen > 200 &&
    result.summary &&
    result.summary.length < sourceLen * MIN_SUMMARY_RATIO
  )
    issues.push("Zusammenfassung auffällig kurz im Verhältnis zum Quelltext.");
  for (const f of result.findings || []) {
    if (!Array.isArray(f.pages) || f.pages.length === 0) {
      issues.push("Mindestens ein Finding ohne Seitenangabe.");
      break;
    }
  }
  return issues;
}

/**
 * Prüft ein Chunk-Ergebnis und repariert es bei Bedarf (max. 1 Versuch).
 * @returns {Promise<Object>} ggf. verbessertes Chunk-Ergebnis,
 *          angereichert um { critic: { flagged, repaired, issues } }
 */
async function reviewAndRepair(
  result,
  { chunk, text, task, factCriteria, documentName }
) {
  if (!CRITIC_ENABLED || result.error)
    return { ...result, critic: { flagged: false, repaired: false, issues: [] } };

  const flags = deterministicFlags(result, text);
  if (flags.length === 0)
    return { ...result, critic: { flagged: false, repaired: false, issues: [] } };

  // Stufe 2: LLM-Critic nur für Verdachtsfälle
  let verdict = { quality: "insufficient", issues: flags };
  try {
    const raw = await chat(
      CRITIC_SYSTEM,
      [
        `Analyse-Auftrag: ${task}`,
        `Vorab erkannte Probleme: ${flags.join(" | ")}`,
        ``,
        `=== QUELLTEXT (Seiten ${chunk.pageStart}-${chunk.pageEnd}) ===`,
        text.slice(0, 16000),
        ``,
        `=== ZU PRÜFENDE ANALYSE (JSON) ===`,
        JSON.stringify(
          { summary: result.summary, findings: result.findings },
          null,
          2
        ),
      ].join("\n")
    );
    verdict = parseJson(raw);
  } catch {
    /* Critic-Antwort nicht auswertbar => konservativ reparieren */
  }

  if (verdict.quality === "sufficient")
    return { ...result, critic: { flagged: true, repaired: false, issues: [] } };

  // Repair-Pass: erneute Analyse MIT Critic-Feedback (genau ein Versuch)
  try {
    const repaired = await analyzeChunk({
      chunk,
      text,
      task:
        `${task}\n\nWICHTIG — ein unabhängiger Prüfer hat folgende Mängel an einem ` +
        `ersten Analyseversuch festgestellt, behebe sie vollständig: ` +
        (verdict.issues || flags).join("; "),
      factCriteria,
      documentName,
    });
    return {
      ...repaired,
      critic: {
        flagged: true,
        repaired: true,
        issues: verdict.issues || flags,
      },
    };
  } catch {
    return {
      ...result,
      critic: {
        flagged: true,
        repaired: false,
        issues: verdict.issues || flags,
      },
    };
  }
}

module.exports = { reviewAndRepair };
