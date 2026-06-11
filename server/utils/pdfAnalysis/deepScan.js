// SPDX-License-Identifier: MIT
/**
 * DeepScan — visuelle Voll-Analyse von PDF-Seiten via lokalem MiniCPM-V.
 *
 * Unterschied zur normalen Pipeline:
 *  - Normal:    Text-Layer + OCR-Fallback + Vision nur für Bild-Seiten (Triage)
 *  - Deep Scan: JEDE Seite wird hochauflösend gerastert und komplett
 *    visuell gelesen — MiniCPM-V interpretiert Layout, Tabellen und
 *    Diagramme im Zusammenhang ("sieht" das Dokument).
 *
 * Einsatz: komplexe Layouts (Rechnungen, Formulare, Präsentationen,
 * gescannte Akten), bei denen reine Text-Parser Struktur verlieren.
 * Aktivierung pro Analyse-Job über das Flag deepScan=true — die übrige
 * Pipeline (Chunking, AgentPool, Synthese, Fakten, Verifikation) bleibt
 * identisch; nur die Seitentext-Quelle wechselt.
 *
 * Hinweis Rendering: volle Auflösung (Scale 2.0) — MiniCPM-V kachelt
 * hochauflösende Bilder intern selbst (High-Resolution-Tiling), daher
 * KEIN Downscale vor der Übergabe.
 */
const localVision = require("./localVision");

const DEEPSCAN_SCALE = Number(
  process.env.PDF_ANALYSIS_DEEPSCAN_SCALE || 2.0
);

const DEEPSCAN_SYSTEM = `Du bist ein Dokument-Digitalisierungs-Spezialist. Du erhältst das Bild einer kompletten Dokumentseite.
Gib den GESAMTEN Inhalt strukturiert wieder:
- Fließtext wörtlich und vollständig.
- Tabellen als Markdown-Tabellen (alle Zellen).
- Diagramme/Grafiken: Typ, Achsen, alle ablesbaren Datenpunkte, Trend.
- Formularfelder: Beschriftung und eingetragene Werte.
- Layouthinweise nur wo relevant (z.B. "zweispaltig", "Stempel oben rechts").
Erfinde nichts. Lasse nichts aus. Antworte auf Deutsch (Originalzitate in Originalsprache).`;

/**
 * Liest eine Seite komplett visuell. Gibt null zurück, wenn das lokale
 * Modell nicht verfügbar ist (Aufrufer fällt auf Text/OCR-Pfad zurück).
 * @param {Object} doc pdfjs-Dokument (bereits geöffnet)
 * @param {number} pageNumber 1-basiert
 */
async function deepScanPage(doc, pageNumber) {
  if (!(await localVision.isAvailable())) return null;
  const { createCanvas } = require("@napi-rs/canvas");
  const page = await doc.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale: DEEPSCAN_SCALE });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );
    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport,
    }).promise;
    return await localVision.generate(
      [canvas.toBuffer("image/png")],
      DEEPSCAN_SYSTEM,
      `Seite ${pageNumber}. Digitalisiere diese Seite vollständig:`
    );
  } finally {
    page.cleanup();
  }
}

module.exports = { deepScanPage };
