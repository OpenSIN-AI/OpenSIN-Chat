# DeepScan

**Purpose:** Visuelle Voll-Analyse von PDF-Seiten via lokalem MiniCPM-V.

## Was diese Datei tut

Unterschied zur normalen Pipeline:

- **Normal**: Text-Layer + OCR-Fallback + Vision nur für Bild-Seiten (Triage).
- **Deep Scan**: JEDE Seite wird hochauflösend gerastert und komplett
  visuell gelesen — MiniCPM-V interpretiert Layout, Tabellen und
  Diagramme im Zusammenhang ("sieht" das Dokument).

Einsatz: komplexe Layouts (Rechnungen, Formulare, Präsentationen,
gescannte Akten), bei denen reine Text-Parser Struktur verlieren.
Aktivierung pro Analyse-Job über das Flag `deepScan=true` — die übrige
Pipeline (Chunking, AgentPool, Synthese, Fakten, Verifikation) bleibt
identisch; nur die Seitentext-Quelle wechselt.

Rendering: volle Auflösung (Scale 2.0) — MiniCPM-V kachelt
hochauflösende Bilder intern selbst (High-Resolution-Tiling), daher
KEIN Downscale vor der Übergabe.

Gibt `null` zurück, wenn das lokale Modell nicht verfügbar ist — der
Aufrufer (PdfReader) fällt dann auf Text/OCR-Pfad zurück.

## Abhängigkeiten

- `./localVision` — `isAvailable()`, `generate()`
- `@napi-rs/canvas` — `createCanvas()` (lazy require)
- `pdfjs-dist` — `doc.getPage()`, `page.render()` (via PdfReader)

## ENV

| ENV                            | Default | Bedeutung                              |
|--------------------------------|---------|----------------------------------------|
| `PDF_ANALYSIS_DEEPSCAN_SCALE`  | 2.0     | Render-Skalierung für Deep-Scan-Seiten |

## Caveats

- Erfordert laufendes Ollama mit installiertem MiniCPM-V — ohne lokales
  Modell ist Deep-Scan ein No-Op (Fallback auf normale Pipeline).
- Sehr rechenaufwendig: jede Seite ist ein Vision-Inferenz-Call.
  Bei großen Dokumenten kann dies signifikante Zeit kosten.
- Temporäre Canvas-Objekte werden nach jedem Seiten-Render freigegeben.
