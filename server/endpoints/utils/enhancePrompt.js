// SPDX-License-Identifier: MIT
const { reqBody } = require("../../utils/http");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const { getLLMProvider } = require("../../utils/helpers");

/**
 * POST /api/utils/enhance-prompt
 * Body: { prompt: string }
 * Response: { enhanced: string } | { error: string }
 *
 * Uses the system LLM to rewrite a user prompt so it is clearer,
 * more detailed, and better structured — without changing its intent.
 */
function enhancePromptEndpoint(app) {
  if (!app) return;

  app.post(
    "/utils/enhance-prompt",
    [validatedRequest],
    async (request, response) => {
      try {
        const { prompt } = reqBody(request);

        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
          return response
            .status(400)
            .json({ error: "prompt must be a non-empty string." });
        }

        const trimmed = prompt.trim();
        if (trimmed.length > 4000) {
          return response.status(400).json({
            error: "prompt exceeds maximum length of 4000 characters.",
          });
        }

        const LLMConnector = getLLMProvider();

        const messages = [
          {
            role: "system",
            content: [
              "Du bist ein Assistent der Nutzer-Prompts verbessert.",
              "Deine Aufgabe: Formuliere den gegebenen Prompt klarer, detaillierter und besser strukturiert.",
              "Behalte die ursprüngliche Intention und Sprache exakt bei.",
              "Gib NUR den verbesserten Prompt zurück — ohne Erklärungen, Anführungszeichen oder zusätzlichen Text.",
            ].join(" "),
          },
          {
            role: "user",
            content: trimmed,
          },
        ];

        const { textResponse } = await LLMConnector.getChatCompletion(
          messages,
          { temperature: 0.4 },
        );

        if (!textResponse) {
          return response
            .status(500)
            .json({ error: "LLM returned no response." });
        }

        return response.status(200).json({ enhanced: textResponse.trim() });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[enhance-prompt]", e.message);
        // Return 200 with error so the frontend can fall back silently
        return response.status(200).json({ error: e.message });
      }
    },
  );
}

module.exports = { enhancePromptEndpoint };
