# PDF-Analyse-Pipeline

Docs: PDF-ANALYSIS.md
Purpose: Dokumentation der 70+ Schritt KI-Pipeline fur PDF-Analyse

## Ubersicht

Die PDF-Analyse-Pipeline ist ein autonomes Multi-Agenten-System fur die
vollstandige Analyse beliebiger PDF-Dokumente -- von einzelnen Arbeitspapieren
bis hin zu Korpora aus Hunderten von Dokumenten mit hunderttausenden Seiten.

Das Modul umfasst **18 Server-Module** unter `server/utils/pdfAnalysis/` und
durchlauft **70+ Entwicklungsschritte** vom reinen Text-Layer uber OCR, Vision,
Deep Scan, Fact-Extraktion, deterministische Verifikation, Cross-Check gegen
externe Quellen bis hin zur Korpus-Synthese mit Konsens-/Konfliktanalyse.

**Schlusselprinzipien:**

- **Streaming, nicht Laden** -- Range-basiertes PDF-Lesen mit konstantem
  Speicherverbrauch unabhangig von Dateigroße
- **Adaptive Parallelitat** -- AIMD-Regelung (wie TCP) findet automatisch den
  maximalen stabilen Durchsatz des LLM-Providers
- **Citations or die** -- Jede Aussage im Report muss mit Seitenverweis belegt
  sein; unbesttigte Absatze werden markiert
- **Deterministische Verifikation** -- Fakten werden ohne LLM gegen den echten
  Seitentext gepruft (Substring-Match nach Normalisierung)
- **Crash-Sicherheit** -- Job-Snapshots und Chunk-Checkpoints werden atomar
  persistiert; unterbrochene Jobs werden beim Serverstart automatisch fortgesetzt

## Architektur

```
Upload ─► PdfReader ─► Chunk-Plan ─► AgentPool (AIMD) ─► Synthese ─► Report
            │              │              │
            ├─ Text-Layer   ├─ Chunks     ├─ AnalysisAgent (LLM)
            ├─ OCR-Fallback ├─ Overlap    ├─ CriticAgent (2-Stage)
            ├─ Vision-Triage├─ Checkpoint ├─ FactExtraction
            ├─ Deep Scan    │             ├─ FactVerifier (deterministisch)
            └─ Media-Desc   │             └─ FactStore (SQLite+FTS5)
                             │
                             ├─ CrossCheck-Pipeline (URL/PDF/YouTube/Web)
                             └─ Corpus-Pipeline (Multi-PDF Vergleich)
```

### Pipeline-Phasen

| Phase | Beschreibung | Modul |
|-------|-------------|-------|
| **1. Reading** | PDF offnen, Seitenzahl ermitteln, Chunk-Plan generieren | `pdfReader.js` |
| **2. Analyzing** | Parallele Multi-Agenten-Analyse mit adaptiver Parallelitat | `agentPool.js`, `analysisAgent.js`, `criticAgent.js` |
| **3. Synthesizing** | Hierarchisches Map-Reduce uber alle Chunk-Ergebnisse | `synthesizer.js` |
| **4. Verifying-Facts** | Deterministische Fact-Verifikation gegen echten Seitentext | `factVerifier.js` |
| **5. Storing-Facts** | Fakten in SQLite+FTS5 speichern | `factStore.js` |
| **6. Done** | Report schreiben, Checkpoint loschen, Job abschließen | `index.js` |

### Seiten-Triage (pro Seite)

```
Seite laden
    │
    ├─ Deep Scan aktiv? ──► NIM Vision liest Seite komplett visuell
    │                          (Fallback auf Text/OCR)
    │
    ├─ Text-Layer vorhanden? ──► Programmatische Extraktion (schnell, exakt)
    │                              │
    │                              └─ Wenig Text? ──► OCR (NVIDIA NIM Vision API)
    │
    └─ Signifikante Bilder? ──► Vision-Agent beschreibt Bildinhalt
                                   (NIM Vision API ODER Cloud-LLM)
```

## Komponenten

### `pdfReader.js` -- Range-basiertes Streaming

Verwendet `pdfjs-dist` mit `PDFDataRangeTransport` statt die gesamte Datei in
den RAM zu laden. Nur ein kleiner Initial-Chunk (Header + Trailer-Nahe, Default
2 MB) wird vorab gelesen; weitere Byte-Ranges werden on-demand vom File
Descriptor angefordert.

- **Konstanter Speicherverbrauch** -- getestet fur Dateien im GB-Bereich und
  Dokumente mit hunderttausenden Seiten
- **Seiten-Triage** -- Text-Layer vs. OCR vs. Vision vs. Deep Scan
- **`buildChunkPlan()`** -- partitioniert das Dokument in uberlappende
  Seiten-Chunks (Default: 8 Seiten/Chunk, 1 Seite Uberlappung)

### `ocr.js` -- Tesseract.js OCR-Fallback

- **Sprachen:** Deutsch + Englisch (`deu+eng`, per ENV konfigurierbar)
- **Fallback-Kaskade:** `deu+eng` -> `deu` -> `eng` -> `osd` (Orientation/Script)
- **Lazy Worker:** ein einzelner Tesseract-Worker wird einmalig initialisiert
  und wiederverwendet (Worker-Spawn ist teuer)
- **Serialisiert:** OCR-Aufrufe werden serialisiert (Worker nicht thread-safe),
  aber nur Scan-Seiten landen in der OCR-Queue -- parallele Analyse-Agenten
  werden nicht blockiert
- **Intelligent Routing:** `needsOcr()` pruft, ob die programmatische
  Extraktion zu wenig Text liefert (< 16 Zeichen konfigurierbar)

### `visionAgent.js` + `localVision.js` -- MiniCPM-V Vision

**Backend-Auswahl** (`PDF_ANALYSIS_VISION_BACKEND`):
- `"ollama"` -- lokales MiniCPM-V 4.6 uber Ollama (Mac, kostenlos, privat)
- `"cloud"` -- multimodaler LLM-Provider des Forks
- `"auto"` (Default) -- lokal wenn verfugbar, sonst Cloud

**`localVision.js`** steuert Ollama an (`/api/generate` mit base64-Images):
- High-Resolution-Tiling: volle Render-Auflosung wird ubergeben (kein Downscale)
- OCR-Spezialist: liest Tabellen, Diagramme und komplexe Layouts aus dem Bild
- Multi-Image: Video-Keyframes konnen als Sequenz ubergeben werden
- **Circuit-Breaker:** nach 5 aufeinanderfolgenden Fehlern wird der Health-Check
  fur 5 Minuten pausiert (verhindert Dauerfeuer gegen totes Ollama)

### `deepScan.js` -- Visuelle Voll-Analyse

Jede Seite wird hochauflösend gerastert (Scale 2.0) und komplett visuell gelesen
-- NIM Vision (Nemotron 3 Nano Omni 30B) interpretiert Layout, Tabellen und Diagramme im Zusammenhang.

- Aktivierung pro Job uber `deepScan=true`
- Fallback auf Text/OCR, falls lokales Modell nicht verfugbar
- Einsatz: komplexe Layouts (Rechnungen, Formulare, Prasentationen, gescannte
  Akten), bei denen reine Text-Parser Struktur verlieren

### `agentPool.js` -- AIMD Adaptive Parallelitat

Wellen-Modell: Chunks in Seitenreihenfolge, Wellen laufen parallel, nach jeder
Welle deterministisches Merge + atomarer Checkpoint.

**AIMD-Regelung** (Additive Increase / Multiplicative Decrease, wie TCP):
- Rate-Limit-/Uberlastfehler in einer Welle => Parallelitat halbieren (min. 1)
  + kurze Abkuhlphase (5s)
- N fehlerfreie Wellen in Folge => Parallelitat +1 (bis Maximum)
- **Retry-Cap:** pro Chunk max. 10 Rate-Limit-Retries, dann finaler Fehler
  (verhindert infinite Loop bei dauerhaftem API-Ausfall)

Das System findet selbststandig den maximalen stabilen Durchsatz des jeweiligen
LLM-Providers, ohne manuelles Tuning.

### `factVerifier.js` -- Deterministische Fact-Verifikation

Pruft LLM-extrahierte Fakten **ohne LLM** gegen den echten Seitentext
(kein Halluzinationsrisiko).

1. Zitat und Seitentext normalisieren (Whitespace, Anfuhrungszeichen,
   Ligaturen, Silbentrennung am Zeilenende)
2. Exakte Substring-Suche auf der angegebenen Seite
3. Bei Fehlschlag: Nachbarseiten ±1 prufen (Chunk-Grenzen)
4. Bei Treffer auf Nachbarseite: automatische Seitenkorrektur

**STRICT-Modus** (`PDF_ANALYSIS_VERIFY_STRICT=true`): unverifizierte Fakten
werden verworfen statt mit `verified:false` gespeichert.

### `crossCheck/` -- Kreuz-Verifikation

**`CrossCheckPipeline`** (`crossCheck/index.js`) orchestriert die Kreuz-
Verifikation von Behauptungen gegen externe Quellen.

**Quelltypen** (`sourceAdapters.js`):
- `url` -- Webseite (fetch + HTML→Text, SSRF-geschatzt)
- `pdf` -- lokale PDF (uber PdfReader, gestreamt)
- `youtube` -- YouTube-Video (Transkript via timedtext-API)
- `text` -- Roh-Text (z.B. aus Zwischenablage)
- `image` / `video` -- Bild/Video-URL (Vision-Agent)

**SSRF-Schutz:** nur http/https, keine privaten/lokalen IP-Bereiche, Redirect-
Ziele werden erneut gepruft, Antwortgroße ist begrenzt.

**Research-Agenten** (`researchAgent.js`):
- `compareAgainstSource` -- pruft Behauptungen gegen eine konkrete Quelle,
  liefert Urteil: `supports | contradicts | inconclusive` mit Beleg-Zitat
- `deepWebResearch` -- autonome Web-Recherche: generiert Suchanfragen (LLM),
  holt Top-Treffer (Serper/SearchApi), ladet Seiten, pruft Behauptungen

Urteile werden an die betroffenen Fakten im FactStore zuruckgeschrieben.

### `corpus/comparator.js` -- Multi-PDF Konsens/Konflikt

**`CorpusPipeline`** (`corpus/index.js`) analysiert mehrere PDFs in einem Job:
1. Pro Dokument: regularen `PdfAnalysisPipeline`-Job starten (gestaffelt nach
   `CORPUS_CONCURRENCY`)
2. Auf Abschluss aller Einzel-Jobs warten (Polling, abbruchfahig)
3. `compareCorpus()` -- Vergleichs-Synthese + konsolidierter Report

**Comparator** (`comparator.js`) -- zwei Stufen:
1. **Konfliktanalyse:** paarweise/gruppenweise -- welche Aussagen stutzen sich,
   welche widersprechen sich, welche sind Alleinstellungen?
2. **Korpus-Report:** Executive Summary uber gesamten Bestand, Gemeinsamkeiten,
   Widerspruche (mit "Dokument A S. 12 vs. Dokument B S. 340"-Belegen)

Batching bei großen Korpora: `COMPARE_BATCH_SIZE` (Default 10) Dokumente pro
Batch, `COMPARE_BATCH_CONCURRENCY` (Default 1) parallele Batch-Calls.

### `factStore.js` -- SQLite+FTS5 Fact-Store

Persistente Speicherung extrahierter Fakten mit vollem Quellenbezug
(Dokument, Seite, wortliches Zitat, Job-ID).

- **SQLite** (`better-sqlite3`) mit **FTS5-Volltextindex** -- Suche in
  Millisekunden statt Linear-Scan, auch bei Millionen Fakten (Prefix-Matching,
  Ranking nach bm25)
- **WAL-Modus** -- transaktionale, crash-sichere Writes
- **Incremental VACUUM** -- automatische Defragmentierung alle 500 Inserts
- **Einmal-Migration** einer vorhandenen `facts.json` (wird danach umbenannt)
- **JSON-Fallback:** wenn `better-sqlite3` nicht verfugbar ist, degradiert der
  Store transparent zu einem reinen JS-JSON-Store mit identischer API

### `criticAgent.js` -- 2-Stage Critic (Reflexion + Repair)

Eine **separate** Prufinstanz (Multi-Agent-Reflexion, nicht derselbe Agent)
pruft die Chunk-Ergebnisse:

**Stufe 1** (deterministisch, kostenlos):
- Leere Summary trotz nicht-leerem Seitentext
- Findings ohne Seitenangaben
- Auffallig kurze Summary bei langem Input

**Stufe 2** (LLM-Critic, nur fur Verdachtsfalle):
- Qualitatsurteil; bei `insufficient` => genau EIN Repair-Versuch durch
  erneute Analyse des Chunks mit Critic-Feedback im Prompt

### `synthesizer.js` -- Citation Grounding + Source Linking

Hierarchisches Map-Reduce uber alle Chunk-Ergebnisse:
1. **Stufe 1..n:** Gruppen von Chunk-Zusammenfassungen werden zu Zwischen-
   zusammenfassungen verdichtet (rekursiv, bis eine ubrig ist)
2. **Finale Stufe:** Best-Practices-Report (Markdown) mit Executive Summary,
   Kernerkenntnissen, Empfehlungen und durchgangigen Seitenverweisen

**Citation Grounding:** Absatze ohne `(S. N)`-Verweis werden deterministisch
erkannt. Der Report erhalt einen Grounding-Hinweis mit Deckungsgrad in %.

### `retention.js` -- Cleanup Scheduler

Automatische Speicher-Hygiene fur das PDF-Analyse-Modul:
- **Uploads:** loschen wenn alter als `UPLOAD_TTL_DAYS` (Default 7) UND von
  keinem aktiven Job referenziert
- **Checkpoints:** loschen wenn Job abgeschlossen/gescheitert oder verwaist
- **Reports:** loschen wenn alter als `REPORT_TTL_DAYS` (Default 0 = nie)
- **Job-Snapshots:** abgeschlossene Jobs alter als `JOB_TTL_DAYS` (Default 30)
- **Stuck-Job-Detection:** `running` > 30 min => `failed`
- **Orphan-Detection:** PDF-Quelldatei verschwunden => warn
- **FactStore:** wird NIE automatisch bereinigt (dauerhaftes Gedachtnis)

Lauft beim Serverstart und danach im Intervall (Default: alle 1 h).

### `security.js` -- Multi-Layer Security

`validatePdfPath()` erlaubt als Analyse-Eingabe NUR Dateien innerhalb explizit
freigegebener Wurzelverzeichnisse (Default: modul-eigenes Upload-Verzeichnis +
Dokument-Storage). Schutzt gegen:
- **Path Traversal** (`../../etc/passwd`)
- **Symlink-Ausbruch** (realpath-Auflosung VOR dem Prefix-Check)
- **Analyse beliebiger Server-Dateien** durch API-Key-Inhaber

Zusatzliche Freigaben per `PDF_ANALYSIS_ALLOWED_DIRS` (kommasepariert).

### `jobStore.js` -- SSE-Ruckkanal Live Telemetry

Persistiert Job-Metadaten auf Disk (atomar via temp+rename), damit laufende
Analysen einen Server-Neustart uberleben und automatisch fortgesetzt werden.

- **`persistJob()`** -- atomarer JSON-Snapshot mit `lastUpdated`-Timestamp
- **`loadAllJobs()`** -- lauft alle persistierten Jobs beim Start
- **`cleanupStaleJobs()`** -- terminale Jobs alter als N Stunden entfernen
- **`markStuckJobsAsFailed()`** -- `running` seit > N Stunden => `failed`
- **`getOrphanedJobs()`** -- Jobs deren PDF-Quelldatei verschwunden ist

## REST API

Alle Endpoints unter `/api/pdf-analysis/*`, geschutzt uber `validApiKey`.

### Upload

```http
POST /api/pdf-analysis/upload
Content-Type: multipart/form-data

file=@dokument.pdf
```

**Response:**
```json
{
  "pdfPath": "/storage/pdf-analysis/uploads/1718900000000-dokument.pdf",
  "documentName": "dokument.pdf",
  "sizeBytes": 5242880
}
```

### Analyse starten

```http
POST /api/pdf-analysis/start
Content-Type: application/json

{
  "pdfPath": "/storage/pdf-analysis/uploads/1718900000000-dokument.pdf",
  "task": "Analysiere die Haushaltsplanung 2026",
  "reportType": "umfassender Best-Practices-Bericht",
  "factCriteria": "Budgetzahlen, Zusagen, Zeitpläne",
  "deepScan": false
}
```

**Response:**
```json
{ "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
```

### Job-Status

```http
GET /api/pdf-analysis/:id
```

**Response:**
```json
{
  "id": "a1b2c3d4-...",
  "documentName": "dokument.pdf",
  "task": "Analysiere die Haushaltsplanung 2026",
  "status": "running",
  "progress": {
    "phase": "analyzing",
    "chunksDone": 12,
    "chunksTotal": 30,
    "totalPages": 240,
    "concurrency": 6,
    "etaSeconds": 180,
    "pagesPerMinute": 48
  },
  "error": null,
  "createdAt": "2026-06-22T10:00:00.000Z"
}
```

### Job-Ergebnis

```http
GET /api/pdf-analysis/:id/result
```

**Response:**
```json
{
  "status": "completed",
  "report": "# Analysebericht: dokument.pdf\n\n## Executive Summary\n...",
  "reportFile": "/storage/pdf-analysis/reports/a1b2c3d4-....md",
  "pdfReport": null,
  "masterSummary": "Das Dokument behandelt...",
  "totalPages": 240,
  "chunks": 30,
  "factsStored": 87,
  "factsVerified": 72,
  "factsUnverified": 15,
  "chunkErrors": 0,
  "chunksRepaired": 3,
  "ocrPages": 12,
  "visionPages": 5,
  "deepScannedPages": 0,
  "groundingRatio": 94
}
```

### Report-Download

```http
GET /api/pdf-analysis/:id/report/download
```

Liefert den Report als Markdown-Datei (`Content-Type: text/markdown`).

### Job-Liste

```http
GET /api/pdf-analysis/list
```

### Job abbrechen

```http
DELETE /api/pdf-analysis/:id
```

### Fakten durchsuchen

```http
GET /api/pdf-analysis/facts?q=Haushalt&document=druck&tag=Budget&limit=50
```

### Fakten-Statistik

```http
GET /api/pdf-analysis/facts/stats
```

**Response:**
```json
{
  "total": 1247,
  "verified": 983,
  "byDocument": {
    "dokument.pdf": 87,
    "bericht.pdf": 340
  }
}
```

### Einzelne Fakt abrufen / loschen

```http
GET   /api/pdf-analysis/facts/:factId
DELETE /api/pdf-analysis/facts/:factId
```

### Cross-Check starten

```http
POST /api/pdf-analysis/crosscheck
Content-Type: application/json

{
  "claims": ["Der Haushalt 2026 betraegt 500 Mrd. EUR"],
  "factIds": ["abc123def456"],
  "sources": [
    { "type": "url", "url": "https://example.com/haushalt" },
    { "type": "pdf", "path": "/storage/pdf-analysis/uploads/vergleich.pdf" }
  ],
  "deepWeb": true
}
```

### Cross-Check Status / Ergebnis / Liste / Abbrechen

```http
GET    /api/pdf-analysis/crosscheck/list
GET    /api/pdf-analysis/crosscheck/:id
GET    /api/pdf-analysis/crosscheck/:id/result
GET    /api/pdf-analysis/crosscheck/:id/report/download
DELETE /api/pdf-analysis/crosscheck/:id
```

### Korpus-Analyse starten

```http
POST /api/pdf-analysis/corpus
Content-Type: application/json

{
  "pdfPaths": [
    "/storage/pdf-analysis/uploads/dokument-a.pdf",
    "/storage/pdf-analysis/uploads/dokument-b.pdf"
  ],
  "task": "Vergleiche die Haushaltsplane 2025 und 2026",
  "reportType": "corpus",
  "deepScan": false
}
```

### Korpus Status / Ergebnis / Liste / Abbrechen

```http
GET    /api/pdf-analysis/corpus/list
GET    /api/pdf-analysis/corpus/:id
GET    /api/pdf-analysis/corpus/:id/result
DELETE /api/pdf-analysis/corpus/:id
```

## Konfiguration

Alle Werte sind per ENV ubersteuerbar. Default-Werte in Klammern.

| ENV-Variable | Default | Beschreibung |
|---|---|---|
| `PDF_ANALYSIS_CONCURRENCY` | `6` | Initiale Agenten-Parallelitat (1-64) |
| `PDF_ANALYSIS_PAGES_PER_CHUNK` | `8` | Seiten pro Chunk (1-100) |
| `PDF_ANALYSIS_OVERLAP_PAGES` | `1` | Chunk-Uberlappung in Seiten (0-50) |
| `PDF_ANALYSIS_MAX_ACTIVE_JOBS` | `2` | Max. parallele Analyse-Jobs (1-32) |
| `PDF_ANALYSIS_MAX_PAGES` | `0` | Seiten-Limit (0 = unbegrenzt, max 100000) |
| `PDF_ANALYSIS_CORPUS_CONCURRENCY` | `4` | Max. parallele Einzel-Analysen im Korpus-Job (1-16) |
| `PDF_ANALYSIS_REDUCE_GROUP_SIZE` | `20` | Gruppengroße beim hierarchischen Reduce (1-200) |
| `PDF_ANALYSIS_TEMPERATURE` | `0` | LLM-Temperatur |
| `PDF_ANALYSIS_MAX_CHARS_PER_CHUNK` | `24000` | Max. Zeichen pro Chunk an LLM (1000-1000000) |
| `PDF_ANALYSIS_FACT_MIN_CONF` | `0.7` | Mindest-Confidence fur Fakten-Speicherung |
| `PDF_ANALYSIS_OCR` | `true` | OCR-Fallback aktiviert |
| `PDF_ANALYSIS_OCR_LANGS` | `deu+eng` | Tesseract-Sprachen (Fallback) |
| `PDF_ANALYSIS_OCR_SCALE` | `2.0` | Render-Skalierung fur OCR |
| `PDF_ANALYSIS_OCR_MIN_CHARS` | `16` | Mindest-Zeichen fur Text-Layer-Erkennung |
| `PDF_ANALYSIS_VISION` | `true` | Vision-Agent aktiviert |
| `PDF_ANALYSIS_VISION_BACKEND` | `auto` | Backend: `ollama`/`cloud`/`auto` |
| `PDF_ANALYSIS_VISION_MIN_AREA` | `0.08` | Mindest-Bildflachenanteil fur Vision (8%) |
| `PDF_ANALYSIS_VISION_MAX_PER_CHUNK` | `3` | Max. Vision-Seiten pro Chunk (Kostendeckel) |
| `PDF_ANALYSIS_CRITIC` | `true` | Critic-Agent aktiviert |

**Zusatzliche ENVs fur AIMD, Ollama, Security, Retention und Cross-Check:**

| ENV-Variable | Default | Beschreibung |
|---|---|---|
| `PDF_ANALYSIS_AIMD_INCREASE_AFTER` | `3` | Saubere Wellen vor +1 Parallelitat |
| `PDF_ANALYSIS_AIMD_COOLDOWN_MS` | `5000` | Abkuhlphase nach Rate-Limit |
| `PDF_ANALYSIS_MAX_CHUNK_RETRIES` | `10` | Max. Rate-Limit-Retries pro Chunk |
| `PDF_ANALYSIS_OLLAMA_URL` | `http://localhost:11434` | Ollama-Endpoint |
| `PDF_ANALYSIS_OLLAMA_VISION_MODEL` | `minicpm-v` | Ollama-Vision-Modell (optionaler Fallback) |
| `PDF_ANALYSIS_OLLAMA_TIMEOUT_MS` | `180000` | Ollama-Timeout (3 min) |
| `PDF_ANALYSIS_OLLAMA_NUM_CTX` | `8192` | Ollama Context-Window |
| `PDF_ANALYSIS_LLM_RETRIES` | `4` | Max. LLM-Retries bei Vision |
| `PDF_ANALYSIS_LLM_BACKOFF_MS` | `2000` | Basis-Backoff fur LLM-Retries |
| `PDF_ANALYSIS_DEEPSCAN_SCALE` | `2.0` | Render-Skalierung fur Deep Scan |
| `PDF_ANALYSIS_INITIAL_CHUNK_BYTES` | `2097152` | Initial-Chunk fur Range-Streaming (2 MB) |
| `PDF_ANALYSIS_VERIFY_WINDOW` | `1` | Nachbarseiten-Toleranz bei Fact-Verifikation |
| `PDF_ANALYSIS_VERIFY_STRICT` | `false` | Unverifizierte Fakten verwerfen |
| `PDF_ANALYSIS_ALLOWED_DIRS` | (leer) | Zusatzliche freigegebene Verzeichnisse |
| `PDF_ANALYSIS_UPLOAD_TTL_DAYS` | `7` | Upload-Aufbewahrung in Tagen |
| `PDF_ANALYSIS_REPORT_TTL_DAYS` | `0` | Report-Aufbewahrung (0 = nie) |
| `PDF_ANALYSIS_JOB_TTL_DAYS` | `30` | Job-Snapshot-Aufbewahrung in Tagen |
| `PDF_ANALYSIS_CLEANUP_INTERVAL_MS` | `3600000` | Cleanup-Intervall (1 h) |
| `PDF_ANALYSIS_JOB_TIMEOUT_MINUTES` | `30` | Stuck-Job-Timeout in Minuten |
| `PDF_ANALYSIS_MAX_COMPLETED_JOBS` | `500` | Hard Cap fur terminale Jobs im RAM |
| `PDF_ANALYSIS_FACT_VACUUM_THRESHOLD` | `500` | Inserts bis Incremental VACUUM |
| `PDF_ANALYSIS_XCHECK_CONCURRENCY` | `4` | Cross-Check Parallelitat |
| `PDF_ANALYSIS_XCHECK_RESULTS` | `4` | Suchergebnisse pro Query |
| `PDF_ANALYSIS_XCHECK_QUERIES` | `2` | Suchanfragen pro Behauptung |
| `PDF_ANALYSIS_XCHECK_MAX_FETCH_BYTES` | `5242880` | Max. Fetch-Bytes (5 MB) |
| `PDF_ANALYSIS_XCHECK_FETCH_TIMEOUT_MS` | `20000` | Fetch-Timeout |
| `PDF_ANALYSIS_XCHECK_MAX_SOURCE_CHARS` | `60000` | Max. Zeichen pro Quelle |
| `SERPER_DEV_API_KEY` | (leer) | Serper-API-Key fur Web-Suche |
| `SEARCHAPI_API_KEY` | (leer) | SearchApi-Key fur Web-Suche (Fallback) |

## UI

Die Frontend-Komponente (`frontend/src/pages/PdfAnalysis/`) bietet **4 Tabs**:

### Tab 1: Analysen
- Upload-Formular mit Aufgaben-Text, Berichtstyp, Fact-Kriterien, Deep-Scan-Option
- Live-Job-Liste mit Fortschrittsbalken, Phase, ETA, Pages/Minute, aktive Agenten
- Report-Modal mit Markdown-Rendering, Inhaltsverzeichnis (TOC), Download als
  `.md` / `.docx` / `.pdf`, "Als Quelle hinzufugen" (Kopie in Zwischenablage)

### Tab 2: Fakten
- Volltext-Suche (`q`) + Filter nach Dokument (`document`)
- Fakten-Liste mit Quellenbezug (Dokument, Seite), Verifikations-Status
  (verifiziert/nicht verifiziert), Tags, Cross-Check-Ergebnis-Badge
- Aktionen pro Fakt: "Quellen prufen" (springt zum Cross-Check-Tab), Loschen

### Tab 3: Cross-Check
- Formular: Behauptungen (zeilenweise), Fact-IDs, Vergleichsquellen
  (URL/PDF/YouTube/Text/Bild/Video), Deep-Web-Option
- Job-Liste mit Fortschritt, Status, Urteilen
- Report-Modal mit Verifikationsmatrix (Behauptung x Quelle x Urteil) +
  Markdown-Report + Download-Link

### Tab 4: Korpus
- Multi-Datei-Upload (mindestens 2 PDFs)
- Aufgaben-Text, Fact-Kriterien, Deep-Scan-Option
- Job-Liste mit Phasen-Fortschritt (`analyzing-documents` -> `comparing`)
- Report-Modal mit Konflikt-Liste (Topic + Position je Dokument mit Beleg),
  analysierte/fehlgeschlagene Dokumente, Markdown-Report

## Production Hardening

### Concurrency Tuning

| ENV | Klein-Instanz | Standard | Gross-Instanz |
|-----|---------------|----------|---------------|
| `PDF_ANALYSIS_CONCURRENCY` | 2 | 6 | 12-16 |
| `PDF_ANALYSIS_MAX_ACTIVE_JOBS` | 1 | 2 | 4 |
| `PDF_ANALYSIS_CORPUS_CONCURRENCY` | 1 | 4 | 5 |
| `PDF_ANALYSIS_XCHECK_CONCURRENCY` | 2 | 4 | 8 |

AIMD regelt die Parallelitat automatisch nach unten bei 429/503. Die obere
Grenze sollte so gewahlt werden, dass `MAX_ACTIVE_JOBS * CONCURRENCY` die
Rate-Limits des LLM-Providers nicht dauerhaft uberschreitet.

### Memory Limits

- **PdfReader:** Range-Streaming, konstanter RAM unabhangig von Dateigroße
- **Multer Upload:** `fileSize: 1 GB`, `fieldSize: 1 GB` -- streamt multipart
  direkt auf Disk, RAM bleibt konstant
- **OCR:** Serialisierter Worker, keine parallelen Raster-Buffer
- **FactStore:** Incremental VACUUM alle 500 Inserts verhindert Fragmentierung

### Job Timeout

- **Stuck-Job-Detection:** `PDF_ANALYSIS_JOB_TIMEOUT_MINUTES` (Default 30)
  markiert `running`-Jobs als `failed` mit Sentinel-Error `orphaned-stuck`
- **In-Memory Pruning:** terminale Jobs alter als 24h werden aus dem RAM
  entfernt; harter Cap bei `PDF_ANALYSIS_MAX_COMPLETED_JOBS` (Default 500)
- **Disk Cleanup:** `cleanupStaleJobs(24)` entfernt terminale Disk-Snapshots
  alter als 24h

### OCR Fallback-Kaskade

```
deu+eng  ──►  deu  ──►  eng  ──►  osd
  (zwei Sprachen)  (nur Deutsch)  (nur Englisch)  (Orientation/Script)
```

Jede Stufe wird nur versucht, wenn die vorherige fehlschlagt. Ein fehlendes
Sprachpaket bricht die Kaskade nicht -- `osd` ist in Tesseract immer verfugbar.
NIM Vision API benötigt keine Sprachpakete (multilingual nativ).

### Crash-Recovery

Beim Serverstart ruft `PdfAnalysisPipeline.resumeInterrupted()`:
1. Alle persistierten Jobs laden (`loadAllJobs()`)
2. Unterbrochene (`pending`/`running`) automatisch fortsetzen
3. Falls PDF-Datei nicht mehr vorhanden: Job als `failed` markieren
4. Chunk-Checkpoints sorgen dafur, dass bereits analysierte Chunks NICHT
   erneut berechnet werden
