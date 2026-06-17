# FactStore

**Purpose:** SQLite-basierte Speicherung ausgewählter Einzelinformationen mit vollem Quellenbezug.

## Was diese Datei tut

Speichert extrahierte Fakten mit Dokument-, Seiten- und Zitatbezug:

- **FTS5-Volltextindex**: Suche in Millisekunden statt Linear-Scan,
  auch bei Millionen Fakten (Prefix-Matching, Ranking nach bm25).
- **WAL-Modus** + `synchronous = NORMAL`: transaktionale, crash-sichere
  Writes ohne Full-Table-Lock.
- **`auto_vacuum = INCREMENTAL`**: automatisches Cleanup freier Pages
  nach `PDF_ANALYSIS_FACT_VACUUM_THRESHOLD` Inserts (Default 500).
- **Auto-Migration** einer vorhandenen `facts.json` (einmalig, danach
  umbenannt zu `.migrated`).
- **Graceful Degradation**: wenn `better-sqlite3` nicht verfügbar ist
  (fehlende Build-Toolchain, inkompatible Binaries), fällt der Konstruktor
  transparent auf `JsonFactStore` zurück — identische öffentliche API.

Fact-ID: deterministisch via SHA-256(`documentName|page|detail`),
ersten 16 Hex-Zeichen. `INSERT OR IGNORE` verhindert Duplikate.

Öffentliche API: `addFacts`, `get`, `search`, `remove`, `stats`,
`updateCrossCheck`, `vacuum`, `incrementalVacuum`, `_save` (No-Op-Shim).

## Abhängigkeiten

- `better-sqlite3` (optional, native — Graceful-Fallback auf JSON)
- `fs`, `path`, `crypto`
- `../paths` — `getStoragePath()`

## ENV

| ENV                                  | Default | Bedeutung                                      |
|--------------------------------------|---------|------------------------------------------------|
| `PDF_ANALYSIS_FACT_VACUUM_THRESHOLD` | 500     | Inserts bis automatisches `incremental_vacuum`  |

## Caveats

- `JsonFactStore` hat KEIN FTS5 — Suche ist Linear-Scan mit
  Teilstring-Matching. Für sehr große Korpora signifikant langsamer.
- `_save()` ist ein No-Op im SQLite-Modus (persistiert sofort transaktional).
  JSON-Fallback ruft `_save()` nach jedem Write auf.
- `updateCrossCheck(id, crossCheck)` persistiert Kreuz-Verifikations-Urteile
  als JSON-String in der `cross_check`-Spalte.
- FTS5-Suche escapet Terme als `"term"*` (Prefix-Matching) und ranked nach bm25.
- Die FactStore-DB wird NIE automatisch bereinigt (Retention löscht nur
  Uploads, Checkpoints, Reports, Job-Snapshots — nicht Fakten).
