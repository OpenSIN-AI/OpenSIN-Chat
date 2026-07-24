// SPDX-License-Identifier: MIT
/**
 * "Ask" mode — multi-query synthesis over workspace documents.
 *
 * Algorithm (ported from open-notebook graphs/ask.py, MIT licence):
 *   1. Decompose the user's question into 2-5 targeted search queries.
 *   2. Run each query as a parallel vector similarity search.
 *   3. Generate a focused sub-answer per query from its retrieved chunks.
 *   4. Synthesise all sub-answers into a final, fully cited response.
 */

const consoleLogger = require("../logger/console.js");
const { getLLMProvider, getVectorDbClass } = require("../helpers");
const { safeJsonParse } = require("../http");

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const STRATEGY_PROMPT = `Du bist ein Recherche-Stratege. Zerlege die Frage des Nutzers in 2-5 gezielte, unterschiedliche Suchanfragen für eine semantische Dokumentensuche.
Antworte NUR mit validem JSON in diesem Format, ohne Markdown:
{"searches": [{"term": "Suchbegriff oder Frage", "instruction": "Was aus den Ergebnissen extrahiert werden soll"}]}`;

const INDIVIDUAL_ANSWER_PROMPT = `Beantworte die Teilfrage AUSSCHLIESSLICH auf Basis der bereitgestellten Dokumentauszüge. Wenn die Auszüge keine Antwort enthalten, sage das explizit. Zitiere relevante Passagen. Antworte auf Deutsch.`;

const FINAL_ANSWER_PROMPT = `Du erhältst eine Nutzerfrage und mehrere recherchierte Teilantworten. Synthetisiere daraus eine vollständige, gut strukturierte Antwort auf Deutsch. Kennzeichne, welche Erkenntnis aus welcher Teilrecherche stammt. Erfinde nichts, was nicht in den Teilantworten steht.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Asks the LLM to decompose the question into multiple search queries.
 *
 * @returns {Promise<Array<{term: string, instruction: string}>>}
 */
async function generateSearchStrategy({ question, LLMConnector }) {
  const result = await LLMConnector.getChatCompletion(
    [
      { role: "system", content: STRATEGY_PROMPT },
      { role: "user", content: question },
    ],
    { temperature: 0.2 },
  );

  const parsed = safeJsonParse(
    String(result?.textResponse || "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim(),
    null,
  );

  if (!parsed?.searches?.length)
    return [{ term: question, instruction: "Beantworte die Frage direkt." }];

  return parsed.searches.slice(0, 5);
}

/**
 * Runs a single sub-query: similarity search + focused answer generation.
 */
async function answerSubQuery({ search, workspace, LLMConnector, VectorDb }) {
  const searchResults = await VectorDb.performSimilaritySearch({
    namespace: workspace.slug,
    input: search.term,
    LLMConnector,
    similarityThreshold: workspace?.similarityThreshold ?? 0.25,
    topN: workspace?.topN ?? 4,
    filterIdentifiers: [],
    rerank: workspace?.vectorSearchMode === "rerank",
  });

  if (!searchResults?.contextTexts?.length)
    return { search, answer: null, sources: [] };

  const contextString = searchResults.contextTexts
    .map((t, i) => `[DOKUMENT ${i + 1}]\n${t}`)
    .join("\n\n---\n\n");

  const result = await LLMConnector.getChatCompletion(
    [
      { role: "system", content: INDIVIDUAL_ANSWER_PROMPT },
      {
        role: "user",
        content: `Teilfrage: ${search.term}\nInstruktion: ${search.instruction}\n\nDokumentauszüge:\n${contextString}`,
      },
    ],
    { temperature: 0.2 },
  );

  return {
    search,
    answer: result?.textResponse?.trim() || null,
    sources: searchResults.sources || [],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs the full ask pipeline: strategy → parallel sub-queries → synthesis.
 *
 * @param {object} params
 * @param {string} params.question
 * @param {object} params.workspace
 * @returns {Promise<{answer: string, strategy: object[], subAnswers: object[], sources: object[]}>}
 */
async function askDocuments({ question, workspace }) {
  const LLMConnector = getLLMProvider({
    provider: workspace?.chatProvider,
    model: workspace?.chatModel,
  });
  const VectorDb = getVectorDbClass();

  // Step 1: generate search strategy
  const strategy = await generateSearchStrategy({ question, LLMConnector });
  consoleLogger.log(`[Ask] Strategy generated: ${strategy.length} sub-queries`);

  // Steps 2 + 3: parallel sub-queries and focused answers
  const subAnswers = await Promise.all(
    strategy.map((search) =>
      answerSubQuery({ search, workspace, LLMConnector, VectorDb }).catch(
        (e) => {
          consoleLogger.error(`[Ask] Sub-query failed: ${e.message}`);
          return { search, answer: null, sources: [] };
        },
      ),
    ),
  );

  const validAnswers = subAnswers.filter((a) => !!a.answer);

  if (validAnswers.length === 0) {
    return {
      answer:
        "Zu dieser Frage konnten keine relevanten Informationen in den Dokumenten dieses Workspace gefunden werden.",
      strategy,
      subAnswers: [],
      sources: [],
    };
  }

  // Step 4: synthesis
  const synthesisInput = validAnswers
    .map(
      (a, i) => `### Teilrecherche ${i + 1}: "${a.search.term}"\n${a.answer}`,
    )
    .join("\n\n");

  const finalResult = await LLMConnector.getChatCompletion(
    [
      { role: "system", content: FINAL_ANSWER_PROMPT },
      {
        role: "user",
        content: `Nutzerfrage: ${question}\n\nTeilantworten:\n${synthesisInput}`,
      },
    ],
    { temperature: 0.3 },
  );

  // Deduplicate sources across all sub-queries
  const seen = new Set();
  const sources = [];
  for (const a of validAnswers) {
    for (const s of a.sources) {
      const key = s.docpath || s.title || JSON.stringify(s).slice(0, 100);
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push(s);
    }
  }

  return {
    answer: finalResult?.textResponse?.trim() || "Synthese fehlgeschlagen.",
    strategy,
    subAnswers: validAnswers.map((a) => ({
      term: a.search.term,
      answer: a.answer,
    })),
    sources,
  };
}

module.exports = { askDocuments };
