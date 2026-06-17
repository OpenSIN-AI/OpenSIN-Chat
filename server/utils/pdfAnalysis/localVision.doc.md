# LocalVision

**Purpose:** Lokales multimodales Backend über Ollama (MiniCPM-V 4.6).

## Was diese Datei tut

Läuft komplett lokal (Apple Silicon / Metal): keine Cloud, keine
API-Kosten, keine Daten verlassen das Gerät.

MiniCPM-V-Eigenschaften, die hier genutzt werden:

- **High-Resolution-Tiling**: das Modell kachelt hochauflösende Bilder
  selbst — es wird die VOLLE Render-Auflösung gesendet (kein Downscale).
- **OCR-Spezialist**: liest Tabellen, Diagramme und komplexe Layouts
  direkt aus dem Bild ("sieht" das Dokument statt es zu parsen).
- **Multi-Image**: Video-Keyframes können als Sequenz übergeben werden.

**Circuit-Breaker-Pattern**: nach `FAILURE_THRESHOLD` (5) aufeinander-
folgenden Fehlern wird der Health-Check für `CIRCUIT_OPEN_MS` (5 min)
komplett übersprungen und "nicht verfügbar" zurückgegeben.

- **Open**: 5 Fehler → 5 min Ruhe, kein Dauerfeuer, sofortiger Fallback.
- **Half-open**: nach Ablauf des Open-Fensters wird ein Probe-Versuch
  erlaubt — gelingt er, schließt sich der Circuit sofort.
- **Closed**: erfolgreicher `generate()` oder Health-Check setzt
  `failureCount = 0`.

Health-Cache: positives Ergebnis wird 60s gecacht (kein `/api/tags`-Check
bei jedem Bild). Circuit-Breaker hat Vorrang VOR dem positiven Cache.

## Abhängigkeiten

- Ollama (lokal, `http://localhost:11434`)
- `fetch` (global, Node 18+)

## ENV

| ENV                                       | Default              | Bedeutung                              |
|-------------------------------------------|----------------------|----------------------------------------|
| `PDF_ANALYSIS_OLLAMA_URL`                 | `http://localhost:11434` | Ollama-Server-URL                |
| `PDF_ANALYSIS_OLLAMA_VISION_MODEL`        | `minicpm-v`          | Ollama-Modellname                       |
| `PDF_ANALYSIS_OLLAMA_TIMEOUT_MS`          | 180000               | Timeout pro Generate-Call (3 min)       |
| `PDF_ANALYSIS_OLLAMA_NUM_CTX`             | 8192                 | Context-Window-Größe                    |

## Caveats

- "Ollama läuft, aber Modell fehlt" ist ein Konfig-Fehler, KEIN
  Backend-Ausfall — wird NICHT als Circuit-Failure gezählt (sonst
  würde der Breaker bei fehlendem `ollama pull` dauerhaft blockieren).
- Leere Ollama-Antwort (`""`) zählt NICHT als Fehler — könnte ein
  legitimes "nichts zu sagen" sein (User-Prompt-Fehler würden sonst
  fälschlich den Circuit öffnen).
- `reset()` ist nur für Tests/manuelles Recovery — nicht in
  Produktionscode aufrufen.
- `temperature: 0` wird fest im Generate-Call gesetzt (deterministisch).
