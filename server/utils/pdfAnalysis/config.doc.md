# Config

**Purpose:** Zentrale Konfiguration für das PDF-Analyse-Modul. Alle Werte per ENV übersteuerbar.

## Was diese Datei tut

Exportiert alle Konfigurationskonstanten für das PDF-Analyse-Modul:

- **Verzeichnisse**: `STORAGE_DIR`, `CHECKPOINT_DIR`, `REPORT_DIR`, `FACTS_FILE`.
- **Parallelisierung**: `AGENT_CONCURRENCY`, `PAGES_PER_CHUNK`, `CHUNK_OVERLAP_PAGES`.
- **Job-Limits**: `MAX_ACTIVE_JOBS`, `MAX_PAGES` (0 = unbegrenzt).
- **Korpus-Pipeline**: `CORPUS_CONCURRENCY` (mit Range-Validierung 1..16 via `intEnv`).
- **Synthese**: `REDUCE_GROUP_SIZE` (Gruppen pro Reduce-Stufe).
- **LLM**: `LLM_TEMPERATURE`, `MAX_CHARS_PER_CHUNK`.
- **Fakten**: `FACT_MIN_CONFIDENCE`.

`intEnv()` parst ENV-Werte defensiv: ungültige Werte (NaN, außerhalb
min/max) fallen auf den Default zurück und loggen eine Warnung.

## Abhängigkeiten

- `path`
- `../paths` — `getStoragePath()`

## ENV

| ENV                                       | Default  | Bedeutung                                      |
|-------------------------------------------|----------|------------------------------------------------|
| `PDF_ANALYSIS_CONCURRENCY`                | 6        | Max. parallele Analyse-Agenten                  |
| `PDF_ANALYSIS_PAGES_PER_CHUNK`            | 8        | Seiten pro Chunk                                |
| `PDF_ANALYSIS_OVERLAP_PAGES`             | 1        | Seiten-Überlappung zwischen Chunks              |
| `PDF_ANALYSIS_MAX_ACTIVE_JOBS`           | 2        | Gleichzeitig aktive Analyse-Jobs                |
| `PDF_ANALYSIS_MAX_PAGES`                 | 0        | Max. Seiten (0 = unbegrenzt)                    |
| `PDF_ANALYSIS_CORPUS_CONCURRENCY`        | 4        | Parallele Einzel-Analysen in Korpus-Jobs (1..16)|
| `PDF_ANALYSIS_REDUCE_GROUP_SIZE`         | 20       | Chunk-Summaries pro Reduce-Gruppe               |
| `PDF_ANALYSIS_TEMPERATURE`               | 0        | LLM-Temperature                                 |
| `PDF_ANALYSIS_MAX_CHARS_PER_CHUNK`       | 24000    | Max. Zeichen pro Chunk-Prompt                   |
| `PDF_ANALYSIS_FACT_MIN_CONF`             | 0.7      | Min. Confidence für Fakten-Speicherung          |

## Caveats

- `CORPUS_CONCURRENCY` ist der einzige Wert mit harter Range-Validierung
  (1..16). Alle anderen `Number()`-Parsings akzeptieren beliebige Werte.
- Verzeichnisse werden unter dem Storage-Root `pdf-analysis/` angelegt.
