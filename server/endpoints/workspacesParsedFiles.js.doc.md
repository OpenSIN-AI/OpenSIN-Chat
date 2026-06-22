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
  dropzone, sends it to the collector for parsing, and creates a parsed-file
  record.

## Key behavior

The chat upload (`/workspace/:slug/parse`) stores the physical file in the
**collector hotdir** (`collector/hotdir/`) because the collector needs to read
it from there. After a successful parse, the endpoint now mirrors the file into
`server/storage/uploads/` (or `$STORAGE_DIR/uploads/`) so it appears in the
FilesystemSidebar under the **Uploads** root (Issue #271).

The mirror copy is **best-effort**:

- It only runs when the upload was written to local disk (`request.file.path`
  exists). Supabase in-memory uploads are skipped because the sidebar reads from
  local storage.
- A copy failure is logged but does **not** fail the parse request; the chat
  upload still works even if the sidebar mirror is unavailable.

## Files that depend on this

- `frontend/src/models/workspace.js` — calls `parseFile`, `embedParsedFile`,
  `deleteParsedFiles`, and `getParsedFiles`.
- `frontend/src/components/WorkspaceChat/ChatContainer/DnDWrapper/index.tsx` —
  drops files into the chat and triggers `parseFile`.
- `server/utils/files/multer.js` — provides the `handleFileUpload` middleware
  used by the parse route.
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
