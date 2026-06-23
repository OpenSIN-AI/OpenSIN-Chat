// SPDX-License-Identifier: MIT
/**
 * Dünner Wrapper um den OpenSIN LLM-Provider-Layer.
 *
 * Neu: Retry mit exponentiellem Backoff + Jitter. Bei AGENT_CONCURRENCY
 * parallelen Agenten sind transiente Fehler (429/5xx/Timeouts) erwartbar —
 * ein Chunk darf deshalb nicht sofort als fehlgeschlagen gelten.
 */
const { getLLMProvider } = require("../helpers");
const { LLM_TEMPERATURE } = require("./config");

const MAX_RETRIES = Number(process.env.PDF_ANALYSIS_LLM_RETRIES || 4);
const BASE_DELAY_MS = Number(process.env.PDF_ANALYSIS_LLM_BACKOFF_MS || 2000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Entfernt Chain-of-Thought-/Reasoning-Blöcke aus einer LLM-Antwort.
 *
 * Reasoning-Modelle (z.B. MiniMax M3, DeepSeek) liefern ihr "Denken" entweder
 * im `reasoning_content`-Feld (vom Provider als `<think>...</think>` vorangestellt)
 * oder inline im Antworttext. In Berichten/Zusammenfassungen darf dieses
 * Denken NIE erscheinen — es ist kein belegbarer Inhalt und verfälscht den
 * Report. Wir strippen daher vollständige sowie abgeschnittene (unbalancierte)
 * `<think>`-Blöcke, bevor der Text weiterverarbeitet wird.
 * @param {*} text
 * @returns {*}
 */
function stripReasoning(text) {
  if (typeof text !== "string") return text;
  let out = text.replace(
    /<think\s*(?:[^>]*?)?>[\s\S]*?<\/think\s*(?:[^>]*?)?>/gi,
    "",
  );
  // Hängender, nie geschlossener <think>-Block (Reasoning lief über das
  // Token-Limit hinaus) — alles ab dem öffnenden Tag verwerfen.
  out = out.replace(/<think\s*(?:[^>]*?)?>[\s\S]*$/gi, "");
  return out.trim();
}

function isRetryable(error) {
  const msg = String(error?.message || error).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("rate") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("socket") ||
    msg.includes("overloaded") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500")
  );
}

async function chat(systemPrompt, userPrompt, { temperature } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const LLMConnector = getLLMProvider();
      const result = await LLMConnector.getChatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { temperature: temperature ?? LLM_TEMPERATURE },
      );
      if (result === null || result === undefined)
        throw new Error("LLM lieferte keine Antwort.");
      if (typeof result === "string") return stripReasoning(result);
      if (typeof result.textResponse === "string")
        return stripReasoning(result.textResponse);
      return String(result);
    } catch (e) {
      lastError = e;
      if (attempt === MAX_RETRIES || !isRetryable(e)) break;
      // Exponentieller Backoff mit Jitter: 2s, 4s, 8s, 16s (+/- 25%)
      const delay =
        BASE_DELAY_MS * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5);
      await sleep(delay);
    }
  }
  throw lastError;
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
