# server/app.js

## What it does

`server/app.js` is the Express application factory for the OpenSIN-Chat server.
It exports three helpers:

- `buildApp()` — creates and wires the Express application (middleware, routes,
  static handling, 404).
- `createApp()` — singleton used by the Vitest suites in `tests/`. It returns the
  existing app on repeated calls and starts an HTTP server on the first call so
  the tests can use `fetch` against `localhost:3001`. In test mode the server
  binds to the IPv6 loopback (`::1`) to avoid the common case where port 3001 is
  already occupied on IPv4 by a local Docker/OrbStack container.
- `bootApp(app, port)` — production bootstrap used by `server/index.js`. It
  starts HTTP or HTTPS and triggers the full boot sequence (telemetry, workers,
  push notifications, etc.).

## Dependencies

- Imported by `server/index.js` (production startup).
- Imported by `tests/*.test.js` files via `import { createApp } from "../server/app"`.
- Uses virtually every endpoint module under `server/endpoints/` and boot helper
  under `server/utils/boot/`.

## Important config values

- `FILE_LIMIT` defaults to `5120MB` for `body-parser` (mirrors the historical
  AnythingLLM default). Lower this in production via `BODY_LIMIT`.
- `SERVER_PORT` defaults to `3001` for the test server.
- `TRUST_PROXY` defaults to `1` for correct client IPs behind a reverse proxy.

## Design decisions

- **One source of truth:** Route wiring is no longer duplicated in
  `server/index.js`; production and tests use the same app.
- **Test-mode root mount:** In `NODE_ENV=test`, `apiRouter` is also mounted at
  `/` so the test suites (which call `/ping`, `/system/...`, etc.) work without
  changing every test file.
- **Production static branch:** The frontend catch-all (`MetaGenerator`) and
  static file serving are skipped in both `development` and `test` to avoid
  shadowing the API routes.
- **WebSocket setup:** `express-ws` is initialized in non-test mode before
  `agentWebsocket(app, "/api")` so the `.ws` route is always registered. In HTTPS
  mode, `bootSSL` re-initializes `express-ws` with the actual HTTPS server so
  WebSocket upgrades are handled by the listening server.

## Usage

```js
const { createApp } = require("./server/app");
const app = createApp(); // tests: also starts HTTP server
```

```js
const { buildApp, bootApp } = require("./server/app");
const app = buildApp();
bootApp(app, 3001);
```

## Caveats

- `createApp()` intentionally skips the full production boot sequence; do not
  use it for production.
- The test server is a singleton to avoid `EADDRINUSE` when multiple Vitest test
  files run in the same process.
- `agentWebsocket` logs a warning in test mode because `express-ws` is not
  initialized; no WebSocket routes are registered in tests.
