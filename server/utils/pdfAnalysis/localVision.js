// SPDX-License-Identifier: MIT
/**
 * LocalVision — lokales multimodales Backend über Ollama (MiniCPM-V 4.6).
 *
 * Läuft komplett lokal auf dem Mac (Apple Silicon / Metal), keine Cloud,
 * keine API-Kosten, keine Daten verlassen das Gerät.
 *
 * MiniCPM-V-Eigenschaften, die hier genutzt werden:
 *  - High-Resolution-Tiling: das Modell kachelt hochauflösende Bilder
 *    selbst — wir senden daher die VOLLE Render-Auflösung (kein Downscale).
 *  - OCR-Spezialist: liest Tabellen, Diagramme und komplexe Layouts
 *    direkt aus dem Bild ("sieht" das Dokument statt es zu parsen).
 *  - Multi-Image: Video-Keyframes können als Sequenz übergeben werden.
 *
 * API: Ollama /api/generate mit base64 "images"-Array.
 */
const OLLAMA_URL =
  process.env.PDF_ANALYSIS_OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL =
  process.env.PDF_ANALYSIS_OLLAMA_VISION_MODEL || "minicpm-v";
const TIMEOUT_MS = Number(
  process.env.PDF_ANALYSIS_OLLAMA_TIMEOUT_MS || 180000 // lokale Inferenz braucht Zeit
);
const NUM_CTX = Number(process.env.PDF_ANALYSIS_OLLAMA_NUM_CTX || 8192);

/**
 * Prüft, ob Ollama erreichbar ist und das Vision-Modell installiert ist.
 * Ergebnis wird gecacht (Health-Check nicht bei jedem Bild wiederholen).
 */
let availabilityCache = { checkedAt: 0, available: false };
async function isAvailable() {
  if (Date.now() - availabilityCache.checkedAt < 60000)
    return availabilityCache.available;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    const { models = [] } = await res.json();
    const available = models.some((m) =>
      String(m.name || "").startsWith(OLLAMA_MODEL)
    );
    availabilityCache = { checkedAt: Date.now(), available };
    if (!available)
      console.error(
        `[pdfAnalysis] Ollama läuft, aber Modell "${OLLAMA_MODEL}" fehlt. ` +
          `Installieren mit: ollama pull ${OLLAMA_MODEL}`
      );
    return available;
  } catch {
    availabilityCache = { checkedAt: Date.now(), available: false };
    return false;
  }
}

/**
 * Beschreibt ein oder mehrere Bilder über das lokale MiniCPM-V.
 * @param {Buffer[]} imageBuffers PNG/JPEG-Buffer (1 Bild oder Keyframe-Sequenz)
 * @param {string} systemPrompt Analyse-Anweisung
 * @param {string} userPrompt Kontext + Frage
 * @returns {Promise<string|null>} Antwort oder null bei Nichtverfügbarkeit
 */
async function generate(imageBuffers, systemPrompt, userPrompt) {
  if (!(await isAvailable())) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        images: imageBuffers.map((b) => b.toString("base64")),
        stream: false,
        options: {
          temperature: 0,
          num_ctx: NUM_CTX,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Ollama HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    return (data.response || "").trim() || null;
  } catch (e) {
    console.error(`[pdfAnalysis] LocalVision-Fehler: ${e.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { generate, isAvailable, OLLAMA_MODEL };
