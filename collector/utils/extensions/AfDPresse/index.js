// SPDX-License-Identifier: MIT
/**
 * OpenAfD Chat — AfD-Pressemitteilungs-Importer
 *
 * Importiert Pressemitteilungen von afd.de (Parteibundesebene) und/oder
 * konfigurierbaren Fraktions-/Landesverbands-Seiten.
 *
 * Quelle: https://www.afd.de/presse/pressemitteilungen/ (HTML-Liste mit
 * Detail-Links zu einzelnen Pressemitteilungen).
 *
 * DSGVO-/Hinweis: Wir scrapen ausschließlich öffentliche Pressemitteilungen
 * der offiziellen Partei-Seite. Kein Login, keine Paywalls, keine
 * personenbezogenen Daten, kein Tracking.
 *
 * Verwendungsbeispiel:
 *   const { afdPresseLatest, afdPresseFromUrl } = require("./AfDPresse");
 *   // Neueste 20 Pressemitteilungen von afd.de
 *   await afdPresseLatest({ limit: 20 });
 *   // Bestimmte Seite importieren
 *   await afdPresseFromUrl({ url: "https://www.afd.de/..." });
 */

const { v4 } = require("uuid");
const { writeToServerDocuments, documentsFolder } = require("../../files");
const { tokenizeString } = require("../../tokenizer");
const { default: slugify } = require("slugify");
const path = require("path");
const fs = require("fs");

// Standard-URL für AfD-Pressemitteilungen
const AFD_PRESS_BASE = "https://www.afd.de/presse/pressemitteilungen/";

/**
 * HTTP-Fetch mit angepasstem User-Agent (kein Bot-Blocker).
 * @param {string} url
 * @returns {Promise<string>} - HTML-Text
 */
async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; OpenAfD-Chat/0.1; +https://openafd.delqhi.com)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `afd.de ${res.status} ${res.statusText} for ${url}\n${body.slice(0, 500)}`
    );
  }
  return res.text();
}

/**
 * Sehr leichte HTML-Parser-Hilfe: extrahiert Links und Titel aus einer
 * Pressemitteilungs-Listen-Seite. Verwendet regex, weil wir keine
 * schwergewichtige HTML-Parser-Library wollen.
 *
 * @param {string} html
 * @returns {{title: string, url: string, date: string|null}[]}
 */
function extractPressLinksFromList(html) {
  const results = [];
  // Suche nach <a ... href="...">TITEL</a> innerhalb typischer Presselisten-Container
  // AfD-Theme: WordPress, daher sehen Links so aus:
  //   <h2 class="entry-title"><a href="...">TITEL</a></h2>
  //   <time class="entry-date" datetime="2024-...">Datum</time>
  const linkRe =
    /<h\d[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/h\d>/gi;
  let match;
  while ((match = linkRe.exec(html)) !== null) {
    const url = match[1].trim();
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    // Suche nach dem zugehörigen Datum im umliegenden Kontext
    const ctxStart = Math.max(0, match.index - 1500);
    const ctxEnd = Math.min(html.length, match.index + 200);
    const ctx = html.slice(ctxStart, ctxEnd);
    const dateMatch = ctx.match(/datetime="([^"]+)"/i);
    const date = dateMatch ? dateMatch[1] : null;
    if (url && title) results.push({ title, url, date });
  }
  // Fallback: einfachere Suche, falls das Theme anders strukturiert ist
  if (results.length === 0) {
    const simpleRe = /<a\s+href="(https?:\/\/(?:www\.)?afd\.de\/[^"]+presse[^"]*|[^"]+\/presse[^"]*\/[^"]+)"[^>]*>([^<]{10,200})<\/a>/gi;
    while ((match = simpleRe.exec(html)) !== null) {
      results.push({
        url: match[1].trim(),
        title: match[2].trim(),
        date: null,
      });
    }
  }
  return results;
}

/**
 * Extrahiert Hauptinhalt (article body) und Titel einer Pressemitteilungs-Detailseite.
 * @param {string} html
 * @returns {{title: string, content: string, date: string|null, author: string|null}}
 */
function extractPressArticle(html) {
  // Titel
  let title = "";
  const titleRe = /<h\d[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h\d>/i;
  const tm = html.match(titleRe);
  if (tm) title = tm[1].replace(/<[^>]+>/g, "").trim();

  // Inhalt — WordPress-typisch: <div class="entry-content"> ... </div>
  let content = "";
  const contentRe = /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
  const cm = html.match(contentRe);
  if (cm) {
    content = cm[1]
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } else {
    // Fallback: alles zwischen <article> ... </article>
    const artRe = /<article[^>]*>([\s\S]*?)<\/article>/i;
    const am = html.match(artRe);
    if (am) {
      content = am[1]
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
  }

  // Datum
  let date = null;
  const dateRe = /<time[^>]*datetime="([^"]+)"/i;
  const dm = html.match(dateRe);
  if (dm) date = dm[1];

  // Autor
  let author = null;
  const authorRe = /<a[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/a>|<span[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/span>/i;
  const am2 = html.match(authorRe);
  if (am2) author = (am2[1] || am2[2] || "").trim();

  if (!title && content) {
    // Versuche, erste Zeile als Titel zu verwenden
    title = content.split("\n").find((l) => l.trim().length > 10) || "AfD Pressemitteilung";
  }

  return { title, content, date, author };
}

/**
 * Lädt eine einzelne Pressemitteilung von einer Detail-URL und persistiert sie.
 * @param {string} url
 * @param {string} outFolderPath
 * @returns {Promise<object|null>}
 */
async function importSinglePress(url, outFolderPath) {
  try {
    const html = await fetchHtml(url);
    const { title, content, date, author } = extractPressArticle(html);
    if (!content) {
      // eslint-disable-next-line no-console
      console.warn(`afdPresse: kein Inhalt extrahiert für ${url}`);
      return null;
    }
    const published = date
      ? new Date(date).toLocaleString("de-DE")
      : new Date().toLocaleString("de-DE");
    const slug = slugify(title || "pressemitteilung").slice(0, 60);
    const fullContent = [
      `# ${title || "AfD Pressemitteilung"}`,
      "",
      `**Quelle:** ${url}`,
      `**Herausgeber:** AfD ${author ? `· ${author}` : ""}`.trim(),
      `**Datum:** ${published}`,
      "",
      "---",
      "",
      content,
    ].join("\n");

    const data = {
      id: v4(),
      url: `file://afd-presse-${slug}.md`,
      title: (title || "AfD Pressemitteilung").slice(0, 200),
      docAuthor: author || "AfD",
      description: content.slice(0, 200).replace(/\s+/g, " "),
      docSource: "AfD Pressemitteilung (afd.de)",
      chunkSource: `afd-presse://${url}`,
      published,
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
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`afdPresse: Fehler bei ${url}`, err.message);
    return null;
  }
}

/**
 * Importiert die neuesten Pressemitteilungen von afd.de.
 * @param {object} [params]
 * @param {number} [params.limit=20]
 * @param {string} [params.baseUrl=AFD_PRESS_BASE]
 * @returns {Promise<object[]>} - Array der gespeicherten Dokumente
 */
async function afdPresseLatest({ limit = 20, baseUrl = AFD_PRESS_BASE } = {}) {
  // eslint-disable-next-line no-console
  console.log(`afdPresseLatest: Lade Presseliste von ${baseUrl} …`);
  const listHtml = await fetchHtml(baseUrl);
  const links = extractPressLinksFromList(listHtml);
  // eslint-disable-next-line no-console
  console.log(`afdPresseLatest: ${links.length} Pressemitteilungen gefunden.`);

  if (!links.length) {
    // eslint-disable-next-line no-console
    console.warn(
      "afdPresseLatest: 0 Links gefunden. Hat sich das HTML-Format der Seite geändert?"
    );
    return [];
  }
  const selected = links.slice(0, Math.max(1, Math.min(limit, 50)));
  const outFolder = path.resolve(
    documentsFolder,
    `afd-presse-${v4().slice(0, 4)}`
  );
  if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder, { recursive: true });

  const results = [];
  for (let i = 0; i < selected.length; i++) {
    const link = selected[i];
    // eslint-disable-next-line no-console
    console.log(
      `afdPresseLatest: ${i + 1}/${selected.length} — ${link.title.slice(0, 80)}`
    );
    const doc = await importSinglePress(link.url, outFolder);
    if (doc) results.push(doc);
    // Schonender Delay, damit wir afd.de nicht überlasten
    await new Promise((r) => setTimeout(r, 500));
  }
  // eslint-disable-next-line no-console
  console.log(
    `afdPresseLatest: ${results.length}/${selected.length} Pressemitteilungen importiert.`
  );
  return results;
}

/**
 * Importiert eine einzelne Pressemitteilung von einer gegebenen URL.
 * @param {object} params
 * @param {string} params.url
 * @returns {Promise<object|null>}
 */
async function afdPresseFromUrl({ url } = {}) {
  if (!url) throw new Error("afdPresseFromUrl: 'url' parameter required");
  if (!/^https?:\/\/(www\.)?afd\.de\//i.test(url)) {
    throw new Error(
      "afdPresseFromUrl: URL muss auf afd.de zeigen (Sicherheits-Check)"
    );
  }
  const outFolder = path.resolve(documentsFolder, `afd-presse-${v4().slice(0, 4)}`);
  if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder, { recursive: true });
  return importSinglePress(url, outFolder);
}

module.exports = {
  afdPresseLatest,
  afdPresseFromUrl,
  AFD_PRESS_BASE,
};
