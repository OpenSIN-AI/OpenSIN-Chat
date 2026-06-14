# Playwright E2E configuration

**Docs:** `playwright.config.js`

This is the minimal Playwright configuration for the frontend end-to-end tests.
It assumes the dev server (or a production build) is already running at the URL
configured via `APP_URL` (default: `http://localhost:3001`).

## Why this file exists

The root `package.json` already declares `playwright` as a dependency, so the
project can run E2E tests without installing anything new. This config wires
that dependency to the `frontend/tests/e2e` directory and runs tests in Chromium
on desktop.

## How to run

```bash
cd frontend
npx playwright test
```

Override the target URL:

```bash
APP_URL=http://localhost:8080 npx playwright test
```

## Important values

- `testDir`: `./tests/e2e`
- `baseURL`: `process.env.APP_URL || "http://localhost:3001"`
- `projects`: only `chromium` / `Desktop Chrome`
- `trace`: `on-first-retry`
- `screenshot`: `only-on-failure`

## Caveats

- The config does **not** start a dev server for you. The backend and frontend
  must already be running.
- Tests run in English locale by default. Individual tests set
  `localStorage.i18nextLng = "en"` if they rely on English labels.
