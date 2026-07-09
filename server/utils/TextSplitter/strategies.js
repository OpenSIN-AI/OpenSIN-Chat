// SPDX-License-Identifier: MIT
/**
 * Document-type-specific chunking strategies.
 *
 * Inspired by RAGFlow's template-based chunking approach. Each strategy is a
 * plain-data object describing how the RecursiveCharacterTextSplitter should
 * be configured for a given document type. The strategy is read from
 * workspace.chunkingStrategy (future workspace setting) or falls back to
 * "default".
 *
 * Strategies:
 *   default  — general-purpose for any unknown document
 *   plenum   — Bundestag / Landtag Plenarprotokolle: split at speaker changes
 *   law      — Drucksachen / Gesetze: split at § / Artikel / Abschnitt boundaries
 *   report   — short reports, press releases
 *   tabular  — CSV / statistical tables (no overlap to avoid data duplication)
 *
 * The separatorPattern key (RegExp) takes priority over separator (string)
 * when both are present. It is used by the StrategicSplitter below.
 */

/** @type {Record<string, {chunkSize: number, chunkOverlap: number, separator?: string, separatorPattern?: RegExp}>} */
const CHUNKING_STRATEGIES = {
  default: {
    chunkSize: 1000,
    chunkOverlap: 200,
    separator: "\n\n",
  },

  /**
   * Plenarprotokolle (Bundestag / Landtag).
   *
   * Bundestagsformat Rednerwechsel: "Vorname Nachname (Partei):" or
   * "Präsident/in Name:" at the start of a line.
   * A speaker contribution is a natural semantic unit — splitting inside one
   * loses the attribution context that later retrieval relies on.
   *
   * chunkSize is larger than default because contributions typically run
   * 1500–3000 chars. The small overlap (100) retains only the transition.
   */
  plenum: {
    chunkSize: 2000,
    chunkOverlap: 100,
    // Matches the line-start of a new speaker or role title.
    // Does NOT consume the match — uses a zero-width lookahead so the speaker
    // header stays with the content that follows.
    separatorPattern:
      /\n(?=[A-ZÜÄÖA-Z][a-züäöß\u00C0-\u017E]+ [A-ZÜÄÖ][a-züäöß\u00C0-\u017E]+\s*\([A-Z][a-zA-Z/\s]+\):|(?:Präsident(?:in)?|Vizepräsident(?:in)?|Bundesminister(?:in)?|Staatsminister(?:in)?)\b)/,
  },

  /**
   * Drucksachen / Gesetze / Verordnungen.
   *
   * German legal documents use §, Artikel, and Abschnitt as hard structural
   * boundaries. Keeping each paragraph as a unit preserves its completeness
   * and avoids the common failure mode of a retrieval result that starts
   * mid-sentence inside a §.
   *
   * Lower overlap (50) because paragraphs are already self-contained.
   */
  law: {
    chunkSize: 1500,
    chunkOverlap: 50,
    separatorPattern:
      /(?=\n§\s*\d+|\nArtikel\s+\d+|\nAbschnitt\s+[IVX\d]+|\n\(\d+\)\s)/,
  },

  /**
   * Short reports, press releases, web articles.
   * Smaller chunks for higher retrieval precision.
   */
  report: {
    chunkSize: 500,
    chunkOverlap: 80,
    separator: "\n\n",
  },

  /**
   * Tabular data / statistics.
   * No overlap: overlap in table rows creates duplicated numeric data which
   * confuses the LLM and inflates embedding distances.
   */
  tabular: {
    chunkSize: 800,
    chunkOverlap: 0,
    separator: "\n",
  },
};

/**
 * Returns the chunking strategy configuration for the given strategy name.
 * Unknown names fall back to "default" with a warning log.
 *
 * @param {string} [strategy="default"]
 * @returns {{ chunkSize: number, chunkOverlap: number, separator?: string, separatorPattern?: RegExp }}
 */
function getChunkingStrategy(strategy = "default") {
  if (!CHUNKING_STRATEGIES[strategy]) {
    console.warn(
      `[TextSplitter] Unknown chunking strategy "${strategy}" — falling back to "default".`,
    );
    return CHUNKING_STRATEGIES.default;
  }
  return CHUNKING_STRATEGIES[strategy];
}

module.exports = { CHUNKING_STRATEGIES, getChunkingStrategy };
