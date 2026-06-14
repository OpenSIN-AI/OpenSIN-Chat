# collector/utils/paths.js

Centralized path helpers for the document collector side of OpenSIN-Chat.

## What this file does

Mirrors `server/utils/paths.js` for the collector process. It resolves paths
inside the shared storage directory and the collector's own `hotdir`, using the
same `STORAGE_DIR` environment variable so both processes agree on where files
live.

## Exports

| Helper | Purpose |
|--------|---------|
| `getStoragePath(...subdirs)` | Resolve a path under `STORAGE_DIR` (Docker) or `<repo>/server/storage` (dev). |
| `getCollectorPath(...subdirs)` | Resolve a path under the collector directory derived from `STORAGE_DIR` or `<repo>/collector`. |
| `safeStorageJoin(...subdirs)` | Like `getStoragePath` but throws if the result escapes the storage root. |
| `safeCollectorJoin(...subdirs)` | Like `getCollectorPath` but throws if the result escapes the collector root. |
| `ensureStorageDir(...subdirs)` | `safeStorageJoin` + `mkdirSync(..., { recursive: true })`. |
| `pathsHealth()` | Snapshot of storage/collector paths for status endpoints. |

## Important config values

- `process.env.STORAGE_DIR` — optional absolute path. When unset the helpers fall
  back to the repo-relative directories listed above.
- Fallbacks are pinned by `collector/__tests__/utils/paths.test.js`; change them
  together with the tests.

## Files that depend on this

- `collector/utils/files/index.js`
- `collector/utils/WhisperProviders/localWhisper.js`
- `collector/utils/comKey/index.js`
- `collector/utils/OCRLoader/index.js`
- `collector/utils/extensions/Confluence/index.js`
- `collector/utils/extensions/RepoLoader/GithubRepo/index.js`
- `collector/utils/extensions/RepoLoader/GitlabRepo/index.js`

## Usage example

```js
const { getStoragePath, getCollectorPath } = require("../utils/paths");
const hotdir = getCollectorPath("hotdir");
const docDir = getStoragePath("documents", workspaceSlug);
```

## Known caveats

- `safeStorageJoin` / `safeCollectorJoin` do **not** follow symlinks.
- `getStoragePath` falls back to `<repo>/server/storage` (not
  `<repo>/collector/storage`) because the collector and server share the same
  storage root.
