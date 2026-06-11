# pdfAnalysis Module

Autonomes Multi-Agenten-Modul für die Analyse sehr großer PDF-Dokumente.

## Zweck

Ermöglicht die vollständige Analyse großer PDFs (100.000+ Seiten) durch parallele Multi-Agenten-Verarbeitung mit hierarchischer Map-Reduce-Synthese und Fakten-Speicherung.

## Architektur

```
pdfAnalysis/
├── config.js         — Zentrale Konfiguration (alle Werte per ENV)
├── pdfReader.js      — Speicherschonendes, seitenweises PDF-Auslesen
├── llm.js            — LLM-Provider-Wrapper (getLLMProvider)
├── analysisAgent.js  — Einzel-Chunk-Analyse-Agent
├── agentPool.js      — Wellen-synchronisierte Parallelverarbeitung
├── synthesizer.js    — Hierarchisches Map-Reduce → Best-Practices-Report
├── factStore.js      — Fakten-Speicher mit Quellenbezug
└── index.js          — Orchestrator (PdfAnalysisPipeline)
```

## Pipeline

1. **Init**: PDF öffnen, Chunk-Plan erstellen (Seiten + Überlappung)
2. **Analyze**: Parallel via AgentPool (Wellen, Checkpoints, Resume)
3. **Synthesize**: Hierarchische Synthese → Best-Practices-Report
4. **Store**: Fakten mit Quellenbezug in FactStore schreiben

## Verwendung

```bash
# Start
curl -X POST http://localhost:3001/api/pdf-analysis/start \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"pdfPath":"/app/server/storage/uploads/drucksache.pdf","task":"Vollständige Analyse aller Förderprogramme"}'

# Status abfragen
curl http://localhost:3001/api/pdf-analysis/<jobId> -H "Authorization: Bearer $API_KEY"

# Ergebnis abrufen
curl http://localhost:3001/api/pdf-analysis/<jobId>/result -H "Authorization: Bearer $API_KEY"

# Fakten durchsuchen
curl "http://localhost:3001/api/pdf-analysis/facts?q=Frist&document=drucksache" -H "Authorization: Bearer $API_KEY"
```

## Agent-Plugin

`@pdf-analyze` (verfügbar im Agent):
- `pdf-analyze-start` — Startet Analyse-Job
- `pdf-analyze-status` — Fragt Status ab
- `pdf-facts-search` — Durchsucht Fakten-Speicher

## ENV-Konfiguration

- `PDF_ANALYSIS_CONCURRENCY` (default: 6)
- `PDF_ANALYSIS_PAGES_PER_CHUNK` (default: 8)
- `PDF_ANALYSIS_OVERLAP_PAGES` (default: 1)
- `PDF_ANALYSIS_MAX_ACTIVE_JOBS` (default: 2)
- `PDF_ANALYSIS_MAX_PAGES` (default: 0 = unbegrenzt)
- `PDF_ANALYSIS_FACT_MIN_CONF` (default: 0.7)
