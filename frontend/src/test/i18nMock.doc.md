# i18nMock.js

Provides a `createI18nMock()` helper that builds a `react-i18next` mock backed by the real English translation files, so tests continue to see the actual rendered text after the i18next migration.

## Files that use it

- `src/components/WorkspaceChat/ChatContainer/ChatHistory/Citation/index.test.jsx` — imports `createI18nMock` and passes it to `vi.mock("react-i18next", ...)`, overriding the global mock for that file.

## Why it exists

Before the i18next migration, some test files defined their own `vi.mock("react-i18next", ...)` mocks that only returned a small, hard-coded subset of translation keys. After the migration, those mocks no longer matched the real translation structure, so assertions that looked for rendered text started failing. `createI18nMock()` solves this by loading the actual `en` translations from `src/locales/en/common.js` and returning them through the `react-i18next` `useTranslation` hook.

## How to use it

In a test file that needs its own mock:

```js
import { createI18nMock } from "@/test/i18nMock";

vi.mock("react-i18next", () => createI18nMock());
```

This replaces the global mock with one that returns real English strings for the test file.

## Limitations

- Interpolation is limited to simple `{{variable}}` placeholders.
- Plurals, nested objects beyond the dot-notation lookup, and other advanced i18next features are not supported.
- If a key is missing, the mock falls back to returning the key itself.

## Relationship to `src/test/setup.js`

`src/test/setup.js` installs a global `react-i18next` mock using the same `createI18nMock()` helper, so most tests do not need to import this file directly. However, a per-file `vi.mock("react-i18next", ...)` call in a test file takes precedence over the global mock, so files that need special behavior (or that previously had their own mock) import `createI18nMock` directly and use it inside `vi.mock`.
