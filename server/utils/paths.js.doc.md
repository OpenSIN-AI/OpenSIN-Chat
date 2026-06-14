# server/utils/paths.js

Centralized path helpers for the server side of OpenSIN-Chat.

## What this file does

Resolves filesystem paths inside the single storage directory used by the
server. Callers no longer need to guess whether `STORAGE_DIR` is set or
construct `__dirname`/`../storage` paths by hand.

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
- Fallbacks are pinned by `server/__tests__/utils/paths.test.js`; change them
  together with the tests.

## Files that depend on this

- `server/utils/files/index.js` (documents, vector-cache, direct-uploads)
- `server/utils/files/multer.js` (asset/pfp upload directories)
- `server/utils/DocumentManager/index.js`
- `server/utils/comKey/index.js`
- `server/utils/PushNotifications/index.js`
- `server/utils/MCP/hypervisor/index.js`
- `server/utils/agents/imported.js`
- `server/endpoints/api/document/index.js`
- `server/endpoints/api/reports/index.js`
- `server/endpoints/utils.js`
- `server/models/systemSettings.js`
- Most AI-provider cache modules (`server/utils/AiProviders/*/index.js`)

## Usage example

```js
const { getStoragePath, ensureStorageDir } = require("../utils/paths");
const modelsDir = ensureStorageDir("models");     // creates if missing
const reportPath = getStoragePath("generated-reports", "quarterly.pdf");
```

## Known caveats

- `safeStorageJoin` / `safeCollectorJoin` do **not** follow symlinks. A symlink
  inside the storage root that points outside will not be detected here.
- Module-level constants that call these helpers are evaluated at `require()`
  time, so `process.env.STORAGE_DIR` must be set before the module is first
  loaded in tests.
