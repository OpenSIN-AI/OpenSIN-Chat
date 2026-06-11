# pdfAnalysis Module

Autonomes Multi-Agenten-Modul für die Analyse sehr großer PDF-Dokumente
(100.000+ Seiten) mit Vision, Cross-Check, OCR und Deep-Scan.

## Zweck

Ermöglicht die vollständige Analyse großer PDFs (100.000+ Seiten) durch:

- **Parallele Multi-Agenten-Verarbeitung** mit AIMD-adaptiver Parallelität
- **Hierarchische Map-Reduce-Synthese** → Best-Practices-Report
- **Fakten-Speicher** (SQLite + FTS5) mit Quellenbezug
- **Deterministische Zitat-Verifikation**
- **Cross-Verifikation** gegen externe Quellen + Deep-Web-Recherche
- **Vision-Analyse** (lokal via MiniCPM-V/Ollama oder Cloud)
- **OCR-Triage** für gescannte PDFs
- **Deep-Scan-Modus** für komplexe Layouts
- **Job-Persistenz** für Resume nach Server-Crash

## Verwandte Dateien

### Server-Kern
- `config.js` — Zentrale Konfiguration (alle Werte per ENV)
- `pdfReader.js` — Range-basiertes PDF-Streaming, OCR, Vision, Deep-Scan
- `llm.js` — LLM-Provider-Wrapper mit Retry/Backoff
- `analysisAgent.js` — Einzel-Chunk-Analyse mit JSON-Schema
- `agentPool.js` — Wellen-synchronisierte Parallelverarbeitung mit AIMD
- `synthesizer.js` — Hierarchisches Map-Reduce + Citation-Grounding
- `factStore.js` — SQLite + FTS5 + Auto-Migration + updateCrossCheck
- `factVerifier.js` — Deterministische Zitat-Verifikation gegen Seitentext
- `criticAgent.js` — 2-stufige Multi-Agent-Reflexion
- `jobStore.js` — Job-Persistenz auf Disk
- `security.js` — pdfPath-Whitelist + realpath + 403
- `ocr.js` — Tesseract.js-OCR-Fallback mit lazy init
- `visionAgent.js` — Provider-Abstraktion (lokal/Cloud)
- `localVision.js` — Ollama/MiniCPM-V-Backend
- `deepScan.js` — Komplette Seiten-Visualanalyse via MiniCPM-V
- `index.js` — PdfAnalysisPipeline-Orchestrator

### Cross-Check-Submodul
- `crossCheck/sourceAdapters.js` — PDF/URL/YouTube/Text-Quellen
- `crossCheck/researchAgent.js` — Delegierte Recherche-Agenten
- `crossCheck/mediaAdapters.js` — Bild-URL + Video-Keyframe
- `crossCheck/index.js` — CrossCheckPipeline-Orchestrator

### Endpoints
- `endpoints/api/pdfAnalysis/index.js` — Developer-API (API-Key)
- `endpoints/pdfAnalysis.js` — Browser-Endpoints (Session-Auth)

### Agent-Plugin
- `utils/agents/aibitat/plugins/pdf-analyze.js` — `@pdf-analyze` + `@pdf-crosscheck-start`

### Frontend
- `frontend/src/models/pdfAnalysis.js` — API-Client
- `frontend/src/pages/PdfAnalysis/index.jsx` — Hauptseite (3 Tabs)
- `frontend/src/pages/PdfAnalysis/CrossCheckPanel.jsx` — Cross-Check-UI

## Verwendung

```bash
# Start
curl -X POST http://localhost:3001/api/pdf-analysis/start \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"pdfPath":"...","task":"Vollständige Analyse","deepScan":true}'

# Status
curl http://localhost:3001/api/pdf-analysis/<jobId>

# Fakten durchsuchen
curl "http://localhost:3001/api/pdf-analysis/facts?q=Frist" -H "Authorization: Bearer $API_KEY"

# Cross-Check
curl -X POST http://localhost:3001/api/pdf-analysis/crosscheck \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"claims":["..."],"sources":[{"type":"url","url":"https://..."}],"deepWeb":true}'
```

## ENV-Konfiguration

Vollständige Liste: siehe `server/utils/pdfAnalysis/README.md`

Wichtigste Variablen:
- `PDF_ANALYSIS_CONCURRENCY` — Parallele Agenten (AIMD-Start)
- `PDF_ANALYSIS_VISION_BACKEND` — `auto` | `ollama` | `cloud`
- `PDF_ANALYSIS_OCR` — OCR für gescannte PDFs
- `PDF_ANALYSIS_CRITIC` — Multi-Agent-Reflexion
- `PDF_ANALYSIS_OLLAMA_URL` — Lokales Ollama-Endpoint
- `PDF_ANALYSIS_DEEPSCAN_SCALE` — Deep-Scan-Render-Auflösung

## Setup

```bash
cd server && yarn add pdfjs-dist tesseract.js @napi-rs/canvas better-sqlite3 ffmpeg-static

# Optional: Lokale Vision
brew install ollama && ollama serve && ollama pull minicpm-v
```
