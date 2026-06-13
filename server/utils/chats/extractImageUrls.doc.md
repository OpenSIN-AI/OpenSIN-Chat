# extractImageUrls.js

Extracts unique URLs from base64-encoded image attachments using Tesseract OCR.

## What it does

- Accepts a list of image attachments (raw base64 strings or objects with a `contentString` field).
- Runs Tesseract OCR on each image to extract text.
- Matches URLs with the regex `/https?:\/\/[^\s<>"{}|\^`\[\]]+/gi`.
- Returns a de-duplicated list of URLs found across all images.

## Files that use it

- `server/utils/chats/stream.js` — normal websocket chat flow
- `server/utils/chats/apiChatHandler.js` — synchronous and streamable API chat flows

## Configuration

| Environment variable | Default | Description |
| --- | --- | --- |
| `CHAT_IMAGE_OCR_ENABLED` | `true` | Set to `false` to disable OCR entirely. |
| `CHAT_IMAGE_OCR_LANGS` | `deu+eng` | Tesseract language pack(s). |
| `CHAT_IMAGE_OCR_CACHE_SIZE` | `100` | Maximum number of OCR results cached in memory. |

## Important behavior

- A single Tesseract worker is created lazily and reused for the process lifetime.
- OCR calls are serialized through an internal queue because the worker is not thread-safe.
- Results are cached by a SHA-256 hash of the image content to avoid repeated OCR of the same image.

## Caveats

- OCR accuracy depends on image quality, resolution, font, and whether the Tesseract language data is installed.
- The URL regex is conservative. It may miss obfuscated, broken, or very long URLs that span multiple lines.
- Vision-capable providers can often read URLs directly, but OCR is used here so the feature works for non-vision models and lower-quality screenshots.
- This utility does not fetch or validate URLs; it only surfaces them for the LLM/agent to act on.
