// SPDX-License-Identifier: MIT
/**
 * FactVerifier — prüft LLM-extrahierte Fakten deterministisch gegen den
 * echten Seitentext (KEIN LLM, kein Halluzinationsrisiko).
 *
 * Vorgehen pro Fakt:
 *  1. Zitat und Seitentext normalisieren (Whitespace, Anführungszeichen,
 *     Ligaturen, Silbentrennung am Zeilenende).
 *  2. Exakte Substring-Suche auf der angegebenen Seite.
 *  3. Bei Fehlschlag: Nachbarseiten ±VERIFY_PAGE_WINDOW prüfen (Agent kann
 *     an Chunk-/Seitengrenzen um eine Seite danebenliegen) — bei Treffer
 *     wird die Seitenangabe automatisch korrigiert.
 *  4. Ergebnis: { verified, correctedPage } — unverifizierte Fakten werden
 *     je nach STRICT-Modus verworfen oder mit verified:false gespeichert.
 */
const VERIFY_PAGE_WINDOW = Number(process.env.PDF_ANALYSIS_VERIFY_WINDOW || 1);
const STRICT = /^true$/i.test(
  process.env.PDF_ANALYSIS_VERIFY_STRICT || "false",
);
const MIN_QUOTE_LENGTH = 12; // zu kurze Zitate sind nicht beweiskräftig

function normalize(text) {
  return String(text || "")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/\u00AD/g, "") // Soft Hyphen
    .replace(/(\w)-\s*\n\s*(\w)/g, "$1$2") // Silbentrennung am Zeilenumbruch
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB02/g, "fl")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/**
 * @param {Object} fact { quote, page }
 * @param {Function} getPageText async (pageNumber) => string|null
 * @param {number} totalPages
 * @returns {Promise<{verified: boolean, correctedPage: number|null}>}
 */
async function verifyFact(fact, getPageText, totalPages) {
  const quote = normalize(fact.quote);
  if (quote.length < MIN_QUOTE_LENGTH)
    return { verified: false, correctedPage: null };

  // Kandidaten-Seiten: angegebene Seite zuerst, dann Nachbarn
  const candidates = [fact.page];
  for (let d = 1; d <= VERIFY_PAGE_WINDOW; d++) {
    if (fact.page - d >= 1) candidates.push(fact.page - d);
    if (fact.page + d <= totalPages) candidates.push(fact.page + d);
  }

  for (const page of candidates) {
    const pageText = await getPageText(page);
    if (!pageText) continue;
    if (normalize(pageText).includes(quote)) {
      return {
        verified: true,
        correctedPage: page === fact.page ? null : page,
      };
    }
  }
  return { verified: false, correctedPage: null };
}

/**
 * Verifiziert eine Fakten-Liste mit Seitentext-Cache (jede Seite wird
 * höchstens einmal aus dem PDF gelesen).
 * @returns {Promise<Array>} Fakten, angereichert um verified/Seitenkorrektur;
 *          im STRICT-Modus werden unverifizierte Fakten entfernt.
 */
async function verifyFacts(facts, reader) {
  const pageCache = new Map();
  const getPageText = async (page) => {
    if (pageCache.has(page)) return pageCache.get(page);
    let text = null;
    try {
      text = await reader.pageText(page);
    } catch {
      /* Seite nicht lesbar — Fakt bleibt unverifiziert */
    }
    pageCache.set(page, text);
    return text;
  };

  const out = [];
  for (const fact of facts) {
    const { verified, correctedPage } = await verifyFact(
      fact,
      getPageText,
      reader.numPages,
    );
    if (!verified && STRICT) continue;
    out.push({
      ...fact,
      verified,
      source: {
        ...fact.source,
        page: correctedPage ?? fact.source.page,
        pageCorrected: correctedPage !== null,
      },
    });
  }
  return out;
}

module.exports = { verifyFacts };
