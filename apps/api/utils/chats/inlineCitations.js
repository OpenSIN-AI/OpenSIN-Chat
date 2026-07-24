// SPDX-License-Identifier: MIT
/**
 * Inline citation support — instructs the LLM to mark statements with
 * [source:N] markers that map back to the numbered context documents,
 * then provides helpers for extracting and stripping those markers.
 *
 * Concept ported from open-notebook (MIT licence).
 */

const INLINE_CITATION_INSTRUCTIONS = `
## Citation rules (IMPORTANT)
- When using information from the provided context documents you MUST mark the
  statement inline with a citation marker directly in the sentence.
- Format: [source:N] where N is the 1-based index of the context document in
  the order the documents appear in the context.
- Example: "The motion was passed with 320 votes [source:2]."
- Multiple sources for one statement: [source:1][source:3]
- Only cite documents that actually appear in the context. Never invent source numbers.
- Statements from your general knowledge receive NO citation marker.
`;

/**
 * Appends inline-citation instructions to a system prompt when context
 * documents are present.
 *
 * @param {string} systemPrompt
 * @param {number} contextCount - number of context chunks available
 * @returns {string}
 */
function withInlineCitations(systemPrompt, contextCount = 0) {
  if (contextCount === 0) return systemPrompt;
  return `${systemPrompt}\n${INLINE_CITATION_INSTRUCTIONS}`;
}

/**
 * Extracts all 1-based source indices cited in an LLM response.
 *
 * @param {string} text
 * @returns {number[]} deduplicated, ordered list of cited indices
 */
function extractCitedIndexes(text = "") {
  const matches = [...String(text).matchAll(/\[source:(\d+)\]/g)];
  return [...new Set(matches.map((m) => Number(m[1])))].filter((n) => n > 0);
}

/**
 * Strips [source:N] markers from text (e.g. for copy-to-clipboard).
 *
 * @param {string} text
 * @returns {string}
 */
function stripInlineCitations(text = "") {
  return String(text)
    .replace(/\[source:\d+\]/g, "")
    .replace(/ {2,}/g, " ");
}

module.exports = {
  INLINE_CITATION_INSTRUCTIONS,
  withInlineCitations,
  extractCitedIndexes,
  stripInlineCitations,
};
