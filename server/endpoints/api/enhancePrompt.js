// SPDX-License-Identifier: MIT
/**
 * Prompt Enhancement REST API endpoint.
 *
 * Purpose: Uses the configured LLM provider to rewrite/improve a user prompt
 *          for better RAG/chat results.
 *
 * Endpoint:
 *   POST /enhance-prompt  — enhance a prompt via LLM
 *
 * Input:  { prompt: string, context?: string }
 * Output: { enhancedPrompt: string, originalPrompt: string }
 */

const { validApiKey } = require("../../utils/middleware/validApiKey");
const { simpleRateLimit } = require("../../utils/middleware/simpleRateLimit");
const { reqBody } = require("../../utils/http");
const logger = require("../../utils/logger")();

const MAX_PROMPT_LENGTH = 5000;
const MAX_CONTEXT_LENGTH = 2000;

const enhanceRateLimit = simpleRateLimit({
  bucket: "enhance-prompt",
  max: 10,
  windowMs: 60 * 1000,
});

const SYSTEM_INSTRUCTION = `You are a prompt enhancement assistant. Rewrite the user's prompt to make it clearer, more specific, and more effective for retrieval-augmented generation. Preserve the original intent. Respond with ONLY the improved prompt — no preamble, no explanation.`;

/**
 * Chain-of-thought / reasoning prefixes that some LLMs emit before the final
 * answer. We strip leading paragraphs or lines that consist only of these
 * meta-commentary patterns so the API never leaks the model's internal
 * instructions. The list is intentionally conservative: it only matches the
 * start of a paragraph to reduce false positives on legitimate prompts.
 */
const REASONING_PREFIXES = [
  /^the user wants me to\b/i,
  /^the user asked\b/i,
  /^i need to\b/i,
  /^i should\b/i,
  /^i will\b/i,
  /^let me\b/i,
  /^i want to\b/i,
  /^okay\b/i,
  /^alright\b/i,
  /^hmm\b/i,
  /^wait\b/i,
  /^actually\b/i,
  /^i'll\b/i,
  /^here is\b/i,
  /^here are\b/i,
  /^to do this\b/i,
];

function isReasoningPrefix(text) {
  return REASONING_PREFIXES.some((rx) => rx.test(text.trim()));
}

/**
 * Remove known machine-reasoning fence tags (e.g. DeepSeek R1 `<thinking>`).
 * @param {string} text
 * @returns {string}
 */
function stripReasoningTags(text) {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<\/?reasoning>/gi, "")
    .trim();
}

/**
 * If the first sentence of the response is a reasoning meta-comment and the
 * rest of the text is non-empty, drop the first sentence. This catches the
 * common case where the model appends the answer to the same paragraph.
 * @param {string} text
 * @returns {string}
 */
function stripFirstSentenceIfReasoning(text) {
  const match = text.match(/^([^ .\n]+[^.\n]*[.!?])\s*(.*)$/s);
  if (!match) return text;
  const [, firstSentence, rest] = match;
  if (isReasoningPrefix(firstSentence) && rest.trim()) return rest.trim();
  return text;
}

/**
 * Strip leading lines that are empty or consist solely of reasoning markers.
 * @param {string} text
 * @returns {string}
 */
function stripLeadingReasoningLines(text) {
  const lines = text.split("\n");
  let start = 0;
  while (
    start < lines.length &&
    (lines[start].trim() === "" || isReasoningPrefix(lines[start]))
  ) {
    start++;
  }
  const result = lines.slice(start).join("\n").trim();
  return result;
}

/**
 * Strip leading paragraphs that consist solely of reasoning markers. If the
 * first paragraph is not reasoning, the whole text is preserved, so multi-
 * paragraph enhanced prompts are not truncated.
 * @param {string} text
 * @returns {string}
 */
function stripLeadingReasoningParagraphs(text) {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
  let start = 0;
  while (start < paragraphs.length && isReasoningPrefix(paragraphs[start])) {
    start++;
  }
  const result = paragraphs.slice(start).join("\n\n").trim();
  return result;
}

/**
 * Extract the final enhanced prompt from an LLM response, removing any
 * chain-of-thought or reasoning text. Falls back to the original prompt if no
 * clean answer can be extracted.
 * @param {string|null|undefined} text
 * @param {string} fallback
 * @returns {string}
 */
function extractEnhancedPrompt(text, fallback) {
  if (typeof text !== "string" || !text.trim()) return fallback;
  let cleaned = stripReasoningTags(text);
  cleaned = stripFirstSentenceIfReasoning(cleaned);
  cleaned = stripLeadingReasoningLines(cleaned);
  cleaned = stripLeadingReasoningParagraphs(cleaned);
  // Remove surrounding quotes / smart quotes the model may have added.
  cleaned = cleaned.replace(/^[“”"']+|[“”"']+$/g, "").trim();
  return cleaned || fallback;
}

function apiEnhancePromptEndpoints(app) {
  if (!app) return;

  app.post(
    "/enhance-prompt",
    [validApiKey, enhanceRateLimit],
    async (request, response) => {
      try {
        const body = reqBody(request) || {};
        const { prompt, context } = body;

        const errors = [];
        if (typeof prompt !== "string" || !prompt.trim())
          errors.push("prompt is required and must be a non-empty string");
        else if (prompt.length > MAX_PROMPT_LENGTH)
          errors.push(
            `prompt must be ${MAX_PROMPT_LENGTH} characters or fewer`,
          );
        if (
          context !== undefined &&
          context !== null &&
          (typeof context !== "string" || context.length > MAX_CONTEXT_LENGTH)
        )
          errors.push(
            `context must be a string of ${MAX_CONTEXT_LENGTH} characters or fewer`,
          );
        if (errors.length)
          return response.status(400).json({ error: errors.join("; ") });

        const trimmedPrompt = prompt.trim();

        let llm;
        try {
          const { getLLMProvider } = require("../../utils/helpers");
          llm = getLLMProvider();
        } catch {
          return response.status(200).json({
            enhancedPrompt: trimmedPrompt,
            originalPrompt: trimmedPrompt,
            note: "No LLM provider configured — returning original prompt unchanged.",
          });
        }

        const userContent = context
          ? `Context: ${context}\n\nPrompt to enhance: ${trimmedPrompt}`
          : `Prompt to enhance: ${trimmedPrompt}`;

        const result = await llm.getChatCompletion(
          [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: userContent },
          ],
          { temperature: 0.3 },
        );

        const rawText =
          typeof result === "string"
            ? result
            : typeof result?.textResponse === "string"
              ? result.textResponse
              : "";
        const enhanced = extractEnhancedPrompt(rawText, trimmedPrompt);

        if (enhanced === trimmedPrompt) {
          return response.status(200).json({
            enhancedPrompt: trimmedPrompt,
            originalPrompt: trimmedPrompt,
            note: "LLM returned an empty or unparseable response — returning original prompt.",
          });
        }

        response.status(200).json({
          enhancedPrompt: enhanced,
          originalPrompt: trimmedPrompt,
        });
      } catch (err) {
        logger.error(`[enhance-prompt] ${err.message}`, err);
        response.status(500).json({ error: "Internal Server Error" });
      }
    },
  );
}

module.exports = { apiEnhancePromptEndpoints };
