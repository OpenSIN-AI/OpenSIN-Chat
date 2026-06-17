# Retention

**Purpose:** Automatische Speicher-Hygiene für das PDF-Analyse-Modul.

## Was diese Datei tut

Bei Riesen-Dateien (zweistellige GB pro Upload) läuft die Platte ohne
Aufräumen unweigerlich voll. Cleanup-Regeln (alle per ENV konfigurierbar):

- **Uploads**: löschen, wenn älter als `UPLOAD_TTL_DAYS` UND von keinem
  aktiven (pending/running) Job referenziert.
- **Checkpoints**: löschen, wenn der zugehörige Job abgeschlossen/gescheitert
  ist oder die Datei verwaist ist (kein Job vorhanden).
- **Reports**: löschen, wenn älter als `REPORT_TTL_DAYS` (0 = nie löschen —
  Reports sind klein und wertvoll, Default daher 0).
- **Job-Snapshots**: abgeschlossene Jobs älter als `JOB_TTL_DAYS` entfernen.

Der FactStore (SQLite) wird NIE automatisch bereinigt — gespeicherte
Fakten mit Quellenbezug sind das dauerhafte Gedächtnis des Systems.

**Zusätzliche Maintenance:**

- Stuck-Job-Detection: `running` > `JOB_TIMEOUT_MINUTES` → `failed`.
- Orphan-Detection: PDF-Quelldatei verschwunden → `warn` (nicht löschen).
- `cleanupStaleJobs(24)`: terminal-state Jobs älter als 24h entfernen.

Läuft beim Serverstart (`runCleanup()`) und danach im Intervall
(Default: alle 1 h). `timer.unref()` blockiert Prozess-Ende nicht.

## Abhängigkeiten

- `fs`, `path`
- `../paths` — `getStoragePath()`
- `./jobStore` — `loadAllJobs`, `cleanupStaleJobs`, `markStuckJobsAsFailed`, `getOrphanedJobs`

## ENV

| ENV                                    | Default  | Bedeutung                                    |
|----------------------------------------|----------|----------------------------------------------|
| `PDF_ANALYSIS_UPLOAD_TTL_DAYS`         | 7        | TTL für Upload-Dateien (Tage)                 |
| `PDF_ANALYSIS_REPORT_TTL_DAYS`         | 0        | TTL für Reports (0 = nie löschen)             |
| `PDF_ANALYSIS_JOB_TTL_DAYS`            | 30       | TTL für abgeschlossene Job-Snapshots (Tage)   |
| `PDF_ANALYSIS_CLEANUP_INTERVAL_MS`     | 3600000  | Cleanup-Intervall (ms, Default 1 h)           |
| `PDF_ANALYSIS_JOB_TIMEOUT_MINUTES`     | 30       | Stuck-Job-Timeout (Minuten)                   |

## Caveats

- `olderThanDays(file, days)` gibt `false` zurück bei `days <= 0`
  (Reports Default 0 = immer behalten).
- Uploads werden NICHT gelöscht, wenn ein aktiver Job sie referenziert
  — `activePdfPaths` wird aus `loadAllJobs()` gebildet.
- Orphan-Jobs werden nur reportet (`console.warn`), nicht automatisch
  gelöscht — die Entscheidung trifft die aufrufende Schicht.
- `startRetentionSchedule()` ist idempotent: doppelter Aufruf startet
  keinen zweiten Timer.
