# Collector Input/Output Contracts

> Version 1.0 — 2026-07-23

The collector is an isolated document worker. It communicates with the server
via HTTP API only. No direct DB access, no shared state.

## Input Contract: POST /convert

```json
{
  "filename": "document.pdf",
  "filetype": "application/pdf",
  "metadata": {
    "workspaceId": 1,
    "docId": "uuid-here",
    "source": "upload|link|connector"
  }
}
```

## Output Contract: JSON Response

```json
{
  "success": true,
  "error": null,
  "documents": [
    {
      "pageContent": "extracted text...",
      "metadata": {
        "docId": "uuid-here",
        "source": "upload",
        "chunkIndex": 0,
        "title": "document.pdf"
      }
    }
  ]
}
```

## Supported File Formats

| Format | Converter | Status |
|---|---|---|
| PDF | asPDF/PDFLoader | KEEP |
| DOCX | asDocx | KEEP |
| XLSX | asXlsx | KEEP |
| EPUB | asEPub (@langchain) | KEEP |
| TXT/MD | asTxt | KEEP |
| Image (PNG/JPG) | asImage (OCR via Tesseract) | KEEP |
| Audio (WAV/MP3) | asAudio (Whisper) | KEEP |
| MBOX | asMbox | KEEP |
| Office MIME | asOfficeMime | KEEP |

## Data Connectors (Extensions)

| Connector | Status |
|---|---|
| YoutubeTranscript | KEEP |
| Confluence | KEEP |
| DrupalWiki | KEEP |
| PaperlessNgx | KEEP |
| RepoLoader (GitHub/GitLab) | KEEP |
| ObsidianVault | KEEP |
| WebsiteDepth | KEEP |
| AfDPresse | KEEP (OpenSIN-specific) |
| BundestagDrucksachen | KEEP (OpenSIN-specific) |

## Removed Dependencies

| Package | Reason |
|---|---|
| epub2 (Mintplex-Labs fork) | Unused — @langchain/community handles epub |
| moment | Unused — no date formatting in collector |
| nodemailer | Unused — no email sending in collector |
| fix-path | Unused — no macOS path fixing needed |
| strip-ansi | Unused |
| youtube-transcript-plus | Unused — youtubei.js handles transcripts |
