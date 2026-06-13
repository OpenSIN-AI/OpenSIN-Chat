# `mockExpressApp.js` — Express test harness

Companion to `server/__tests__/helpers/mockExpressApp.js`.

## What it does

Provides a lightweight in-memory replacement for Express so backend endpoint modules can be unit-tested without opening a TCP port.

- `createMockApp()` — registers routes and exposes a `call(method, path, req)` helper.
- `createMockRes()` — builds a mock response object that captures status, body, headers, and `ended` state.

## How middleware works

Routes are registered with Express-style signatures: `app.post(path, [middleware], finalHandler)`. The harness ignores the middleware array and captures only the final handler. This keeps tests focused on the endpoint logic; auth and other middleware is mocked separately in each test file.

## Usage example

```js
const { createMockApp } = require("../helpers/mockExpressApp");
const { systemEndpoints } = require("../../endpoints/system");
const app = createMockApp();
systemEndpoints(app.app);
const res = await app.call("post", "/onboarding");
expect(res.statusCode).toBe(200);
```

## Dependencies

- Used by almost every `server/__tests__/endpoints/*.test.js` file.
- Works with mocked middleware (auth, multer, etc.) defined in each test file.

## Known caveats

- Does not support advanced Express features (e.g., `res.redirect`, streaming, parameter coercion).
- `request.header` defaults to `"Bearer test-key"` for convenience.
