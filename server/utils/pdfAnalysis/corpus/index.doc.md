# CorpusPipeline

**Purpose:** Analysiert 2+ PDFs in einem Job und erzeugt einen konsolidierten Vergleichs-Report.

## Was diese Datei tut

Startet pro Eingabe-PDF einen regulären `PdfAnalysisPipeline`-Job (gestaffelt nach
`config.CORPUS_CONCURRENCY`), sammelt deren Resultate ein und ruft am Ende
`compareCorpus(usable, task)` auf, das einen Markdown-Vergleichs-Report
schreibt.

## Abhängigkeiten

- `../config` — zentrale Konfig (`CORPUS_CONCURRENCY`, `REPORT_DIR`, …)
- `../index` — `PdfAnalysisPipeline` (jede Einzel-Analyse ist ein "Kind-Job")
- `./comparator` — Konfliktanalyse + konsolidierter Report
- `uuid` — Job-IDs
- `fs`, `path` — Persistenz unter `STORAGE_DIR/jobs-corpus/`

## Concurrency-Modell

- `config.CORPUS_CONCURRENCY` (ENV `PDF_ANALYSIS_CORPUS_CONCURRENCY`, default 3)
  begrenzt, wie viele Kind-PdfAnalysisPipeline-Jobs gleichzeitig aktiv sind.
- Jeder Kind-Job nutzt intern `AGENT_CONCURRENCY` (default 6) plus AIMD aus
  `agentPool.js` → effektiv max. `CORPUS_CONCURRENCY × AGENT_CONCURRENCY`
  gleichzeitige LLM-Calls pro Korpus-Job.
- `asyncPool(poolLimit, array, iteratorFn)` ist ein minimaler Promise-Semaphor
  ohne `p-limit`-Dependency; wird auch vom Comparator für Batch-Parallelität
  genutzt.

## Persistenz

- `STORAGE_DIR/jobs-corpus/{jobId}.json` — atomare Snapshots (`.tmp` → `rename`).
- `restorePersisted()` läuft beim Serverstart; laufende Korpus-Jobs werden
  als `failed` markiert (Kind-Analysen laufen ggf. regulär weiter).

## ENV / Config

| ENV                                 | Default | Bedeutung                                    |
|-------------------------------------|---------|----------------------------------------------|
| `PDF_ANALYSIS_CORPUS_CONCURRENCY`   | 3       | Max. parallele Kind-PdfAnalysisPipeline-Jobs |
| `PDF_ANALYSIS_MAX_ACTIVE_JOBS`      | 2       | Hartes globales Cap über ALLE Jobs           |

## Caveats

- Korpus-Jobs laufen als Polling-Loop (5 s) — kein WebSocket/Event-Emitter.
  Bei 100 Korpus-Jobs × 5 s = 20 wakeups/s; unkritisch, aber beobachtbar.
- 429 von `PdfAnalysisPipeline.start()` wird respektiert (kein Hard-Fail),
  einzelne Dokument-Fehler zählen nicht als Korpus-Fail — `usable.length >= 2`
  reicht für den Vergleich.

## Geänderte Dateien (Task 2G.2)

- `config.js` — neue `CORPUS_CONCURRENCY` + defensive ENV-Validierung (`intEnv`)
- `index.js` (corpus) — `DOC_CONCURRENCY` aus Config; `asyncPool` exportiert
- `comparator.js` — Batching + Char-Cap + `asyncPool`-gesteuerte Batch-Parallelität
