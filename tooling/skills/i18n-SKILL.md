# i18next (i18n) Skill for OpenSIN Chat

This document provides guidance for working with i18next translations in the OpenSIN Chat project.

## Overview

The project uses **i18next** for multi-language support with:
- Two languages: `en` (English) and `de` (German)
- Locale files: `frontend/src/locales/{en,de}/common.js`
- Configuration: `frontend/src/i18n.ts`
- Verification: `frontend/src/locales/verifyTranslations.mjs`

## Critical Setup Requirements

### 1. i18n Initialization in main.tsx

**MUST** import i18n in `frontend/src/main.tsx` before React renders:

```tsx
import "@/i18n";  // Import BEFORE any components
```

Without this, i18next is not initialized and all translation keys render as raw strings (e.g., "onboarding.home.welcome" instead of "Welcome").

### 2. Language Detection Configuration

The browser's language is detected automatically (e.g., `en-US`, `de-DE`), but resources are registered only as base codes (`en`, `de`). The i18n config MUST normalize detected languages:

```typescript
detection: {
  convertDetectedLanguage: (lng: string) => lng.split("-")[0],
}
```

Without this normalization, `en-US` won't match the `en` resource and falls back to raw translation keys.

### 3. useTranslation Hook in React Components

Every React component that calls `t()` **MUST** use the `useTranslation()` hook:

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <div>{t("namespace.key")}</div>;
}
```

Sub-components and nested functions must either:
- Call `useTranslation()` themselves
- Receive `t` as a prop
- Use `i18n.t()` directly (import default from `@/i18n`)

Failing to do this causes runtime crashes: `'t' is not defined`.

## Common Issues & Fixes

### Issue: Raw translation keys display ("onboarding.home.welcome" instead of "Welcome")

**Causes:**
1. i18n not imported in `main.tsx` → run `npm run lint` to find and add `import "@/i18n"`
2. Language mismatch (`en-US` detected but only `en` resource exists) → verify `convertDetectedLanguage` in `i18n.ts`
3. Key doesn't exist in locale file → run `node src/locales/verifyTranslations.mjs` and add missing keys

**Fix:**
```bash
# Verify all keys match between en and de
cd frontend && node src/locales/verifyTranslations.mjs

# Check build for errors
npm run build

# Lint for missing useTranslation hooks
npm run lint
```

### Issue: 't is not defined' runtime error

**Cause:** React component calls `t()` without importing and calling `useTranslation()`.

**Fix:** Add hook to component:
```tsx
import { useTranslation } from "react-i18next";

function ComponentName() {
  const { t } = useTranslation();
  // Now t() can be used
}
```

For non-component functions, import and use the instance directly:
```tsx
import i18n from "@/i18n";

function plainFunction() {
  return i18n.t("key");
}
```

### Issue: Duplicate top-level keys in locale files

**Cause:** When merging translation blocks, duplicate keys at the object root override earlier definitions:

```js
const TRANSLATIONS = {
  onboarding: { /* first definition with many keys */ },
  // ... later ...
  onboarding: { /* second definition overwrites the first completely */ }
}
```

**Prevention:** ESLint catches this with `no-dupe-keys` rule. Never manually edit locale files to have duplicate top-level keys.

**Fix (if it happens):**
```bash
# Use AST-based deep merge to combine duplicate blocks
node scripts/dedupe-locale.mjs frontend/src/locales/en/common.js
node scripts/dedupe-locale.mjs frontend/src/locales/de/common.js

# Verify no keys were lost
node src/locales/verifyTranslations.mjs
```

## Adding New Translation Keys

### Step 1: Add to English first

Edit `frontend/src/locales/en/common.js` and add your key under the appropriate namespace:

```js
export const TRANSLATIONS = {
  myNamespace: {
    myKey: "English text",
  },
  // ...
}
```

### Step 2: Add German translation

Edit `frontend/src/locales/de/common.js` and add the same key with German text:

```js
export const TRANSLATIONS = {
  myNamespace: {
    myKey: "Deutscher Text",
  },
  // ...
}
```

### Step 3: Verify consistency

```bash
cd frontend && node src/locales/verifyTranslations.mjs
```

This ensures all keys in `en` exist in `de` and vice versa. If there's a mismatch, add the missing key to the other file.

### Step 4: Use in component

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  return <p>{t("myNamespace.myKey")}</p>;
}
```

## Lint & Build Validation

### Pre-commit checklist

Always run before committing:

```bash
cd frontend

# Verify translations are consistent
node src/locales/verifyTranslations.mjs

# Lint for i18n issues (no-dupe-keys, no-undef for 't')
npm run lint

# Build to catch runtime errors
npm run build
```

### Common lint errors in i18n context

| Error | Cause | Fix |
|-------|-------|-----|
| `'t' is not defined` | Component calls `t()` without `useTranslation()` | Add `const { t } = useTranslation()` |
| `no-dupe-keys` | Duplicate top-level keys in locale file | Use dedupe script or manually merge blocks |
| Translation structure mismatch | `en` and `de` have different key hierarchies | Run verify script and add missing keys |

## Files & Structure

```
frontend/
├── src/
│   ├── i18n.ts                    # i18next config & initialization
│   ├── locales/
│   │   ├── resources.js           # Language resources registry
│   │   ├── verifyTranslations.mjs # Consistency checker
│   │   ├── en/
│   │   │   └── common.js          # English translations (all namespaces)
│   │   └── de/
│   │       └── common.js          # German translations (all namespaces)
│   └── main.tsx                   # App entry (MUST import i18n)
└── scripts/
    └── dedupe-locale.mjs          # Helper: merge duplicate locale keys
```

## Resources

- [i18next docs](https://www.i18next.com/)
- [react-i18next docs](https://react.i18next.com/)
- [Browser Language Detection](https://github.com/i18next/i18next-browser-languageDetector)

## When to Escalate

Contact the team if:
- Translation keys are systematically missing across many components
- i18next module fails to load (check build errors)
- Language detection inconsistencies persist after applying fixes
- Performance issues with large locale files
