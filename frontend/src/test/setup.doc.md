# `setup.js` — Global Vitest Setup

Companion for `frontend/src/test/setup.js`.

## What does this file do?

Runs once before every test file in the Vitest frontend suite. It registers the
`jest-dom` matchers, mocks `window.localStorage` (jsdom does not ship with a
working implementation), and resets the DOM and mock call state between tests.

## What does it NOT do?

It does **not** mock `react-i18next`. Each test file that renders UI components
is responsible for mocking `react-i18next` itself, usually through the shared
`createI18nMock` helper from `@/test/i18nMock`.

## Why this design?

- Centralized DOM / browser mocks avoid repetition across hundreds of tests.
- Per-file i18n mocks keep translation tests explicit and prevent global mock
  leakage between components that might need different translation behavior.

## Important config / caveats

- `afterEach` calls `cleanup()` from `@testing-library/react` and
  `vi.clearAllMocks()` to isolate tests.
- `window.localStorage` is defined as a writable mock so modules that read it
  during import do not throw.

## Usage

No manual invocation needed; Vitest loads this file automatically via the
`setupFiles` entry in `vite.config.js`.
