# `index.js` — Collector file utilities

Companion to `collector/utils/files/index.js`.

## What it does

Helper functions for reading, writing, and managing files in the collector:

- `documentPath` / `directUploadPath` — resolve storage paths for documents and direct uploads.
- `createDocument` / `createDirectUpload` — write uploaded files to disk with UUID-based filenames.
- `fileInfo` — get metadata (name, MIME type, size) for a file.
- `moveFile` — relocate files between directories.
- `isTextType` — detect whether a file is text using MIME type and buffer inspection.
- `wipeCollectorStorage` — clean the collector hot directory and tmp storage on startup.

## Dependencies

- Imported by `collector/index.js` and other collector routes.
- Uses `getStoragePath()` and `getCollectorPath()` from `collector/utils/paths.js`.
- Relies on `MimeDetector` from `./mime.js` for content-type detection.

## Important behavior

- `wipeCollectorStorage()` runs on startup and deletes temporary files from the hot directory and `tmp/` storage.
- **The tmp-directory readdir error is handled**: if `tmp/` does not exist (fresh install / new container), the cleanup step resolves immediately instead of crashing on an undefined `files` array.
- All file operations are synchronous (`fs.*Sync`) and local.

## Known caveats

- Uses synchronous file I/O; should not be invoked inside parallel hot-paths with many files.
- `wipeCollectorStorage` deletes files unconditionally — callers must ensure the target directories are correct.
