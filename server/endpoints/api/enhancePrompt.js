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

const {
  validatedRequest,
} = require("../../utils/middleware/validatedRequest");
const {
  simpleRateLimit,
} = require("../../utils/middleware/simpleRateLimit");
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

function apiEnhancePromptEndpoints(app) {
  if (!app) return;

  app.post(
    "/enhance-prompt",
    [validatedRequest, enhanceRateLimit],
    async (request, response) => {
      try {
        const { prompt, context } = reqBody(request);

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
          (typeof context !== "string" ||
            context.length > MAX_CONTEXT_LENGTH)
        )
          errors.push(
            `context must be a string of ${MAX_CONTEXT_LENGTH} characters or fewer`,
          );
        if (errors.length)
          return response.status(400).json({ error: errors.join("; ") });

        let llm;
        try {
          const { getLLMProvider } = require("../../utils/helpers");
          llm = getLLMProvider();
        } catch {
          return response.status(200).json({
            enhancedPrompt: prompt,
            originalPrompt: prompt,
            note: "No LLM provider configured — returning original prompt unchanged.",
          });
        }

        const userContent = context
          ? `Context: ${context}\n\nPrompt to enhance: ${prompt}`
          : `Prompt to enhance: ${prompt}`;

        const result = await llm.getChatCompletion(
          [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: userContent },
          ],
          { temperature: 0.3 },
        );

        const enhanced =
          typeof result === "string"
            ? result.trim()
            : typeof result?.textResponse === "string"
              ? result.textResponse.trim()
              : prompt;

        if (!enhanced) {
          return response.status(200).json({
            enhancedPrompt: prompt,
            originalPrompt: prompt,
            note: "LLM returned an empty response — returning original prompt.",
          });
        }

        response.status(200).json({
          enhancedPrompt: enhanced,
          originalPrompt: prompt,
        });
      } catch (err) {
        logger.error(`[enhance-prompt] ${err.message}`, err);
        response.status(500).json({ error: "Internal Server Error" });
      }
    },
  );
}

module.exports = { apiEnhancePromptEndpoints };
