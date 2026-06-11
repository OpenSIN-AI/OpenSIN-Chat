// SPDX-License-Identifier: MIT
/**
 * SourceAdapters — normalisiert beliebige Vergleichsquellen zu Text.
 *
 * Unterstützte Quelltypen:
 *  - { type: "pdf",  path }      lokale PDF (über PdfReader, gestreamt)
 *  - { type: "url",  url }       Webseite (fetch + HTML→Text)
 *  - { type: "youtube", url }    YouTube-Video (Transkript)
 *  - { type: "text", text }      Roh-Text (z.B. aus Zwischenablage)
 *
 * SSRF-Schutz für URLs: nur http/https, keine privaten/lokalen IP-Bereiche,
 * Redirect-Ziele werden erneut geprüft, Antwortgröße ist begrenzt.
 */
const dns = require("dns").promises;
const net = require("net");
const { PdfReader } = require("../pdfReader");
const { validatePdfPath } = require("../security");

const MAX_FETCH_BYTES = Number(
  process.env.PDF_ANALYSIS_XCHECK_MAX_FETCH_BYTES || 5 * 1024 * 1024
);
const FETCH_TIMEOUT_MS = Number(
  process.env.PDF_ANALYSIS_XCHECK_FETCH_TIMEOUT_MS || 20000
);
const MAX_SOURCE_CHARS = Number(
  process.env.PDF_ANALYSIS_XCHECK_MAX_SOURCE_CHARS || 60000
);

function isPrivateIp(ip) {
  if (net.isIPv6(ip))
    return /^(::1|fc|fd|fe80)/i.test(ip) || ip === "::";
  const parts = ip.split(".").map(Number);
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    parts[0] === 0 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 169 && parts[1] === 254)
  );
}

async function assertSafeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Ungültige URL: ${rawUrl}`);
  }
  if (!["http:", "https:"].includes(parsed.protocol))
    throw new Error("Nur http/https-URLs sind erlaubt.");
  const { address } = await dns.lookup(parsed.hostname);
  if (isPrivateIp(address))
    throw new Error("Zugriff auf private/lokale Adressen ist nicht erlaubt.");
  return parsed;
}

async function fetchWithLimits(url) {
  await assertSafeUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: { "User-Agent": "OpenSIN-CrossCheck/1.0" },
    });
    // Redirects manuell folgen, Ziel erneut SSRF-prüfen
    if ([301, 302, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Redirect ohne Ziel.");
      return fetchWithLimits(new URL(loc, url).toString());
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} für ${url}`);
    const reader = res.body.getReader();
    const parts = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_FETCH_BYTES) {
        controller.abort();
        break; // Limit erreicht — mit dem bisher Gelesenen arbeiten
      }
      parts.push(Buffer.from(value));
    }
    return Buffer.concat(parts).toString("utf8");
  } finally {
    clearTimeout(timer);
  }
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractYoutubeId(url) {
  const m = String(url).match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/
  );
  return m ? m[1] : null;
}

/** YouTube-Transkript über die timedtext-API (ohne API-Key). */
async function youtubeTranscript(url) {
  const videoId = extractYoutubeId(url);
  if (!videoId) throw new Error(`Keine YouTube-Video-ID erkennbar: ${url}`);
  const watchHtml = await fetchWithLimits(
    `https://www.youtube.com/watch?v=${videoId}`
  );
  const m = watchHtml.match(/"captionTracks":(\[.*?\])/);
  if (!m)
    throw new Error(
      "Kein Transkript für dieses Video verfügbar (keine Untertitel)."
    );
  const tracks = JSON.parse(m[1]);
  const track =
    tracks.find((t) => /^(de|en)/.test(t.languageCode)) || tracks[0];
  const xml = await fetchWithLimits(track.baseUrl);
  const text = xml
    .replace(/<text[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;#39;/g, "'")
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
  return { text, title: `YouTube ${videoId} (${track.languageCode})` };
}

/**
 * Lädt eine Quelle und liefert { label, text } (auf MAX_SOURCE_CHARS gekürzt).
 */
async function loadSource(source) {
  switch (source.type) {
    case "text": {
      if (!source.text) throw new Error("Quelltyp 'text' benötigt 'text'.");
      return { label: source.label || "Roh-Text", text: source.text };
    }
    case "pdf": {
      const safePath = validatePdfPath(source.path);
      const reader = new PdfReader(safePath);
      try {
        const total = await reader.open();
        // Für Kreuz-Checks reichen die ersten N Seiten bzw. MAX_SOURCE_CHARS
        let text = "";
        for (let p = 1; p <= total && text.length < MAX_SOURCE_CHARS; p++) {
          text += `\n--- [Seite ${p}] ---\n` + (await reader.pageText(p));
        }
        return { label: `PDF: ${safePath.split("/").pop()}`, text };
      } finally {
        await reader.close();
      }
    }
    case "youtube": {
      const { text, title } = await youtubeTranscript(source.url);
      return { label: title, text };
    }
    case "url": {
      const html = await fetchWithLimits(source.url);
      return { label: source.url, text: htmlToText(html) };
    }
    default:
      throw new Error(`Unbekannter Quelltyp: ${source.type}`);
  }
}

async function loadSourceSafe(source) {
  try {
    const { label, text } = await loadSource(source);
    return {
      label,
      text: text.slice(0, MAX_SOURCE_CHARS),
      error: null,
      source,
    };
  } catch (e) {
    return {
      label: source.url || source.path || "Quelle",
      text: "",
      error: e.message,
      source,
    };
  }
}

module.exports = { loadSourceSafe, fetchWithLimits, htmlToText };
