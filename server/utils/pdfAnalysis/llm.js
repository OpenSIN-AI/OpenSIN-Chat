// SPDX-License-Identifier: MIT
/**
 * Dünner Wrapper um den AnythingLLM/OpenSIN LLM-Provider-Layer.
 * Normalisiert die Rückgabe von getChatCompletion über Provider-Versionen hinweg.
 */
const { getLLMProvider } = require("../helpers");
const { LLM_TEMPERATURE } = require("./config");

async function chat(systemPrompt, userPrompt, { temperature } = {}) {
  const LLMConnector = getLLMProvider();
  const result = await LLMConnector.getChatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: temperature ?? LLM_TEMPERATURE }
  );
  if (result === null || result === undefined)
    throw new Error("LLM lieferte keine Antwort.");
  if (typeof result === "string") return result;
  if (typeof result.textResponse === "string") return result.textResponse;
  return String(result);
}

/**
 * Extrahiert das erste JSON-Objekt aus einer LLM-Antwort (robust gegen
 * Markdown-Fences und Vor-/Nachtext).
 */
function parseJson(text) {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start)
    throw new Error("Kein JSON in LLM-Antwort gefunden.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

module.exports = { chat, parseJson };
