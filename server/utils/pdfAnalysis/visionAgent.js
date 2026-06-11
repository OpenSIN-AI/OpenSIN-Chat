// SPDX-License-Identifier: MIT
/**
 * VisionAgent — beschreibt Bildinhalte (PDF-Seiten mit Grafiken, Bild-URLs,
 * Video-Keyframes) über das multimodale LLM des konfigurierten Providers.
 *
 * Best Practices:
 *  - Strukturierte Extraktion statt freier Beschreibung: Diagrammtyp,
 *    Achsen/Legenden, abgelesene Datenpunkte, Text im Bild (Vision-OCR).
 *  - Bilder als Base64-Data-URL im OpenAI-kompatiblen content-Array —
 *    das verstehen die multimodalen Connectors des Forks (OpenAI, Anthropic,
 *    Gemini, Ollama-Vision). Nicht-multimodale Provider werfen einen Fehler,
 *    der sauber abgefangen wird (Pipeline läuft text-only weiter).
 *  - Gleiches Retry/Backoff-Verhalten wie der Text-Pfad (llm.js).
 */
const { getLLMProvider } = require("../helpers");
const { LLM_TEMPERATURE } = require("./config");

const VISION_ENABLED = !/^false$/i.test(
  process.env.PDF_ANALYSIS_VISION || "true"
);
const MAX_RETRIES = Number(process.env.PDF_ANALYSIS_LLM_RETRIES || 4);
const BASE_DELAY_MS = Number(process.env.PDF_ANALYSIS_LLM_BACKOFF_MS || 2000);

const VISION_SYSTEM = `Du bist ein präziser visueller Analyse-Agent in einem Dokument-Analyse-System.
Beschreibe NUR, was im Bild sichtbar ist. Erfinde nichts. Struktur deiner Antwort:
1. ART: (Foto | Diagramm | Tabelle | Karte | Screenshot | Formular | Sonstiges)
2. INHALT: präzise Beschreibung des Sichtbaren
3. DATEN: bei Diagrammen/Tabellen alle ablesbaren Werte, Achsen, Legenden, Trends
4. TEXT-IM-BILD: wörtliche Wiedergabe aller lesbaren Texte/Beschriftungen
Antworte kompakt auf Deutsch, ohne Einleitung.`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(e) {
  const msg = String(e?.message || e).toLowerCase();
  return /429|rate|timeout|econnreset|socket|overloaded|50[023]/.test(msg);
}

/**
 * @param {Buffer} imageBuffer PNG/JPEG
 * @param {string} context z.B. "Seite 12 des Dokuments X" oder "Keyframe bei 01:23"
 * @returns {Promise<string|null>} strukturierte Beschreibung oder null
 *          (Vision deaktiviert / Provider nicht multimodal)
 */
async function describeImage(imageBuffer, context, mime = "image/png") {
  if (!VISION_ENABLED) return null;
  const dataUrl = `data:${mime};base64,${imageBuffer.toString("base64")}`;

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const LLMConnector = getLLMProvider();
      const result = await LLMConnector.getChatCompletion(
        [
          { role: "system", content: VISION_SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Kontext: ${context}\nAnalysiere dieses Bild:`,
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        { temperature: LLM_TEMPERATURE }
      );
      const text =
        typeof result === "string"
          ? result
          : result?.textResponse || null;
      return text ? String(text).trim() : null;
    } catch (e) {
      lastError = e;
      // Provider nicht multimodal => kein Retry, sauber text-only weiter
      const msg = String(e?.message || "").toLowerCase();
      if (/image|vision|multimodal|content must be a string/.test(msg))
        return null;
      if (attempt === MAX_RETRIES || !isRetryable(e)) break;
      await sleep(
        BASE_DELAY_MS * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5)
      );
    }
  }
  console.error(
    `[pdfAnalysis] Vision-Analyse fehlgeschlagen: ${lastError?.message}`
  );
  return null;
}

module.exports = { describeImage, VISION_ENABLED };
