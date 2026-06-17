# JobStore

**Purpose:** Persistiert Job-Metadaten auf Disk (atomar), damit laufende Analysen einen Server-Neustart überleben.

## Was diese Datei tut

Atomare Schreibvorgänge (`.tmp` + `rename`) sicherstellen, dass ein
Crash mitten im Schreiben nie eine halbe JSON-Datei hinterlässt.

**Hauptfunktionen:**

- `persistJob(job)` — serialisiert nur die zum Fortsetzen nötigen Felder
  (`id`, `pdfPath`, `documentName`, `task`, `status`, `progress`, `result`,
  `error`, `lastUpdated`).
- `removeJob(jobId)` — löscht Job-Datei + ggf. verbliebene `.tmp`-Datei.
- `loadAllJobs()` — lädt alle persistierten Jobs; unterbrochene
  (pending/running) sind Kandidaten für Auto-Resume.

**Maintenance / Cleanup:**

- `cleanupStaleJobs(maxAgeHours=24)` — löscht terminal-state Jobs
  (completed/failed/cancelled) älter als `maxAgeHours`.
- `getOrphanedJobs()` — findet Jobs, deren PDF-Quelldatei verschwunden ist
  (reportet nur, löscht NICHT — Entscheidung beim Aufrufer).
- `markStuckJobsAsFailed(timeoutHours=6)` — markiert hängengebliebene
  `running`-Jobs als `failed` mit Sentinel-Error `orphaned-stuck`.

`lastUpdated` wird bei jedem `persistJob`-Aufruf neu gesetzt und erlaubt
stuck-Job-Detection ohne separates Timestamp-Tracking.

## Abhängigkeiten

- `fs`, `path`
- `./config` — `STORAGE_DIR`

## Caveats

- `jobTimestamp()` bevorzugt `lastUpdated`-Feld, fällt auf File-mtime zurück
  (für alte Snapshots vor Schema-Update). `createdAt` wird bewusst NICHT
  als Fallback genutzt (sonst würden aktive Jobs fälschlich als "alt" gelten).
- Korrupte JSON-Dateien werden bei `loadAllJobs` übersprungen, bei
  `cleanupStaleJobs` als stale behandelt und gelöscht.
- `TERMINAL_STATUSES = { completed, failed, cancelled }` — eine Quelle
  der Wahrheit, damit Cleanup-Funktionen nicht auseinanderlaufen.
