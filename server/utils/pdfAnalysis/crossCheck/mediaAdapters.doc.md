# MediaAdapters

**Purpose:** Erweitert die Kreuz-Verifikation um visuelle Quellen.

## Was diese Datei tut

- **Bild-URL** (`content-type: image/*` oder explizit `type: "image"`):
  direkt an den Vision-Agenten (`describeImage`). MIME-Type wird aus
  der URL-Extension inferiert (`.jpg`/`.jpeg` → `image/jpeg`, sonst
  `image/png`).

- **Video-URL** (`content-type: video/*` oder explizit `type: "video"`):
  SOTA-Vorgehen "Keyframe-Sampling":
  1. Video größenbegrenzt in Temp-Datei downloaden (`MAX_VIDEO_BYTES`).
  2. ffmpeg extrahiert Szenenwechsel-Frames (`select='gt(scene,THRESHOLD)'`).
  3. Fallback bei fehlgeschlagener Szenen-Erkennung: 1 Frame alle 30s.
  4. Jeder Keyframe wird vom Vision-Agenten beschrieben.
  5. Ergebnis: zeitgestempeltes visuelles Transkript.
  6. Temp-Dateien werden in `finally` aufgeräumt.

Bei YouTube ergänzt das die bestehende Untertitel-Extraktion
(sourceAdapters) um die Bildebene.

## Abhängigkeiten

- `fs`, `os`, `path`
- `child_process` — `execFile()` (ffmpeg-Aufrufe)
- `ffmpeg-static` (optional, lazy require — `ffmpegPath()` gibt `null`
  bei Fehlen)
- `../visionAgent` — `describeImage()`

## ENV

| ENV                                       | Default         | Bedeutung                              |
|-------------------------------------------|-----------------|----------------------------------------|
| `PDF_ANALYSIS_VIDEO_MAX_FRAMES`           | 8               | Max. Keyframes pro Video                |
| `PDF_ANALYSIS_VIDEO_MAX_BYTES`            | 209715200       | Max. Download-Größe (200 MB)            |
| `PDF_ANALYSIS_VIDEO_SCENE_THRESHOLD`      | `0.3`           | ffmpeg Szenenwechsel-Schwelle           |

## Caveats

- `ffmpeg-static` ist optional — fehlt es, wirft `extractKeyframes()`
  einen klaren Error ("nicht installiert — Video-Analyse nicht verfügbar").
  Der Aufrufer (sourceAdapters) fängt dies via `loadSourceSafe` ab.
- Keyframe-Files werden einzeln nach Vision-Analyse gelöscht (`fs.unlinkSync`);
  die Video-Temp-Datei in `finally`.
- Video-Download bricht bei `MAX_VIDEO_BYTES` ab ("Anfang reicht für
  Keyframes") — der Anfang des Videos enthält meist die wichtigsten Szenen.
- `analyzeImageUrl` und `analyzeVideoUrl` erwarten, dass der Aufrufer
  bereits SSRF-Checks gemacht hat (`assertSafeUrl` in sourceAdapters).
- `analyzeVideoUrl` ist potenziell langsam (Download + ffmpeg + N×Vision).
  Bei großen Videos kann der Timeout von `execFile` (120s) greifen.
