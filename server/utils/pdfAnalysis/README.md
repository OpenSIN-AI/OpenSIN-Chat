# PDF-Analyse-Modul (Multi-Agenten)

Autonome, parallele Analyse extrem großer PDF-Dokumente (100.000+ Seiten)
mit drei strikt begrenzten Funktionen:

1. **Parallele Multi-Agenten-Analyse** — Seiten-Chunking mit Überlappung,
   Wellen-Synchronisierung, atomare Checkpoints (Resume nach Absturz).
2. **Best-Practices-Report** — hierarchisches Map-Reduce über alle
   Chunk-Ergebnisse, Markdown-Report mit durchgängigen Seitenverweisen
   (optional als PDF über das Reports-Modul).
3. **Fakten-Speicher** — ausgewählte Einzelinformationen mit vollem
   Quellenbezug (Dokument, Seite, wörtliches Zitat, Job-ID), gezielt
   abfragbar.

## Architektur

```
POST /start ──► PdfAnalysisPipeline (Orchestrator, autonom)
│
├─ Phase 1  PdfReader        Seiten lazy lesen, sofort freigeben
│           buildChunkPlan   Chunks à N Seiten, 1 Seite Überlappung
│
├─ Phase 2  AgentPool        Wellen à CONCURRENCY Agenten (parallel)
│           AnalysisAgent    Summary + Findings + Fakten je Chunk
│           Checkpoints      atomar nach jeder Welle → Resume
│
├─ Phase 3  Synthesizer      hierarchisches Reduce → Report (Markdown)
│
└─ Phase 4  FactStore        Fakten ≥ MIN_CONFIDENCE, dedupliziert,
                             mit Quelle (Dokument/Seite/Zitat)
```

## API

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/pdf-analysis/upload` | PDF hochladen (multipart, Feld `file`) → `pdfPath` |
| POST | `/api/pdf-analysis/start` | Job starten (`pdfPath`, `task`, opt. `reportType`, `factCriteria`) |
| GET | `/api/pdf-analysis/list` | Alle Jobs |
| GET | `/api/pdf-analysis/:id` | Status/Fortschritt |
| GET | `/api/pdf-analysis/:id/result` | Report + Kennzahlen |
| DELETE | `/api/pdf-analysis/:id` | Job abbrechen |
| GET | `/api/pdf-analysis/facts?q=&document=&tag=&page=` | Fakten suchen |
| GET | `/api/pdf-analysis/facts/stats` | Statistik |
| GET | `/api/pdf-analysis/facts/:factId` | Einzelner Fakt |
| DELETE | `/api/pdf-analysis/facts/:factId` | Fakt löschen |

Alle Endpoints sind über `validApiKey` geschützt.

## Agent-Skill (Chat)

Plugin `pdf-analyze` stellt im Chat bereit:
`pdf-analyze-start`, `pdf-analyze-status`, `pdf-facts-search`.
Aktivierung wie bei `@deep-research` über die Workspace-Skill-Whitelist.

## ENV

| Variable | Default | Bedeutung |
|---|---|---|
| `PDF_ANALYSIS_CONCURRENCY` | 6 | Parallele Agenten pro Welle |
| `PDF_ANALYSIS_PAGES_PER_CHUNK` | 8 | Seiten pro Chunk |
| `PDF_ANALYSIS_OVERLAP_PAGES` | 1 | Überlappung an Chunk-Grenzen |
| `PDF_ANALYSIS_MAX_ACTIVE_JOBS` | 2 | Parallele Jobs (429 darüber) |
| `PDF_ANALYSIS_MAX_PAGES` | 0 | Seitenlimit (0 = unbegrenzt) |
| `PDF_ANALYSIS_REDUCE_GROUP_SIZE` | 20 | Gruppengröße der Synthese |
| `PDF_ANALYSIS_FACT_MIN_CONF` | 0.7 | Mindest-Confidence für Fakten |
| `PDF_ANALYSIS_LLM_RETRIES` | 4 | Retries pro LLM-Call |
| `PDF_ANALYSIS_LLM_BACKOFF_MS` | 2000 | Basis-Backoff (exponentiell) |

## Dependency

```bash
cd server && yarn add pdfjs-dist
```
