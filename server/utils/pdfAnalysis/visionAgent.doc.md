# VisionAgent

**Purpose:** Beschreibt Bildinhalte über das konfigurierte Vision-Backend.

## Was diese Datei tut

Backend-Auswahl via `PDF_ANALYSIS_VISION_BACKEND`:

- **`ollama`**: lokales MiniCPM-V 4.6 über Ollama (Mac, kostenlos, privat).
  Bei Nichtverfügbarkeit: KEIN Cloud-Fallback (Privacy-Modus — Bild
  wird übersprungen).
- **`cloud`**: multimodaler LLM-Provider des Forks (OpenAI, Anthropic, …).
  Exponentieller Backoff + Jitter für transiente Fehler. Erkennt
  nicht-multimodale Provider und gibt `null` zurück.
- **`auto`** (Default): lokal wenn verfügbar, sonst Cloud.

Die öffentliche API (`describeImage`) bleibt unverändert — pdfReader,
mediaAdapters und CrossCheck funktionieren ohne Anpassung.

`describeImageSequence()`: Keyframe-SEQUENZ als Ganzes analysieren
(MiniCPM-V Multi-Image) — besseres zeitliches Verständnis als
Frame-für-Frame. Nur lokal verfügbar; Cloud-Fallback: `null`.

## Abhängigkeiten

- `../helpers` — `getLLMProvider()` (für Cloud-Pfad)
- `./config` — `LLM_TEMPERATURE`
- `./localVision` — `generate()`, `isAvailable()` (für lokalen Pfad)

## ENV

| ENV                            | Default | Bedeutung                                       |
|--------------------------------|---------|-------------------------------------------------|
| `PDF_ANALYSIS_VISION`          | `true`  | Vision insgesamt aktivieren/deaktivieren         |
| `PDF_ANALYSIS_VISION_BACKEND`  | `auto`  | Backend: `ollama` | `cloud` | `auto`            |
| `PDF_ANALYSIS_LLM_RETRIES`     | 4       | Max. Retry-Versuche (Cloud-Pfad)                 |
| `PDF_ANALYSIS_LLM_BACKOFF_MS`  | 2000    | Basis-Verzögerung für Backoff (Cloud-Pfad)       |

## Caveats

- Im `ollama`-Modus wird bewusst NICHT in die Cloud ausgewichen —
  Privacy. Fehlt das lokale Modell, wird das Bild übersprungen (`null`).
- Cloud-Pfad erkennt nicht-multimodale Provider anhand von Error-Messages
  (`image`, `vision`, `multimodal`, `content must be a string`) und gibt
  sofort `null` zurück (kein sinnloses Retry).
- `describeImageSequence` gibt `null` zurück, wenn `VISION_BACKEND=cloud`
  (Cloud-Provider unterstützen keine Multi-Image-Sequenz in einem Call).
- Bild wird als `data:${mime};base64,...`-URL an den Cloud-Provider gesendet.
