# OCR

**Purpose:** OCR-Fallback für gescannte PDFs ohne Text-Layer (Tesseract.js).

## Was diese Datei tut

**Intelligent Routing** pro Seite:

- Liefert pdfjs genügend Text → programmatische Extraktion (schnell, exakt).
- Liefert pdfjs (fast) nichts UND die Seite hat Render-Inhalt →
  Seite rastern (pdfjs + `@napi-rs/canvas`) und Tesseract-OCR.

Ein einziger Tesseract-Worker wird lazy initialisiert und wiederverwendet
(Worker-Spawn ist teuer). OCR-Aufrufe werden serialisiert, da der Worker
nicht thread-safe ist — die parallelen Analyse-Agenten blockieren sich
dadurch nicht: nur Scan-Seiten landen in der OCR-Queue.

**Sprach-Fallback-Kette**: `deu+eng` → `deu` → `eng` → `osd`
(orientation/script detection). Bei jedem Fallback wird ein neuer
Worker mit der nächstkleineren Sprache erstellt.

## Abhängigkeiten

- `tesseract.js` — `createWorker()` (lazy require)
- `@napi-rs/canvas` — `createCanvas()` (lazy require)
- pdfjs `page.render()` (via PdfReader)

## ENV

| ENV                          | Default   | Bedeutung                                       |
|------------------------------|-----------|-------------------------------------------------|
| `PDF_ANALYSIS_OCR`           | `true`    | OCR aktivieren/deaktivieren                      |
| `PDF_ANALYSIS_OCR_LANGS`     | `deu+eng` | Tesseract-Sprachen (`+`-separiert)               |
| `PDF_ANALYSIS_OCR_SCALE`     | 2.0       | Render-Skalierung für OCR-Rasterung              |
| `PDF_ANALYSIS_OCR_MIN_CHARS` | 16        | Min. Zeichen damit pdfjs-Text als "genug" gilt   |

## Caveats

- `needsOcr(text)` prüft: weniger als `MIN_TEXT_CHARS` Nicht-Whitespace-
  Zeichen → OCR wird ausgelöst. Sehr kurze legitime Seiten (z.B. leere
  Deckblätter) könnten unnötig OCR-triggern — das ist akzeptabel.
- `shutdownOcr()` terminiert den Worker und sollte beim Server-Shutdown
  aufgerufen werden.
- Worker-Spawn kann mehrere Sekunden dauern (Sprachdaten-Download bei
  Erstnutzung). Danach ist OCR schnell.
- Fallback-Kette nur aktiv wenn `OCR_LANGS` ein `+` enthält.
