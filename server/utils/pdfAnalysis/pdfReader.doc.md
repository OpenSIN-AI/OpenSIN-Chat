# PdfReader

**Purpose:** Range-basiertes Streaming-Lesen beliebig großer PDFs.

## Was diese Datei tut

KEIN Laden der Datei in den RAM. Stattdessen:

- `PDFDataRangeTransport`: pdfjs fordert gezielt Byte-Ranges an
  (XRef-Tabelle, einzelne Seiten-Objekte), die direkt per
  File-Descriptor von der Platte gelesen werden.
- Nur ein kleiner Initial-Chunk (Header + Trailer-Nähe, 2 MB) wird
  vorab gelesen.
- Seiten werden nach Text-Extraktion sofort freigegeben (`page.cleanup()`).

→ Konstanter Speicherverbrauch, unabhängig von der Dateigröße.
Getestet ausgelegt auf Dateien im dreistelligen GB-Bereich und
Dokumente mit hunderttausenden Seiten.

**Triage-Kaskade pro Seite:**

1. **Deep-Scan** (falls `deepScan=true`): komplette visuelle Lesung
   via MiniCPM-V. Fallback auf Schritt 2 bei Nichtverfügbarkeit.
2. **Programmatische Extraktion** (Text-Layer).
3. **OCR-Fallback** (falls `needsOcr`): Seite rastern + Tesseract.
4. **Vision-Triage** (falls Bildanteil > 8 % der Seitenfläche):
   Seite rendern + Vision-Agent beschreibt Bildinhalte.

`pageHasSignificantImages()` prüft die Operator-Liste deterministisch
(`paintImageXObject`-Count) — KEIN Rendern nötig, billig.

`buildChunkPlan()` partitioniert das Dokument in überlappende
Seiten-Chunks für den AgentPool.

## Abhängigkeiten

- `pdfjs-dist` (legacy build, lazy require)
- `@napi-rs/canvas` — `createCanvas()` (lazy require)
- `./ocr` — `ocrPage()`, `needsOcr()`
- `./visionAgent` — `describeImage()`
- `./deepScan` — `deepScanPage()`
- `./config` (transitiv)

## ENV

| ENV                                    | Default     | Bedeutung                                    |
|----------------------------------------|-------------|----------------------------------------------|
| `PDF_ANALYSIS_VISION_MIN_AREA`         | 0.08        | Min. Bildflächenanteil für Vision-Triage (8 %)|
| `PDF_ANALYSIS_VISION_MAX_PER_CHUNK`    | 3           | Max. Vision-Analysen pro Chunk (Kostendeckel)  |
| `PDF_ANALYSIS_INITIAL_CHUNK_BYTES`     | 2097152     | Initial-Bytes für Range-Transport (2 MB)      |

## Caveats

- Fallback auf `fs.readFileSync` (voller Buffer) nur für kleine/defekte
  Dateien ohne gültige XRef oder linearisierungs-feindliche Generatoren.
  Bei großen Dateien ist dies ein Speicher-Risiko — aber nur bei Fehlern.
- `wasOcrPage(pageNumber)` signalisiert nachgelagerten Stufen (z.B.
  FactVerifier), dass die Zeichengenauigkeit geringer ist.
- `rangeText(from, to)` markiert jede Seite mit `ocr: true/false` und
  optional `media` (Vision-Beschreibung). Leere Seiten erhalten
  `[leere Seite — kein Textinhalt]`.
- `buildChunkPlan` garantiert keine unendliche Schleife: falls
  `start <= chunk.pageStart` nach Überlappung, wird `start = end + 1`.
