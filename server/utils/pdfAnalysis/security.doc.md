# Security

**Purpose:** Sicherheits-Helfer für das PDF-Analyse-Modul.

## Was diese Datei tut

`validatePdfPath(pdfPath)` erlaubt als Analyse-Eingabe NUR Dateien
innerhalb explizit freigegebener Wurzelverzeichnisse:

- Upload-Verzeichnis des PDF-Analyse-Moduls (`pdf-analysis/uploads/`).
- Dokument-Storage des Forks (`documents/`), falls vorhanden.
- Zusätzliche Verzeichnisse per `PDF_ANALYSIS_ALLOWED_DIRS` (kommasepariert).

**Schutz gegen:**

- **Path Traversal**: `../../etc/passwd` wird durch Prefix-Check blockiert.
- **Symlink-Ausbruch**: `fs.realpathSync()` löst Symlinks VOR dem
  Prefix-Check auf — ein Symlink, der außerhalb zeigt, wird erkannt.
- **Analyse beliebiger Server-Dateien**: nur `.pdf`-Dateien in
  freigegebenen Verzeichnissen werden akzeptiert.

Zusätzlich: `stat.isFile()` Check verhindert Analyse von Verzeichnissen,
Sockets oder Devices.

Fehler werfen `Error` mit `statusCode: 403` (für Express-Middleware).

## Abhängigkeiten

- `fs`, `path`
- `../paths` — `getStoragePath()`

## ENV

| ENV                            | Default | Bedeutung                                        |
|--------------------------------|---------|--------------------------------------------------|
| `PDF_ANALYSIS_ALLOWED_DIRS`    | (leer)  | Zusätzliche freigegebene Verzeichnisse (kommasepariert) |

## Caveats

- `allowedRoots()` wird bei jedem Aufruf neu berechnet — Änderungen an
  `PDF_ANALYSIS_ALLOWED_DIRS` werden ohne Server-Neustart wirksam.
- Pfade werden mit `path.resolve()` kanonisiert, dann mit `realpathSync()`
  aufgelöst. Nicht existierende Dateien → `Error("PDF nicht gefunden")`.
- Der Prefix-Check verwendet `root + path.sep` als Separator, um zu
  verhindern, dass `/allowed/foo` fälschlich `/allowed-evil/bar` matcht.
- Exportiert auch `allowedRoots()` für Testzwecke.
