# PDF-Analyse (Multi-Agenten + Vision + Cross-Check)

> **Strikter Funktionsumfang:** Analyse → Report → Quellen-Speicherung (+ Kreuz-Verifikation).
> Keine Features darüber hinaus.

## Überblick

Das PDF-Analyse-Modul ist das robusteste und genaueste Tool zur Analyse
sehr großer PDF-Dokumente (100.000+ Seiten) im AnythingLLM/OpenSIN-Chat-Fork.
Es kombiniert **parallele Multi-Agenten-Verarbeitung**, **AIMD-adaptive
Parallelität**, **automatische Resume-Mechanismen nach Server-Crashes**,
**deterministische Fakten-Verifikation**, **Cross-Verifikation gegen externe
Quellen**, und **lokale Vision via MiniCPM-V/Ollama**.

## Features

### 1. Parallele Multi-Agenten-Analyse
- Seiten-Chunking mit 1-Seiten-Überlappung (Synchronisierung über Chunk-Grenzen)
- Wellen-Synchronisierung mit atomaren Checkpoints (Resume nach Absturz)
- AIMD-adaptive Parallelität (TCP-artige Regulierung: Rate-Limit → /2, N Wellen → +1)
- Range-basiertes PDF-Streaming (konstanter RAM, 100k+ Seiten möglich)
- OCR-Triage für gescannte PDFs (Tesseract.js, lazy init)
- Vision-Triage für Bildseiten (Operator-Liste, deterministisch)
- **Deep-Scan-Modus** für komplexe Layouts (jede Seite hochauflösend via MiniCPM-V)

### 2. Best-Practices-Report
- Hierarchisches Map-Reduce über alle Chunk-Ergebnisse
- Markdown-Report mit durchgängigen Seitenverweisen
- **Citation-Grounding**: deterministische Messung des Deckungsgrads
- Optional: PDF-Report über bestehenden ReportGenerator
- Multi-Agent-Reflexion (Critic-Agent prüft und repariert)

### 3. Fakten-Speicher
- **SQLite + FTS5** (transaktional, crash-sicher, bm25-Ranking)
- Auto-Migration der bestehenden `facts.json`
- Vollständiger Quellenbezug: Dokument, Seite, wörtliches Zitat, Job-ID, Tags
- **Deterministische Zitat-Verifikation** (Substring-Match gegen echten Seitentext)
- Automatische Seitenkorrektur (±1 Nachbarseite, falls Agent an Chunk-Grenze um eine Seite danebenlag)
- Verifikations-Badges in der UI (verifiziert / nicht verifiziert / S. korrigiert)

### 4. Cross-Verifikation
- Delegierte Recherche-Agenten (parallele Verarbeitung)
- Quelltypen: PDF, URL, YouTube (Transkript), Bild (URL), Video (Keyframe-Sampling), Text
- Autonome Deep-Web-Recherche (Serper/SearchApi)
- Urteile pro Behauptung: `supports` | `contradicts` | `inconclusive`
- Konsolidierter Markdown-Bericht
- Urteile werden an `fact.crossCheck` zurückgeschrieben (Verifikationshistorie)

### 5. Medien-Analyse
- **Lokales Vision-Backend** (MiniCPM-V 4.6 via Ollama, Apple-Silicon-optimiert)
- **Privacy-Garantie**: `backend=ollama` erzwungen → kein Cloud-Fallback
- **Auto-Modus**: lokal wenn verfügbar, sonst Cloud
- **Cloud-Modus**: multimodaler LLM-Provider (OpenAI, Anthropic, Gemini, etc.)
- Strukturierte Extraktion: ART, INHALT, DATEN, TEXT-IM-BILD
- Multi-Image-Support (Keyframe-Sequenzen als Ganzes)
- Cost-Decke: VISION_MAX_PER_CHUNK (default 3)

### 6. Sicherheit
- **pdfPath-Whitelist** (uploads, documents, ENV)
- realpath + Symlink-Auflösung VOR dem Prefix-Check
- 403 Forbidden bei Verstoß
- SSRF-Schutz (DNS-Lookup, private IP-Block, Redirect-Re-Validierung)

### 7. Skalierbarkeit
- **100.000+ Seiten** ohne RAM-Probleme (Range-Streaming)
- **Millionen Fakten** in SQLite + FTS5 (Millisekunden-Suche)
- **Job-Persistenz** auf Disk (Resume nach Server-Crash)
- **Telemetrie + ETA** live in UI (Durchsatz, Agenten, ETA)

## Architektur

```
Phase 1: PDF einlesen (Range-Streaming)
    ├─ Deep-Scan-Modus (MiniCPM-V lokal) [opt-in]
    ├─ Text-Layer-Extraktion
    ├─ OCR-Fallback (Tesseract.js)
    └─ Vision-Triage (Operator-Liste) → MiniCPM-V

Phase 2: Parallele Multi-Agenten-Analyse (AIMD-reguliert)
    ├─ AnalysisAgent pro Chunk
    ├─ CriticAgent (2-stufige Reflexion)
    └─ Atomare Checkpoints nach jeder Welle

Phase 3: Hierarchische Synthese
    ├─ Map-Reduce (20er-Gruppen)
    ├─ Konsolidierter Markdown-Report
    └─ Citation-Grounding (Deckungsgrad-Messung)

Phase 4: Fakten-Verifikation
    ├─ Deterministischer Substring-Match (Zitat ↔ Seitentext)
    ├─ Automatische Seitenkorrektur (±1)
    └─ SQLite + FTS5 (transaktional, bm25-Ranking)

Phase 5: Cross-Verifikation (optional, separat)
    ├─ SourceAdapters (PDF/URL/YouTube/Bild/Video/Text)
    ├─ Delegierte Recherche-Agenten (parallele Verarbeitung)
    ├─ Deep-Web-Recherche (Serper/SearchApi)
    └─ Urteile → FactStore (crossCheck-Historie)
```

## Zugriffswege

| Weg | URL/Pfad | Auth |
|-----|----------|------|
| **Chat** | Agent-Plugin `@pdf-analyze` / `@pdf-crosscheck-start` | Session-Cookie |
| **Developer-API** | `/api/pdf-analysis/*` | Bearer-Token (`validApiKey`) |
| **Browser-UI** | `/pdf-analysis` (Admin-Bereich) | Session-Cookie (`validatedRequest`) |

## Setup

```bash
# 1. Dependencies installieren
cd server && yarn add pdfjs-dist tesseract.js @napi-rs/canvas better-sqlite3 ffmpeg-static

# 2. Optional: Lokale Vision (Mac)
brew install ollama
ollama serve
ollama pull minicpm-v

# 3. ENV-Variablen in docker/.env.example dokumentiert
```

## Detaillierte Dokumentation

Vollständige Dokumentation mit ENV-Tabellen, API-Referenz und Architektur-Details:
**[server/utils/pdfAnalysis/README.md](./utils/pdfAnalysis/README.md)**

## Issue-Tracking

- [#122](https://github.com/OpenSIN-AI/OpenSIN-Chat/issues/122) — PDF-Analyse Multi-Agenten-Modul
- [#123](https://github.com/OpenSIN-AI/OpenSIN-Chat/issues/123) — Sicherheit + Fakten-Verifikation + Cross-Check
