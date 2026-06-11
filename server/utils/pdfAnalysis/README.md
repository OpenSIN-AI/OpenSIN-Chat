# PDF-Analyse-Modul (Multi-Agenten + Vision + Cross-Check)

Autonome, parallele Analyse extrem großer PDF-Dokumente (100.000+ Seiten)
mit strikt begrenztem Funktionsumfang: **Analyse → Report → Quellen-Speicherung
(+ Kreuz-Verifikation)**.

## Funktionsumfang

1. **Parallele Multi-Agenten-Analyse** — Seiten-Chunking mit Überlappung,
   Wellen-Synchronisierung, atomare Checkpoints (Resume nach Absturz),
   **AIMD-adaptive Parallelität**.
2. **Best-Practices-Report** — hierarchisches Map-Reduce, Markdown-Report
   mit **deterministischem Citation-Grounding**.
3. **Fakten-Speicher** — **SQLite + FTS5** mit vollem Quellenbezug
   (Dokument, Seite, wörtliches Zitat, Job-ID), deterministische
   **Zitat-Verifikation** + **Seitenkorrektur**.
4. **Cross-Verifikation** — delegierte Recherche-Agenten prüfen
   Behauptungen gegen nutzerbenannte Quellen (PDF/URL/YouTube/Bild/Video/Text)
   + autonome **Deep-Web-Recherche**.
5. **Medien-Analyse** — Vision-Agent (lokales MiniCPM-V via Ollama
   oder Cloud-Provider) + OCR-Triage + **Deep-Scan-Modus** für komplexe
   Layouts + Video-**Keyframe-Sampling**.

## Architektur

```
POST /start ──► PdfAnalysisPipeline (Orchestrator, autonom)
│
├─ Phase 1  PdfReader         Range-Streaming (kein RAM-Load)
│           ├─ Text-Layer-Extraktion
│           ├─ OCR-Fallback (Tesseract.js, lazy init)
│           ├─ Vision-Triage (Operator-Liste) → Vision-Agent
│           └─ Deep-Scan-Modus (MiniCPM-V lokal) [opt-in]
│
├─ Phase 2  AgentPool         Wellen à CONCURRENCY (AIMD: ±1)
│           ├─ AnalysisAgent   Summary + Findings + Fakten je Chunk
│           ├─ CriticAgent     2-stufig: deterministische Flags + LLM-Review
│           └─ Checkpoints     atomar nach jeder Welle → Resume
│
├─ Phase 3  Synthesizer       hierarchisches Reduce → Report (Markdown)
│           └─ Citation-Grounding (Deckungsgrad der Seitenverweise)
│
├─ Phase 4  FactVerifier      deterministischer Substring-Match Zitat ↔ Seite
│           FactStore         SQLite + FTS5, Fakten ≥ MIN_CONFIDENCE
│
└─ Phase 5  CrossCheckPipeline (optional) delegierte Recherche-Agenten
                              gegen nutzerbenannte Quellen + Deep-Web
                              Urteile: supports | contradicts | inconclusive
                              zurück an FactStore (crossCheck-Historie)
```

## API

### Analyse-Endpoints

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/pdf-analysis/upload` | PDF hochladen (multipart, Feld `file`) → `pdfPath` |
| POST | `/api/pdf-analysis/start` | Job starten (`pdfPath`, `task`, `reportType?`, `factCriteria?`, `deepScan?`) |
| GET | `/api/pdf-analysis/list` | Alle Jobs |
| GET | `/api/pdf-analysis/:id` | Status/Fortschritt (inkl. Telemetrie) |
| GET | `/api/pdf-analysis/:id/result` | Report + Kennzahlen (chunksRepaired, ocrPages, visionPages, deepScannedPages, groundingRatio) |
| DELETE | `/api/pdf-analysis/:id` | Job abbrechen |

### Fakten-Endpoints

| Methode | Pfad | Zweck |
|---|---|---|
| GET | `/api/pdf-analysis/facts?q=&document=&tag=&page=` | Fakten suchen (FTS5) |
| GET | `/api/pdf-analysis/facts/stats` | Statistik (total, verified, byDocument) |
| GET | `/api/pdf-analysis/facts/:factId` | Einzelner Fakt (inkl. crossCheck) |
| DELETE | `/api/pdf-analysis/facts/:factId` | Fakt löschen |

### Cross-Check-Endpoints

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/pdf-analysis/crosscheck` | Verifikation starten (`claims?`, `factIds?`, `sources?`, `deepWeb?`) |
| GET | `/api/pdf-analysis/crosscheck/list` | Alle Verifikations-Jobs |
| GET | `/api/pdf-analysis/crosscheck/:id` | Status |
| GET | `/api/pdf-analysis/crosscheck/:id/result` | Konsolidierter Bericht + Urteils-Matrix |
| DELETE | `/api/pdf-analysis/crosscheck/:id` | Abbrechen |

Alle Endpoints existieren zweimal: unter `/api/...` (Developer-API-Key) und
unter `/...` (Browser-Session-Auth via `validatedRequest`).

## Agent-Skill (Chat)

Plugin `pdf-analyze` stellt im Chat bereit:

- `pdf-analyze-start` — Startet Analyse-Job (inkl. `deepScan`-Flag)
- `pdf-analyze-status` — Fragt Status ab (Telemetrie live)
- `pdf-facts-search` — Durchsucht Fakten-Speicher
- `pdf-crosscheck-start` — Delegiert Kreuz-Verifikation
- `pdf-crosscheck-status` — Fragt Verifikations-Status ab

Aktivierung wie bei `@deep-research` über die Workspace-Skill-Whitelist.

## Frontend

Route: `/pdf-analysis` (Admin-Bereich) mit drei Tabs:

1. **Analysen** — Upload, Start-Formular, Job-Liste mit Live-Polling
2. **Fakten-Speicher** — Suche, Verifikationsstatus, "Gegen Quellen prüfen"
3. **Kreuz-Verifikation** — Behauptungen + Quellen + Deep-Web, Verifikations-Matrix

## ENV-Konfiguration

### Pipeline

| Variable | Default | Bedeutung |
|---|---|---|
| `PDF_ANALYSIS_CONCURRENCY` | 6 | Parallele Agenten pro Welle (AIMD-Start) |
| `PDF_ANALYSIS_PAGES_PER_CHUNK` | 8 | Seiten pro Chunk |
| `PDF_ANALYSIS_OVERLAP_PAGES` | 1 | Überlappung an Chunk-Grenzen |
| `PDF_ANALYSIS_MAX_ACTIVE_JOBS` | 2 | Parallele Jobs (429 darüber) |
| `PDF_ANALYSIS_MAX_PAGES` | 0 | Seitenlimit (0 = unbegrenzt) |
| `PDF_ANALYSIS_REDUCE_GROUP_SIZE` | 20 | Gruppengröße der Synthese |

### LLM (Retry/Backoff)

| Variable | Default | Bedeutung |
|---|---|---|
| `PDF_ANALYSIS_LLM_RETRIES` | 4 | Retries pro LLM-Call (transiente Fehler) |
| `PDF_ANALYSIS_LLM_BACKOFF_MS` | 2000 | Basis-Backoff in ms (exponentiell + Jitter) |

### AIMD (Adaptive Parallelität)

| Variable | Default | Bedeutung |
|---|---|---|
| `PDF_ANALYSIS_AIMD_INCREASE_AFTER` | 3 | Saubere Wellen bis Parallelität +1 |
| `PDF_ANALYSIS_AIMD_COOLDOWN_MS` | 5000 | Abkühlphase nach Rate-Limit (ms) |

### Sicherheit & Verifikation

| Variable | Default | Bedeutung |
|---|---|---|
| `PDF_ANALYSIS_ALLOWED_DIRS` | (leer) | Zusätzliche erlaubte Wurzelverzeichnisse (kommasepariert) |
| `PDF_ANALYSIS_VERIFY_WINDOW` | 1 | Nachbarseiten-Fenster für Zitat-Suche |
| `PDF_ANALYSIS_VERIFY_STRICT` | false | true = unverifizierte Fakten verwerfen |

### OCR (gescannte PDFs)

| Variable | Default | Bedeutung |
|---|---|---|
| `PDF_ANALYSIS_OCR` | true | OCR für Seiten ohne Text-Layer |
| `PDF_ANALYSIS_OCR_LANGS` | deu+eng | Tesseract-Sprachen |
| `PDF_ANALYSIS_OCR_SCALE` | 2.0 | Raster-Auflösung (höher = genauer) |
| `PDF_ANALYSIS_OCR_MIN_CHARS` | 16 | Darunter gilt Seite als "ohne Text-Layer" |

### Critic-Agent (Multi-Agent-Reflexion)

| Variable | Default | Bedeutung |
|---|---|---|
| `PDF_ANALYSIS_CRITIC` | true | Unabhängige Qualitätsprüfung + Repair-Pass |

### Medien-Analyse (Vision)

| Variable | Default | Bedeutung |
|---|---|---|
| `PDF_ANALYSIS_VISION` | true | Bildinhalte via multimodalem LLM analysieren |
| `PDF_ANALYSIS_VISION_MIN_AREA` | 0.08 | Mindest-Bildflächenanteil pro Seite für Vision |
| `PDF_ANALYSIS_VISION_MAX_PER_CHUNK` | 3 | Vision-Seiten-Deckel pro Chunk (Kosten) |
| `PDF_ANALYSIS_VIDEO_MAX_FRAMES` | 8 | Keyframes pro Video |
| `PDF_ANALYSIS_VIDEO_MAX_BYTES` | 200 MB | Video-Download-Limit |
| `PDF_ANALYSIS_VIDEO_SCENE_THRESHOLD` | 0.3 | ffmpeg Szenenwechsel-Schwelle |

### Lokale Vision (MiniCPM-V via Ollama)

| Variable | Default | Bedeutung |
|---|---|---|
| `PDF_ANALYSIS_VISION_BACKEND` | auto | `auto` \| `ollama` (nur lokal, Privacy) \| `cloud` |
| `PDF_ANALYSIS_OLLAMA_URL` | http://localhost:11434 | Ollama-Endpoint |
| `PDF_ANALYSIS_OLLAMA_VISION_MODEL` | minicpm-v | Vision-Modell |
| `PDF_ANALYSIS_OLLAMA_TIMEOUT_MS` | 180000 | Timeout (lokale Inferenz braucht Zeit) |
| `PDF_ANALYSIS_OLLAMA_NUM_CTX` | 8192 | Context-Window |
| `PDF_ANALYSIS_DEEPSCAN_SCALE` | 2.0 | Render-Auflösung für Deep Scan |

> **Docker-Hinweis:** Läuft der Server im Docker-Container auf dem Mac, ist Ollama
> auf dem Host über `PDF_ANALYSIS_OLLAMA_URL=http://host.docker.internal:11434` erreichbar.

### Cross-Verifikation / Deep-Web-Recherche

| Variable | Default | Bedeutung |
|---|---|---|
| `PDF_ANALYSIS_XCHECK_CONCURRENCY` | 4 | Parallele Recherche-Agenten |
| `PDF_ANALYSIS_XCHECK_QUERIES` | 2 | Suchanfragen pro Behauptung |
| `PDF_ANALYSIS_XCHECK_RESULTS` | 4 | Treffer pro Suchanfrage |
| `PDF_ANALYSIS_XCHECK_MAX_FETCH_BYTES` | 5 MB | URL-Fetch-Limit |
| `PDF_ANALYSIS_XCHECK_FETCH_TIMEOUT_MS` | 20000 | URL-Fetch-Timeout |
| `PDF_ANALYSIS_XCHECK_MAX_SOURCE_CHARS` | 60000 | Quelltext-Kappung |
| `SERPER_DEV_API_KEY` | (leer) | Serper-Key für Deep-Web (alternativ zu SearchApi) |
| `SEARCHAPI_API_KEY` | (leer) | SearchApi-Key für Deep-Web (alternativ zu Serper) |

## Dependencies

```bash
cd server && yarn add pdfjs-dist tesseract.js @napi-rs/canvas better-sqlite3 ffmpeg-static
```

## Setup (Lokale Vision auf Mac)

```bash
brew install ollama
ollama serve
ollama pull minicpm-v
```

Damit läuft die komplette Bild-/Diagramm-/Video-Analyse **vollständig lokal**
(keine Cloud-Kosten, keine Daten verlassen das Gerät).

## Architektur-Garantien

- ✅ **Skalierbar**: 100.000+ Seiten ohne RAM-Probleme (Range-Streaming)
- ✅ **Selbstheilend**: AIMD (Rate-Limits), Server-Resume (Crash-Recovery)
- ✅ **Durchsatz-optimal**: AIMD findet maximalen stabilen Provider-Durchsatz
- ✅ **Sicher**: pdfPath-Whitelist + realpath (kein Path-Traversal)
- ✅ **Verifiziert**: Zitate deterministisch gegen Seitentext geprüft
- ✅ **Quellenübergreifend**: SSRF-geschützt, PDF/URL/YouTube/Bild/Video/Text
- ✅ **Privacy**: Vision-Modus `ollama` erzwungen = kein Cloud-Fallback
- ✅ **Drei Zugriffswege**: Chat (`@pdf-analyze`), API, Browser-UI (`/pdf-analysis`)
- ✅ **Backwards-kompatibel**: `facts.json` wird automatisch nach SQLite migriert
