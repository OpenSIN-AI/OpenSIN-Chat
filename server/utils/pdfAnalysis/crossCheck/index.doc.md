# CrossCheckPipeline

**Purpose:** Orchestriert die Kreuz-Verifikation von Behauptungen gegen Vergleichsquellen und Deep-Web-Recherche.

## Was diese Datei tut

Eingabe: Behauptungen (direkt, aus gespeicherten Fakten via `factIds`,
oder automatisch aus einem abgeschlossenen Analyse-Job) + optionale
Vergleichsquellen (`pdf`/`url`/`youtube`/`text`/`image`/`video`) +
optional Deep-Web-Recherche.

**Pipeline:**

1. Aufgabenplan: pro Quelle ein Vergleichs-Task (alle Claims gebündelt),
   plus pro Claim ein Deep-Web-Task — alles als Chunks für den AgentPool.
2. Delegation an `runPool` mit AIMD-Regelung: pro (Behauptung × Quelle)
   bzw. pro Behauptung (Web) arbeiten eigenständige Recherche-Agenten
   parallel.
3. Urteile pro Behauptung aggregieren: `sourceVerdicts` (supports/
   contradicts/inconclusive) + `webResearch` (overall, evidence).
4. Konsolidierter Verifikationsbericht (Markdown) via LLM.
5. Urteile an betroffene Fakten im FactStore zurückschreiben
   (`updateCrossCheck`).

Persistenz analog zu JobStore: atomare JSON-Snapshots in
`jobs-crosscheck/`. Unterbrochene `running`-Jobs werden beim Restore
als `failed` markiert (Web-Zwischenstände sind nicht checkpointfähig).

## Abhängigkeiten

- `fs`, `path`
- `uuid` — `v4()` (Job-IDs)
- `../../paths` — `getStoragePath()`
- `../agentPool` — `runPool()` (mit AIMD)
- `../llm` — `chat()` (für konsolidierten Bericht)
- `./researchAgent` — `compareAgainstSource()`, `deepWebResearch()`

## ENV

| ENV                              | Default | Bedeutung                                     |
|----------------------------------|---------|-----------------------------------------------|
| `PDF_ANALYSIS_XCHECK_CONCURRENCY`| 4       | Max. parallele CrossCheck-Tasks (via AgentPool) |

## Caveats

- Web-Recherche-Zwischenstände sind NICHT checkpointfähig — ein
  Server-Neustart unterbricht die Verifikation. `restorePersisted()`
  markiert solche Jobs als `failed` mit klarem Hinweis.
- `persistXJob` speichert nur serialisierbare Felder (`reportFile`,
  `factsUpdated`, `perClaim` — nicht das vollständige Result-Objekt).
- Berichte werden in `reports/crosscheck/{jobId}.md` geschrieben.
- `cancel(jobId)` setzt nur `job.cancelled = true` — der AgentPool
  bricht die aktuelle Welle beim nächsten Synchronisationspunkt ab.
- `getResult` liest den Report aus der Datei, nicht aus dem In-Memory-Job
  (Reports können groß sein).
