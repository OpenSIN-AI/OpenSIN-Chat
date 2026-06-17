# ResearchAgent

**Purpose:** Delegierte Agenten für die Kreuz-Verifikation.

## Was diese Datei tut

Zwei Agententypen:

**1. `compareAgainstSource(claims, source)`** — prüft Behauptungen gegen
EINE gegebene Quelle:

- Lädt die Quelle via `loadSourceSafe()`.
- `judgeClaims()`: LLM erhält Behauptungen + Quelltext, liefert pro
  Behauptung ein Urteil: `supports` | `contradicts` | `inconclusive`,
  mit wörtlichem Beleg-Zitat und Begründung.
- Bei nicht parsebarer LLM-Antwort: alle Claims → `inconclusive`.

**2. `deepWebResearch(claim)`** — autonome Web-Recherche für eine
einzelne Behauptung:

1. **Suchanfragen generieren**: LLM formuliert `QUERIES_PER_CLAIM`
   unterschiedliche Suchanfragen (verschiedene Blickwinkel, ggf.
   Deutsch + Englisch). Fallback: Claim-Text gekürzt.
2. **Suchen + deduplizieren**: `webSearch()` via Serper (bevorzugt)
   oder SearchApi. Results pro Query: `RESULTS_PER_QUERY`.
3. **Top-Seiten laden und prüfen** (parallel via `Promise.all`):
   HTML → Text → `judgeClaims([claim], url, text)`. Bei nicht ladbarer
   Seite: Snippet-basierte Bewertung (`snippetOnly: true`).
4. **Aggregation**: `supports`/`contradicts`-Counts, `overall`-Urteil
   (supports wenn mehr supports als contradicts und > 0, sonst
   contradicts oder inconclusive), `evidence`-Array mit URLs/Zitaten.

`webSearch()` benötigt `SERPER_DEV_API_KEY` oder `SEARCHAPI_API_KEY`.

## Abhängigkeiten

- `../llm` — `chat()`, `parseJson()`
- `./sourceAdapters` — `loadSourceSafe()`, `fetchWithLimits()`, `htmlToText()`

## ENV

| ENV                              | Default | Bedeutung                                    |
|----------------------------------|---------|----------------------------------------------|
| `PDF_ANALYSIS_XCHECK_RESULTS`    | 4       | Suchergebnisse pro Query                      |
| `PDF_ANALYSIS_XCHECK_QUERIES`    | 2       | Suchanfragen pro Claim                        |
| `SERPER_DEV_API_KEY`             | (leer)  | Serper.dev API-Key (bevorzugter Such-Provider)|
| `SEARCHAPI_API_KEY`              | (leer)  | SearchApi.io API-Key (Fallback)               |

## Caveats

- Wenn weder `SERPER_DEV_API_KEY` noch `SEARCHAPI_API_KEY` gesetzt ist,
  wirft `webSearch()` einen Error — Deep-Web-Recherche nicht möglich.
- `judgeClaims` validiert das `verdict`-Feld gegen eine Whitelist
  (`supports`, `contradicts`, `inconclusive`) — ungültige Werte →
  `inconclusive`.
- Deep-Web-Seiten werden auf 30000 Zeichen gekürzt (`text.slice(0, 30000)`).
- `deepWebResearch` wirft nur, wenn ALLE Queries fehlschlagen und keine
  einzigen Hits vorliegen. Einzelne Query-Fehler werden toleriert.
- `overall` ist ein heuristisches Mehrheitsvotum, keine statistische
  Garantie — bei `supports.length === contradicts.length` → `inconclusive`.
