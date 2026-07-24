// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

/**
 * VisionAgent — beschreibt Bildinhalte über das konfigurierte Vision-Backend.
 *
 * Backend-Auswahl (PDF_ANALYSIS_VISION_BACKEND):
 *  - "ollama": lokales MiniCPM-V 4.6 über Ollama (Mac, kostenlos, privat).
 *              Bei Nichtverfügbarkeit automatischer Fallback auf "cloud".
 *  - "cloud":  multimodaler LLM-Provider des Forks (OpenAI, Anthropic, ...)
 *  - "auto" (Default): lokal wenn verfügbar, sonst Cloud.
 *
 * Die öffentliche API (describeImage) bleibt unverändert — pdfReader,
 * mediaAdapters und CrossCheck funktionieren ohne Anpassung.
 */
const { getLLMProvider } = require("../helpers");
const { LLM_TEMPERATURE } = require("./config");
const localVision = require("./localVision");

const VISION_ENABLED = !/^false$/i.test(
  process.env.PDF_ANALYSIS_VISION || "true",
);
const VISION_BACKEND = (
  process.env.PDF_ANALYSIS_VISION_BACKEND || "auto"
).toLowerCase();
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

/** Cloud-Pfad: multimodaler Provider des Forks (wie bisher). */
async function describeViaCloud(imageBuffer, context, mime) {
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
        { temperature: LLM_TEMPERATURE },
      );
      const text =
        typeof result === "string" ? result : result?.textResponse || null;
      return text ? String(text).trim() : null;
    } catch (e) {
      lastError = e;
      const msg = String(e?.message || "").toLowerCase();
      if (/image|vision|multimodal|content must be a string/.test(msg))
        return null;
      if (attempt === MAX_RETRIES || !isRetryable(e)) break;
      await sleep(
        BASE_DELAY_MS * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5),
      );
    }
  }
  consoleLogger.error(
    `[pdfAnalysis] Cloud-Vision fehlgeschlagen: ${lastError?.message}`,
  );
  return null;
}

/** Lokaler Pfad: MiniCPM-V über Ollama. */
async function describeViaLocal(imageBuffer, context) {
  return localVision.generate(
    [imageBuffer],
    VISION_SYSTEM,
    `Kontext: ${context}\nAnalysiere dieses Bild:`,
  );
}

/**
 * @param {Buffer} imageBuffer PNG/JPEG
 * @param {string} context z.B. "Seite 12 des Dokuments X"
 * @returns {Promise<string|null>}
 */
async function describeImage(imageBuffer, context, mime = "image/png") {
  if (!VISION_ENABLED) return null;

  if (VISION_BACKEND === "ollama" || VISION_BACKEND === "auto") {
    const local = await describeViaLocal(imageBuffer, context);
    if (local) return local;
    if (VISION_BACKEND === "ollama") {
      // explizit lokal gewünscht — NICHT in die Cloud ausweichen (Privacy)
      consoleLogger.error(
        "[pdfAnalysis] LocalVision nicht verfügbar und Backend=ollama erzwungen — Bild übersprungen.",
      );
      return null;
    }
  }
  return describeViaCloud(imageBuffer, context, mime);
}

/**
 * Keyframe-SEQUENZ als Ganzes analysieren (MiniCPM-V Multi-Image) —
 * besseres zeitliches Verständnis als Frame-für-Frame. Nur lokal verfügbar;
 * Cloud-Fallback: null (Aufrufer iteriert dann einzeln wie bisher).
 */
async function describeImageSequence(imageBuffers, context) {
  if (!VISION_ENABLED || VISION_BACKEND === "cloud") return null;
  return localVision.generate(
    imageBuffers,
    VISION_SYSTEM,
    `Kontext: ${context}\nDies ist eine zeitlich geordnete Keyframe-Sequenz eines Videos. ` +
      `Beschreibe den visuellen Ablauf chronologisch und fasse die Kernaussage zusammen:`,
  );
}

module.exports = { describeImage, describeImageSequence, VISION_ENABLED };
