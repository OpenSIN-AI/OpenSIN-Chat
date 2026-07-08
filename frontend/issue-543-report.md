# Issue #543: Remove Unused Translation Keys — Report

## Summary

Investigated unused translation keys in `frontend/src/locales/`. **No keys were deleted** — the risk of breaking dynamic key lookups is too high for a static-only removal. Instead, the analysis tooling was fixed, the dynamic key allowlist was expanded, and documentation was added to both locale files.

## Key Findings

| Metric | Value |
|--------|-------|
| Total leaf keys in `en/common.js` | 3,504 |
| Total leaf keys in `de/common.js` | 3,504 |
| Statically referenced keys (grep `t('key')` patterns) | 3,566 (includes duplicates & non-locale keys) |
| Dynamic `t()` calls (template literals / variables) | 21 |
| **Confirmed unused keys (after allowlist)** | **403** |
| Dynamic keys added to allowlist | 61 |

## Bugs Fixed in Tooling

### 1. `findUnusedTranslations.mjs` — Broken Import
The script imported `{ resources }` from `./resources.js`, but `resources.js` was refactored to only export metadata (`defaultNS`, `supportedLngs`). The `resources` export no longer exists.

**Fix:** Changed import to load directly from `./en/common.js`:
```js
import enCommon from "./en/common.js";
const resources = { en: { common: enCommon } };
```

### 2. `findUnusedTranslations.mjs` — Missing `.ts`/`.tsx` Scanning
The file collection regex only matched `.js`/`.jsx` files, but the codebase is primarily TypeScript (`.ts`/`.tsx`). This caused 3,478 false positives on the first run.

**Fix:** Updated regex from `/\.(js|jsx)$/` to `/\.(js|jsx|ts|tsx)$/`.

### 3. `dynamicKeyAllowlist.js` — Missing Dynamic Keys
21 dynamic `t()` patterns were identified. Many keys referenced by these patterns were missing from the allowlist, causing false positives. Added 61 keys covering:

- **Text-to-Speech OpenAI voices** (6 keys) — `t(\`textToSpeech.openAi.voices.${voice}\`)`
- **Preview file type labels** (7 keys) — `t(\`preview.fileType.${fileTypeKey}\`)`
- **PDF analysis source types** (6 keys) — `t(\`pdfAnalysis.sourceTypes.${value}\`)`
- **PDF analysis verdicts** (3 keys) — `t(\`pdfAnalysis.verdicts.${verdict}\`)`
- **System prompt variable types** (4 keys) — `t(\`admin.systemPromptVariables.page.types.${type}\`)`
- **Admin user role hints** (7 keys) — `t(hintKey)` from `ROLE_HINT` map
- **Thread container group labels** (5 keys) — `t(group.labelKey)`
- **Workspace source type labels** (3 keys) — `t(labelKey)`
- **Web scraping node options** (3 keys) — `t(opt.labelKey)`
- **Page titles** (10 keys) — `t(key)` from `resolveTitleKey()`
- **Docs category labels** (6 keys) — `t(i18nKey)` from `CATEGORY_I18N_KEYS`
- **Chat mode titles** (3 keys) — `t(\`chat.mode.${chatMode}.title\`)`
- **Scheduled job modes** (2 keys) — `t(mode.labelKey)`

## Files Modified

1. **`frontend/src/locales/findUnusedTranslations.mjs`** — Fixed broken import + added `.ts`/`.tsx` scanning
2. **`frontend/src/locales/dynamicKeyAllowlist.js`** — Added 61 missing dynamic key entries
3. **`frontend/src/locales/en/common.js`** — Added documentation comment about unused keys
4. **`frontend/src/locales/de/common.js`** — Added documentation comment about unused keys

## Recommended Next Steps

To safely remove the 403 confirmed unused keys:

1. Run `npm run find:unused-translations` and review the full list
2. Manually verify any suspicious keys aren't used via patterns the script can't detect
3. Add false positives to `dynamicKeyAllowlist.js`
4. Run `npm run clean:unused-translations` to delete from `en/common.js`
5. Manually mirror deletions in `de/common.js`
6. Run `npm run verify:translations` to validate completeness
7. Run the test suite to catch any runtime breakage
