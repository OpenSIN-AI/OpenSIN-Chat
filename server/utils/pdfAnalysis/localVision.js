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
 *
 * Resilienz: Circuit-Breaker-Pattern, damit ein überlastetes oder
 * abgestürztes Ollama nicht bei jedem Aufruf einen 3s-Timeout-Hangout
 * verursacht. Nach FAILURE_THRESHOLD aufeinanderfolgenden Fehlern
 * wird der Health-Check für CIRCUIT_OPEN_MS übersprungen.
 */
const OLLAMA_URL =
  process.env.PDF_ANALYSIS_OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL =
  process.env.PDF_ANALYSIS_OLLAMA_VISION_MODEL || "minicpm-v";
const TIMEOUT_MS = Number(
  process.env.PDF_ANALYSIS_OLLAMA_TIMEOUT_MS || 180000, // lokale Inferenz braucht Zeit
);
const NUM_CTX = Number(process.env.PDF_ANALYSIS_OLLAMA_NUM_CTX || 8192);

// Health-Cache: kurzes TTL, positives Ergebnis wird aggressiv gecacht.
let availabilityCache = { checkedAt: 0, available: false };

// ── Circuit-Breaker ────────────────────────────────────────────────
// Nach FAILURE_THRESHOLD (5) aufeinanderfolgenden Fehlern wird der
// Health-Check für CIRCUIT_OPEN_MS (5 min) komplett übersprungen und
// "nicht verfügbar" zurückgegeben. Sobald der Open-Fenster vorbei ist,
// wird EIN einzelner Probe-Versuch erlaubt ("half-open"); gelingt er,
// schließt sich der Circuit sofort (failureCount = 0).
//
// Warum? Ohne Breaker: 10 parallele PDF-Jobs → 10 fetch() mit je 3s
// Timeout auf einen toten Ollama → 30s Latenz, aber kein Fehlerfortschritt.
// Mit Breaker: nach 5 Fehlern (≈ 15s erkannt) → 5 min Ruhe, kein
// Dauerfeuer mehr, und der nächste Job bekommt sofort `null` (Fallback).
const FAILURE_THRESHOLD = 5; // 5 aufeinanderfolgende Fehler öffnen den Circuit
const CIRCUIT_OPEN_MS = 5 * 60 * 1000; // 5 Minuten Open-Fenster
let failureCount = 0;
let lastFailureAt = 0;

/**
 * Prüft, ob Ollama erreichbar ist und das Vision-Modell installiert ist.
 * Ergebnis wird gecacht (Health-Check nicht bei jedem Bild wiederholen).
 *
 * Schützt sich zusätzlich via Circuit-Breaker vor wiederholten Checks
 * gegen ein dauerhaft unerreichbares Backend.
 */
async function isAvailable() {
  // Circuit-Breaker hat Vorrang VOR dem positiven Cache: wenn der
  // Breaker offen ist, darf auch ein 60s-Positiv-Cache nicht lügen
  // (sonst würde der nächste isAvailable()-Aufruf einen /api/tags-Probe
  // auslösen, obwohl wir gerade 5 Fehler gezählt haben).
  if (
    failureCount >= FAILURE_THRESHOLD &&
    Date.now() - lastFailureAt < CIRCUIT_OPEN_MS
  ) {
    return false;
  }
  // Half-open: Fenster abgelaufen, Breaker schließt beim nächsten
  // erfolgreichen Health-Check ODER generate(). Hier machen wir nur
  // die Vorbedingung klar; der eigentliche Reset passiert weiter unten.

  // Short-circuit: positiver Cache noch gültig → keine erneute Prüfung.
  if (Date.now() - availabilityCache.checkedAt < 60000)
    return availabilityCache.available;

  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    const { models = [] } = await res.json();
    const available = models.some((m) =>
      String(m.name || "").startsWith(OLLAMA_MODEL),
    );
    availabilityCache = { checkedAt: Date.now(), available };
    if (available) {
      // Erfolgreicher Probe nach abgelaufenem Open-Fenster: Breaker
      // schließen. WÄHREND des Akkumulationszeitraums (failureCount <
      // FAILURE_THRESHOLD) lassen wir den Counter stehen, damit ein
      // Probe direkt vor einem ausgefallenen generate() den Breaker
      // nicht heimlich entschärft.
      if (failureCount >= FAILURE_THRESHOLD) {
        failureCount = 0;
      }
    } else {
      // Ollama läuft, aber Modell fehlt → das ist ein Konfig-Fehler, kein
      // Backend-Ausfall. NICHT als Circuit-Failure zählen, sonst würde
      // der Breaker bei einem fehlenden `ollama pull` dauerhaft blockieren.
      console.error(
        `[pdfAnalysis] Ollama läuft, aber Modell "${OLLAMA_MODEL}" fehlt. ` +
          `Installieren mit: ollama pull ${OLLAMA_MODEL}`,
      );
    }
    return available;
  } catch {
    // Backend-Ausfall (Connection refused, Timeout, DNS, …) → Breaker
    // hochzählen. Nach FAILURE_THRESHOLD öffnet der Circuit.
    failureCount += 1;
    lastFailureAt = Date.now();
    availabilityCache = { checkedAt: Date.now(), available: false };
    if (failureCount === FAILURE_THRESHOLD) {
      console.error(
        `[pdfAnalysis] Circuit-Breaker geöffnet: ${failureCount} ` +
          `aufeinanderfolgende Ollama-Fehler. Health-Checks für ` +
          `${CIRCUIT_OPEN_MS / 1000}s pausiert.`,
      );
    }
    return false;
  }
}

/**
 * Setzt Circuit-Breaker UND Availability-Cache zurück.
 * Nur für Tests / manuelles Recovery — nicht in Produktionscode aufrufen.
 */
function reset() {
  failureCount = 0;
  lastFailureAt = 0;
  availabilityCache = { checkedAt: 0, available: false };
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
    const result = (data.response || "").trim() || null;
    // Erfolgreicher Generate-Call → Breaker schließen, auch wenn der
    // Health-Cache noch einen alten Fail-Cache hält. Sonst würde der
    // Breaker nur durch den 60s-Health-Cache entlastet.
    if (result !== null) {
      failureCount = 0;
      availabilityCache = { checkedAt: Date.now(), available: true };
    } else {
      // Leere Antwort von Ollama = soft failure. Zählt als Fehler, damit
      // ein hängendes Modell (z.B. OOM) den Breaker triggert, nicht aber
      // ein legasthenisches Modell, das zu Recht "nichts zu sagen" hat.
      // Kompromiss: NICHT zählen, weil leer != kaputt — User-Prompt-Fehler
      // würden sonst fälschlich den Circuit öffnen.
    }
    return result;
  } catch (e) {
    console.error(`[pdfAnalysis] LocalVision-Fehler: ${e.message}`);
    // Generate-Fehler = Backend-Problem → Breaker hochzählen UND
    // positiven Cache invalidieren, damit der nächste isAvailable()
    // nicht aus einem 60s-„alles ok“-Cache die falsche Antwort liefert.
    failureCount += 1;
    lastFailureAt = Date.now();
    availabilityCache = { checkedAt: 0, available: false };
    if (failureCount === FAILURE_THRESHOLD) {
      console.error(
        `[pdfAnalysis] Circuit-Breaker geöffnet: ${failureCount} ` +
          `aufeinanderfolgende Ollama-Fehler. Health-Checks für ` +
          `${CIRCUIT_OPEN_MS / 1000}s pausiert.`,
      );
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { generate, isAvailable, reset, OLLAMA_MODEL };
