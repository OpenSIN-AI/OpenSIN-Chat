// SPDX-License-Identifier: MIT
/**
 * ResearchAgent — delegierte Agenten für die Kreuz-Verifikation.
 *
 * Zwei Agententypen:
 *  1. compareAgainstSource: prüft Behauptungen gegen EINE gegebene Quelle
 *     → Urteil pro Behauptung: supports | contradicts | inconclusive,
 *       mit wörtlichem Beleg-Zitat aus der Quelle.
 *  2. deepWebResearch: autonome Web-Recherche — generiert Suchanfragen,
 *     holt Top-Treffer (Such-Provider per ENV: Serper oder SearchApi —
 *     dieselben Provider, die der Fork für Agent-Websuche nutzt),
 *     lädt vielversprechende Seiten und prüft die Behauptungen dagegen.
 */
const { chat, parseJson } = require("../llm");
const {
  loadSourceSafe,
  fetchWithLimits,
  htmlToText,
} = require("./sourceAdapters");

const RESULTS_PER_QUERY = Number(process.env.PDF_ANALYSIS_XCHECK_RESULTS || 4);
const QUERIES_PER_CLAIM = Number(process.env.PDF_ANALYSIS_XCHECK_QUERIES || 2);

const VERDICT_SYSTEM = `Du bist ein forensischer Verifikations-Agent. Du erhältst Behauptungen und den Text einer Vergleichsquelle.
Pruefe JEDE Behauptung NUR gegen den gegebenen Quelltext. Erfinde nichts.
Antworte ausschließlich mit validem JSON:
{
  "verdicts": [{
    "claimIndex": 0,
    "verdict": "supports" | "contradicts" | "inconclusive",
    "evidence": "wörtliches Kurz-Zitat aus der Quelle (leer wenn inconclusive)",
    "reasoning": "ein Satz Begründung"
  }]
}`;

async function judgeClaims(claims, sourceLabel, sourceText) {
  const userPrompt = [
    `Vergleichsquelle: ${sourceLabel}`,
    ``,
    `=== BEHAUPTUNGEN ===`,
    ...claims.map((c, i) => `[${i}] ${c}`),
    ``,
    `=== QUELLTEXT ===`,
    sourceText,
  ].join("\n");
  const raw = await chat(VERDICT_SYSTEM, userPrompt);
  let parsed;
  try {
    parsed = parseJson(raw);
  } catch {
    return claims.map((_, i) => ({
      claimIndex: i,
      verdict: "inconclusive",
      evidence: "",
      reasoning: "Antwort des Agenten nicht auswertbar.",
    }));
  }
  return (parsed.verdicts || []).map((v) => ({
    claimIndex: Number(v.claimIndex) || 0,
    verdict: ["supports", "contradicts", "inconclusive"].includes(v.verdict)
      ? v.verdict
      : "inconclusive",
    evidence: String(v.evidence || ""),
    reasoning: String(v.reasoning || ""),
  }));
}

/** Agent 1: Behauptungen gegen eine konkrete Quelle prüfen. */
async function compareAgainstSource(claims, source) {
  const loaded = await loadSourceSafe(source);
  if (loaded.error || !loaded.text)
    return {
      sourceLabel: loaded.label,
      error: loaded.error || "Quelle lieferte keinen Text.",
      verdicts: [],
    };
  const verdicts = await judgeClaims(claims, loaded.label, loaded.text);
  return { sourceLabel: loaded.label, error: null, verdicts };
}

/** Websuche über konfigurierten Provider (Serper bevorzugt, sonst SearchApi). */
async function webSearch(query) {
  if (process.env.SERPER_DEV_API_KEY) {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_DEV_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: RESULTS_PER_QUERY }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
    const json = await res.json();
    return (json.organic || []).map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet || "",
    }));
  }
  if (process.env.SEARCHAPI_API_KEY) {
    const params = new URLSearchParams({
      engine: "google",
      q: query,
      api_key: process.env.SEARCHAPI_API_KEY,
    });
    const res = await fetch(
      `https://www.searchapi.io/api/v1/search?${params}`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) throw new Error(`SearchApi HTTP ${res.status}`);
    const json = await res.json();
    return (json.organic_results || [])
      .slice(0, RESULTS_PER_QUERY)
      .map((r) => ({ title: r.title, url: r.link, snippet: r.snippet || "" }));
  }
  throw new Error(
    "Kein Such-Provider konfiguriert (SERPER_DEV_API_KEY oder SEARCHAPI_API_KEY setzen).",
  );
}

const QUERY_SYSTEM = `Du formulierst präzise Web-Suchanfragen, um eine Behauptung unabhängig zu verifizieren.
Antworte ausschließlich mit validem JSON: { "queries": ["...", "..."] }`;

/** Agent 2: autonome Deep-Web-Recherche für eine einzelne Behauptung. */
async function deepWebResearch(claim) {
  // 1. Suchanfragen generieren
  let queries = [claim.slice(0, 120)];
  try {
    const raw = await chat(
      QUERY_SYSTEM,
      `Behauptung: ${claim}\nGeneriere ${QUERIES_PER_CLAIM} unterschiedliche Suchanfragen (verschiedene Blickwinkel, ggf. Englisch UND Deutsch).`,
    );
    const parsed = parseJson(raw);
    if (Array.isArray(parsed.queries) && parsed.queries.length)
      queries = parsed.queries.slice(0, QUERIES_PER_CLAIM);
  } catch {
    /* Fallback-Query bleibt */
  }

  // 2. Suchen + deduplizieren
  const seen = new Set();
  const hits = [];
  for (const q of queries) {
    try {
      for (const hit of await webSearch(q)) {
        if (!hit.url || seen.has(hit.url)) continue;
        seen.add(hit.url);
        hits.push(hit);
      }
    } catch (e) {
      if (hits.length === 0 && q === queries[queries.length - 1]) throw e;
    }
  }

  // 3. Top-Seiten laden und Behauptung dagegen prüfen (parallel)
  const evaluations = await Promise.all(
    hits.slice(0, RESULTS_PER_QUERY * QUERIES_PER_CLAIM).map(async (hit) => {
      try {
        const html = await fetchWithLimits(hit.url);
        const text = htmlToText(html).slice(0, 30000);
        if (!text) throw new Error("leer");
        const [verdict] = await judgeClaims([claim], hit.url, text);
        return { ...hit, ...verdict };
      } catch {
        // Seite nicht ladbar → nur Snippet-basiert bewerten
        const [verdict] = await judgeClaims(
          [claim],
          hit.url,
          `${hit.title}\n${hit.snippet}`,
        );
        return { ...hit, ...verdict, snippetOnly: true };
      }
    }),
  );

  const supports = evaluations.filter((e) => e.verdict === "supports");
  const contradicts = evaluations.filter((e) => e.verdict === "contradicts");
  return {
    claim,
    queries,
    sourcesChecked: evaluations.length,
    supports: supports.length,
    contradicts: contradicts.length,
    overall:
      supports.length > contradicts.length && supports.length > 0
        ? "supports"
        : contradicts.length > supports.length
          ? "contradicts"
          : "inconclusive",
    evidence: evaluations
      .filter((e) => e.verdict !== "inconclusive")
      .map((e) => ({
        url: e.url,
        title: e.title,
        verdict: e.verdict,
        quote: e.evidence,
        reasoning: e.reasoning,
        snippetOnly: !!e.snippetOnly,
      })),
  };
}

module.exports = { compareAgainstSource, deepWebResearch };
