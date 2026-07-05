# server/endpoints/workspacesParsedFiles.js

Endpoints for parsed workspace files, including chat drag-and-drop uploads
that are staged before being embedded into a workspace.

## What this file does

Registers the `/workspace/:slug/...` routes used by the chat file attachment
flow:

- `GET /workspace/:slug/parsed-files` — lists parsed files for a workspace or
  thread, plus context-window metadata used by the upload warning modal.
- `DELETE /workspace/:slug/delete-parsed-files` — removes staged parsed-file
  records.
- `POST /workspace/:slug/embed-parsed-file/:fileId` — moves a staged parsed file
  into the document store and embeds it.
- `POST /workspace/:slug/parse` — receives a single file from the chat
  dropzone and (by default) responds **202 with a `jobId` immediately** once
  the file is on local disk. Parsing runs in a background job. Pass
  `?sync=true` for the legacy blocking behavior (waits for parsing and
  returns `files` directly) — kept for API back-compat.
- `GET /workspace/:slug/parse-status/:jobId` — polls the status of an async
  parse job (`pending` | `processing` | `completed` | `failed`). On
  `completed` the response includes the parsed-file rows; on `failed` a
  user-facing error message.

## Key behavior

The chat upload (`/workspace/:slug/parse`) streams the physical file to the
**collector hotdir** (`collector/hotdir/`) via multer diskStorage because the
collector needs to read it from there.

**Async job pattern:** the HTTP response returns as soon as the file is
received — collector parsing (including OCR, which can take minutes for large
scanned PDFs), parsed-file DB rows, the FilesystemSidebar uploads mirror, and
the Supabase durability mirror all run in a background job
(`server/utils/parseJobs`). This means no reverse proxy (Cloudflare, nginx)
can kill the connection mid-parse anymore. Jobs are in-memory with a 15-minute
TTL after completion; a restart mid-parse means the user re-uploads.

Two best-effort mirrors run in the background after a successful parse:

- **Uploads mirror** — copies the file into `server/storage/uploads/` (or
  `$STORAGE_DIR/uploads/`) so it appears in the FilesystemSidebar under the
  **Uploads** root (Issue #271).
- **Supabase mirror** — when `SUPABASE_STORAGE_ENABLED=true`, mirrors the file
  into the `documents` bucket via `mirrorToSupabase()` for durability. This is
  fully decoupled from the request path — the client never waits for the
  OCI → Supabase roundtrip.

Failures of either mirror are logged but never fail the parse job.

## Files that depend on this

- `frontend/src/models/workspace.js` — calls `uploadAndParseFile` (XHR with
  upload progress) + `parseFileStatus` (polling), plus `parseFile` (legacy),
  `embedParsedFile`, `deleteParsedFiles`, and `getParsedFiles`.
- `frontend/src/components/WorkspaceChat/ChatContainer/DnDWrapper/index.tsx` —
  drops files into the chat, uploads with progress, then polls the job status.
- `server/utils/files/multer.js` — provides the `handleFileUpload` middleware
  and the decoupled `mirrorToSupabase` helper used by the parse route.
- `server/utils/parseJobs/index.js` — in-memory job store for async parsing.
- `server/utils/collectorApi/index.js` — parses the uploaded document.
- `server/models/workspaceParsedFiles.js` — creates/retrieves parsed-file
  records.

## Known caveats

- The sidebar mirror is intentionally separate from the parsed-file database
  record. Deleting a parsed-file record does **not** delete the mirrored file
  from `uploads/`; use the FilesystemSidebar delete action or
  `/utils/delete-item` for that.
- The mirrored filename is the sanitized multer filename (`<uuid>_<name>`),
  which is the same file the collector processed.
- Concurrent uploads with the same original name receive different UUIDs, so
  they do not overwrite each other in `uploads/`.
