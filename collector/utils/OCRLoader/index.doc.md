# OCRLoader

## Purpose

OCR (Optical Character Recognition) für gescannte PDFs und Bilder im Collector.
Wird als Fallback aufgerufen, wenn pdfjs keinen Text-Layer extrahieren kann
(z.B. bei gescannten Dokumenten, Bild-PDFs, Fotos).

## OCR Engine: NVIDIA NIM Vision API (State of the Art, Juli 2026)

Primäre OCR-Engine: **NVIDIA NIM Vision API** mit dem
`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` Modell.

- **API**: OpenAI-kompatibel `/v1/chat/completions` at `integrate.api.nvidia.com`
- **Input**: Base64-kodierte PNG-Bilder der PDF-Seiten
- **Output**: Extrahierter Text mit Layout- und Lesereihenfolge-Erhaltung
- **Speed**: <1 Sekunde pro Seite (Cloud-GPU-Inferenz)
- **Auth**: `NVIDIA_NIM_API_KEY` (kostenlos via build.nvidia.com)
- **Native OCR**: Document Intelligence, Tabellen, Diagramme, komplexe Layouts
- **Kein lokaler Modelldownload**, keine CDN-Abhängigkeit, kein Worker-Bootstrap

### Fallback: tesseract.js

Wenn `NVIDIA_NIM_API_KEY` nicht gesetzt ist oder die API unerreichbar ist,
fällt das System automatisch auf tesseract.js zurück (lokale OCR-Engine).

### Env-Variablen

| Var | Default | Beschreibung |
|-----|---------|-------------|
| `OCR_ENGINE` | `nim` | `nim` (NVIDIA NIM) oder `tesseract` (Fallback) |
| `NVIDIA_NIM_API_KEY` | (unset) | NGC API Key für NIM Vision |
| `NVIDIA_NIM_MODEL` | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` | Vision-Modell |
| `NVIDIA_NIM_BASE_URL` | `https://integrate.api.nvidia.com/v1` | API-Endpoint |
| `NVIDIA_NIM_TIMEOUT_MS` | `120000` | Request-Timeout |
| `NVIDIA_NIM_MAX_TOKENS` | `4096` | Max Output-Tokens pro Seite |
| `NVIDIA_NIM_CONCURRENCY` | `4` | Parallele API-Requests |
| `OCR_WORKER_BOOTSTRAP_TIMEOUT_MS` | `60000` | Tesseract Worker-Bootstrap-Timeout |
| `OCR_TESSDATA_PATH` | (unset) | Lokaler tessdata-Pfad (Offline-Tesseract) |
| `OCR_CORE_PATH` | (unset) | Lokaler Tesseract-Core-Pfad |

## API

### `ocrPDF(filePath, options)`
OCR für ein gesamtes PDF-Dokument. Seiten werden zu PNG gerendert und
parallel (Batch `NIM_CONCURRENCY`) an die NIM Vision API gesendet.

### `ocrImage(filePath, options)`
OCR für eine einzelne Bilddatei.

### `ocrImageBatch(filePaths, options)`
OCR für mehrere Bilddateien in einem Aufruf (parallelisierte Batches).

## Architektur

```
PDF-Seite → sharp (PNG-Render) → Base64 → NVIDIA NIM Vision API → Text
                                          ↓ (Fallback bei Fehler)
                                          tesseract.js (lokal)
```
