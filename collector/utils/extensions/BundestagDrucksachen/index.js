// SPDX-License-Identifier: MIT
/**
 * OpenSIN Chat — Bundestag-Drucksachen Connector
 *
 * Importiert Drucksachen, Plenarprotokolle und Anträge aus dem offiziellen
 * DIP-Open-Data-Portal des Deutschen Bundestages:
 *   https://search.dip.bundestag.de/api/v1/
 *
 * Kein Telemetrie-Outbound — nur direkter Zugriff auf die öffentliche
 * Bundestag-OpenData-API. Keine Authentifizierung erforderlich.
 *
 * API-Dokumentation:
 *   https://search.dip.bundestag.de/api/v1/help
 *
 * Verwendungsbeispiel:
 *   const { bundestagDrucksache, bundestagSearch } = require("./BundestagDrucksachen");
 *   // Eine bestimmte Drucksache (z.B. 20/12345) importieren
 *   await bundestagDrucksache({ drucksache: "20/12345" });
 *   // Volltextsuche nach einem Thema (z.B. "Energiewende"), neueste 20
 *   await bundestagSearch({ q: "Energiewende", limit: 20 });
 *   // Wahlperiode filtern (20 = aktuelle 2021-2025, 21 = 2025-)
 *   await bundestagSearch({ q: "Migration", wahlperiode: 20, limit: 10 });
 */

const { v4 } = require("uuid");
const { writeToServerDocuments, documentsFolder } = require("../../files");
const { tokenizeString } = require("../../tokenizer");
const { default: slugify } = require("slugify");
const path = require("path");
const fs = require("fs");

// DIP-API Basis-URL
const DIP_API_BASE = "https://search.dip.bundestag.de/api/v1";

// API-Key: ab 2024 erforderlich. Ohne Key ist die API gesperrt (HTTP 401).
// User können einen kostenlosen API-Key beantragen unter
//   https://dip.bundestag.de/über-dip/hilfe/api
// Setze den Key in der .env als BUNDESTAG_DIP_API_KEY, oder übergebe ihn
// per `apiKey`-Parameter an die jeweilige Funktion.
const DIP_API_KEY = process.env.BUNDESTAG_DIP_API_KEY || null;
const DIP_MAX_RETRIES = 3;
const DIP_MAX_PAGES = 100;

/**
 * DIP-Aktivitäts-IDs, die wir unterstützen:
 *   - 100  → Drucksache
 *   - 120  → Plenarprotokoll
 *   - 150  → Antrag
 *   - 130  → Kleine Anfrage
 *   - 140  → Große Anfrage
 */
const SUPPORTED_ACTIVITIES = {
  100: "Drucksache",
  120: "Plenarprotokoll",
  150: "Antrag",
  130: "Kleine Anfrage",
  140: "Große Anfrage",
};

/**
 * Baut die Anfrage-URL für die DIP-API.
 * @param {object} params
 * @param {string} [params.endpoint="search"] - "search" | "drucksache" | "plenarprotokoll" | "vorgang"
 * @param {string} [params.q] - Volltextsuche
 * @param {number} [params.wahlperiode] - 20 für 2021-2025, 21 für 2025-
 * @param {number} [params.limit=20] - max. Ergebnisse
 * @param {string} [params.drucksache] - z.B. "20/12345"
 * @param {string} [params.vorgangId] - UUID eines Vorgangs
 * @param {string} [params.cursor] - Pagination-Cursor
 */
function buildDIPUrl(params = {}) {
  const {
    endpoint = "search",
    q,
    wahlperiode,
    limit = 20,
    drucksache,
    vorgangId,
    cursor,
  } = params;

  // Wenn eine spezifische Drucksache angefragt ist, erzwinge endpoint=drucksache
  let effectiveEndpoint = endpoint;
  if (drucksache) effectiveEndpoint = "drucksache";
  if (vorgangId) effectiveEndpoint = `vorgang/${encodeURIComponent(vorgangId)}`;

  const u = new URL(`${DIP_API_BASE}/${effectiveEndpoint}`);
  u.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 100)));
  if (q) u.searchParams.set("q", q);
  if (wahlperiode) u.searchParams.set("f.wahlperiode", String(wahlperiode));
  if (cursor) u.searchParams.set("cursor", cursor);
  if (drucksache) {
    // Format "20/12345" → 20 = Wahlperiode, 12345 = Nummer
    const m = String(drucksache).match(/^(\d+)\/(\d+)$/);
    if (m) {
      u.searchParams.set("f.wahlperiode", m[1]);
      u.searchParams.set("f.nummer", m[2]);
    }
  }
  return u.toString();
}

/**
 * Führt einen API-Aufruf gegen die DIP-API aus.
 * @param {string} url
 * @param {string} [apiKey] - optional, sonst process.env.BUNDESTAG_DIP_API_KEY
 * @returns {Promise<object>}
 */
async function dipFetch(url, apiKey, retries = 0) {
  const key = apiKey || DIP_API_KEY;
  if (!key) {
    throw new Error(
      "DIP-API benötigt einen API-Key. Beantrage einen kostenlosen Key unter " +
        "https://dip.bundestag.de/über-dip/hilfe/api und setze ihn als " +
        "BUNDESTAG_DIP_API_KEY in der .env oder übergebe ihn als Parameter."
    );
  }
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 30_000);
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "OpenSIN-Chat/0.1 (+https://sinchat.delqhi.com)",
      Authorization: `apikey ${key}`,
    },
    signal: abortController.signal,
  }).finally(() => clearTimeout(timeout));

  if (res.status === 429 && retries < DIP_MAX_RETRIES) {
    const retryAfter = Number(res.headers.get("retry-after")) || 60;
    // eslint-disable-next-line no-console
    console.warn(
      `DIP-API rate limit (429) for ${url}. Waiting ${retryAfter}s before retry ${
        retries + 1
      }/${DIP_MAX_RETRIES}…`
    );
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return dipFetch(url, apiKey, retries + 1);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `DIP-API ${res.status} ${res.statusText} for ${url}\n${body.slice(
        0,
        500
      )}`
    );
  }
  try {
    return await res.json();
  } catch {
    throw new Error(`DIP-API returned invalid JSON for ${url}`);
  }
}

/**
 * Konvertiert eine DIP-Drucksache in ein Dokument, das in OpenSIN Chat
 * gespeichert und indiziert werden kann.
 * @param {object} doc - DIP-Drucksache-JSON
 * @param {string} outFolderPath - Zielordner
 * @returns {object} - das gespeicherte Dokument
 */
function persistDIPDocument(doc, outFolderPath) {
  const meta = doc.meta || {};
  const fundstelle = (meta.fundstelle && meta.fundstelle[0]) || {};
  const drucksachetyp = SUPPORTED_ACTIVITIES[meta.aktivitaet_id] || "Dokument";

  // Dokumenten-ID: "20/12345" oder "vorgang-<uuid>"
  const idStr = fundstelle.dokumentnummer || `vorgang-${doc.id}`;
  const wahlperiode = fundstelle.wahlperiode || meta.wahlperiode || "?";
  const titel = (doc.titel || doc.kurztitle || idStr).trim();

  // Volltext-Inhalt
  const text = doc.text || doc.zusammenfassung || doc.kurztitle || "";
  const fonds = (doc.fundstelle_list || [])
    .map((f) => `[${f.fundstelle_typ || ""}] ${f.fundstelle_name || ""}`)
    .join("\n");

  const fullContent = [
    `# ${titel}`,
    "",
    `**Dokumenttyp:** ${drucksachetyp}`,
    `**Dokumentnummer:** ${idStr}`,
    `**Wahlperiode:** ${wahlperiode}`,
    fundstelle.datum
      ? `**Datum:** ${new Date(fundstelle.datum).toLocaleDateString("de-DE")}`
      : null,
    `**Herausgeber:** Deutscher Bundestag`,
    `**Open-Data-Quelle:** ${DIP_API_BASE}`,
    Array.isArray(doc.urheber) && doc.urheber.length
      ? `**Urheber:** ${doc.urheber.join(", ")}`
      : null,
    fonds ? `**Fundstellen:**\n${fonds}` : null,
    "",
    "---",
    "",
    text,
  ]
    .filter(Boolean)
    .join("\n");

  const data = {
    id: v4(),
    url: `file://bundestag-${slugify(idStr)}.md`,
    title: `${idStr} – ${titel}`.slice(0, 200),
    docAuthor:
      Array.isArray(doc.urheber) && doc.urheber.length
        ? doc.urheber.join(", ")
        : "Deutscher Bundestag",
    description: doc.zusammenfassung || titel,
    docSource: `Bundestag DIP (${drucksachetyp})`,
    chunkSource: `bundestag://${idStr}`,
    published: new Date().toLocaleString("de-DE"),
    wordCount: fullContent.split(/\s+/).filter(Boolean).length,
    pageContent: fullContent,
    token_count_estimate: tokenizeString(fullContent),
  };

  writeToServerDocuments({
    data,
    filename: data.title,
    destinationOverride: outFolderPath,
  });
  return data;
}

/**
 * Importiert eine einzelne Bundestags-Drucksache anhand ihrer Dokumentnummer
 * (z.B. "20/12345"). Lädt sie aus der DIP-API, persistiert sie im
 * Storage-Ordner und gibt das gespeicherte Dokument zurück.
 *
 * @param {object} params
 * @param {string} params.drucksache - Dokumentnummer, z.B. "20/12345"
 * @returns {Promise<object[]>} - Array mit einem gespeicherten Dokument
 */
async function bundestagDrucksache(params = {}) {
  if (!params.drucksache) {
    throw new Error(
      "bundestagDrucksache: 'drucksache' parameter required, e.g. '20/12345'"
    );
  }
  const url = buildDIPUrl({ endpoint: "drucksache", ...params });
  const outFolder = path.resolve(
    documentsFolder,
    `bundestag-${slugify(params.drucksache)}`
  );
  if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder, { recursive: true });

  const data = await dipFetch(url, params.apiKey);
  const docs = Array.isArray(data.documents) ? data.documents : [];
  if (!docs.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `bundestagDrucksache: DIP-API lieferte 0 Dokumente für ${params.drucksache}`
    );
    return [];
  }
  return docs.map((d) => persistDIPDocument(d, outFolder));
}

/**
 * Volltextsuche in der DIP-API. Importiert die ersten `limit` Treffer.
 *
 * @param {object} params
 * @param {string} params.q - Suchbegriff
 * @param {number} [params.wahlperiode] - 20 = 2021-2025, 21 = 2025-
 * @param {number} [params.limit=20]
 * @param {string} [params.endpoint="search"] - search | drucksache | plenarprotokoll
 * @returns {Promise<object[]>} - Array gespeicherter Dokumente
 */
async function bundestagSearch(params = {}) {
  if (!params.q) {
    throw new Error("bundestagSearch: 'q' parameter required");
  }
  const { q, wahlperiode, limit = 20, endpoint = "search" } = params;
  const outFolder = path.resolve(
    documentsFolder,
    `bundestag-search-${slugify(q).slice(0, 30)}-${v4().slice(0, 4)}`
  );
  if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder, { recursive: true });

  const allDocs = [];
  let cursor = null;
  let pagesFetched = 0;
  const perPage = Math.min(Math.max(limit, 1), 100);

  do {
    const url = buildDIPUrl({
      endpoint,
      q,
      wahlperiode,
      limit: perPage,
      cursor,
    });
    const data = await dipFetch(url, params.apiKey);
    const docs = Array.isArray(data.documents) ? data.documents : [];
    if (!docs.length) {
      if (pagesFetched === 0) {
        // eslint-disable-next-line no-console
        console.warn(`bundestagSearch: DIP-API lieferte 0 Treffer für "${q}"`);
      }
      break;
    }

    // eslint-disable-next-line no-console
    console.log(
      `bundestagSearch: Seite ${pagesFetched + 1} — ${
        docs.length
      } Treffer (gesamt: ${allDocs.length + docs.length})`
    );

    for (const d of docs) {
      try {
        allDocs.push(persistDIPDocument(d, outFolder));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          `bundestagSearch: Fehler beim Persistieren eines Dokuments:`,
          err.message
        );
      }
    }

    if (allDocs.length >= limit) break;

    cursor = data.cursor || null;
    pagesFetched++;
  } while (cursor && pagesFetched < DIP_MAX_PAGES);

  // eslint-disable-next-line no-console
  console.log(
    `bundestagSearch: ${allDocs.length} Treffer für "${q}" importiert (${pagesFetched} Seiten).`
  );
  return allDocs;
}

/**
 * Convenience-Funktion: Importiert die neuesten N Drucksachen einer Wahlperiode
 * (Standard: aktuelle Wahlperiode 20).
 *
 * @param {object} [params]
 * @param {number} [params.wahlperiode=20]
 * @param {number} [params.limit=20]
 * @returns {Promise<object[]>}
 */
async function bundestagLatest({ wahlperiode = 20, limit = 20 } = {}) {
  return bundestagSearch({
    q: "*", // Wildcard-Suche
    endpoint: "drucksache",
    wahlperiode,
    limit,
  });
}

module.exports = {
  bundestagDrucksache,
  bundestagSearch,
  bundestagLatest,
  buildDIPUrl,
  dipFetch,
  DIP_API_BASE,
  SUPPORTED_ACTIVITIES,
};
