# SourceAdapters

**Purpose:** Normalisiert beliebige Vergleichsquellen zu Text.

## Was diese Datei tut

Unterstützte Quelltypen:

- **`{ type: "pdf", path }`**: lokale PDF (über PdfReader, gestreamt,
  `validatePdfPath` sichert den Pfad).
- **`{ type: "url", url }`**: Webseite (fetch + HTML→Text). Content-Type-
  Triage: Bild/Video-URLs werden automatisch an `mediaAdapters` geroutet.
- **`{ type: "youtube", url }`**: YouTube-Video (Transkript über
  timedtext-API ohne API-Key).
- **`{ type: "text", text }`**: Roh-Text (z.B. aus Zwischenablage).
- **`{ type: "image", url }`**: Bild-URL (Vision-Agent via `mediaAdapters`).
- **`{ type: "video", url }`**: Video-URL (Keyframe-Sampling via `mediaAdapters`).

**SSRF-Schutz** für alle URL-Typen:

- Nur `http`/`https` — keine anderen Protokolle.
- DNS-Auflösung + `isPrivateIp()`-Check: keine privaten/lokalen IP-Bereiche
  (10.x, 127.x, 172.16-31.x, 192.168.x, 169.254.x, IPv6 fc/fd/fe80/::1).
- Redirects werden manuell verfolgt, Ziel erneut SSRF-geprüft.
- Antwortgröße begrenzt (`MAX_FETCH_BYTES`), Timeout via `AbortController`.

`htmlToText()`: entfernt Script/Style/Noscript, konvertiert HTML-Entities,
kollabiert Whitespace.

`loadSourceSafe()`: try/catch-Wrapper, liefert immer `{ label, text, error, source }`
— niemals throw (ein fehlerhafter Source kippt nicht die ganze Pipeline).

## Abhängigkeiten

- `dns.promises`, `net` — SSRF-Schutz
- `../pdfReader` — `PdfReader` (für PDF-Quellen)
- `../security` — `validatePdfPath()` (für PDF-Quellen)
- `./mediaAdapters` — `analyzeImageUrl()`, `analyzeVideoUrl()` (für Bild/Video)

## ENV

| ENV                                        | Default     | Bedeutung                              |
|--------------------------------------------|-------------|----------------------------------------|
| `PDF_ANALYSIS_XCHECK_MAX_FETCH_BYTES`      | 5242880     | Max. Download-Größe pro URL (5 MB)     |
| `PDF_ANALYSIS_XCHECK_FETCH_TIMEOUT_MS`     | 20000       | Fetch-Timeout (ms)                      |
| `PDF_ANALYSIS_XCHECK_MAX_SOURCE_CHARS`     | 60000       | Max. Zeichen pro Quelle (Kürzung)       |

## Caveats

- YouTube-Transkript: bevorzugt deutsche/englische Untertitel, sonst erste
  verfügbare Sprache. Videos ohne Untertitel → `Error`.
- PDF-Quellen lesen Seiten bis `MAX_SOURCE_CHARS` erreicht ist (nicht das
  ganze Dokument — CrossCheck braucht keine Volltext).
- `fetchBuffer()` (exportiert für `mediaAdapters`) kürzt auf `MAX_FETCH_BYTES`.
- User-Agent: `OpenSIN-CrossCheck/1.0` für alle Fetches.
