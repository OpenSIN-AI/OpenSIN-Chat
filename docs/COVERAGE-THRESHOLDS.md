# Coverage Thresholds — Vitest Strategy

> **Purpose:** Document the current vitest coverage thresholds and the path to higher coverage.
>
> **Docs:** `COVERAGE-THRESHOLDS.doc.md` (this file)
> **Related:** Issue #82, Issue #101 (geschlossen), Issue #110 (geschlossen)

---

## Current State (2026-06-14)

| Metric | Current | Threshold | Status |
|--------|---------|-----------|--------|
| Statements | 52.09% | 20% | ✅ |
| Branches | 52.29% | 20% | ✅ |
| Functions | 51.36% | 20% | ✅ |
| Lines | 52.52% | 20% | ✅ |

**Tests:** 1.335+ passing in 187 frontend test files; 1.756+ passing in 104 server test suites; zusätzliche Vitest-Integrationstests in `tests/`.

---

## Strategy: Feste Thresholds, keine `autoUpdate`

Die Thresholds in `frontend/vitest.config.js` sind auf **20%** gesetzt und `autoUpdate` wurde entfernt. Damit:

- Jeder PR, der die Coverage unter 20% drückt, failt in CI.
- Neue Tests müssen die 20%-Marke weiterhin erfüllen, aber nicht automatisch neue, höhere Mindestwerte erzwingen.
- Thresholds werden bewusst per PR angehoben, sobald die Coverage nachhaltig steigt.

### Thresholds (in `frontend/vitest.config.js`)

```js
thresholds: {
  lines: 20,
  branches: 20,
  functions: 20,
  statements: 20,
}
```

---

## What's in scope (include patterns)

```js
include: [
  "src/utils/**",                    // Pure functions
  "src/hooks/**",                    // SWR hooks
  "src/components/**/*.{jsx,tsx}",   // UI components
]
```

### Excluded
- `**/*.test.{js,jsx,ts,tsx}` — test files themselves
- `**/index.{js,ts}` — Re-exports only
- `**/*.stories.{js,jsx,ts,tsx}` — Storybook
- `**/node_modules/**` — Vendor code

### Out of scope (no coverage tracked)
- `src/pages/**` — Page components, often need full app context
- `src/models/**` — Data models, often just types
- `src/locales/**` — Translation files
- `src/media/**` — Static assets
- CSS-/Theme-Dateien

---

## Path to higher coverage

### Phase 1: 20%-Thresholds gesichert (aktuell)
- 187 Frontend-Test-Dateien, 1.335 Tests
- 104 Server-Test-Suites, 1.756 Tests
- Alle Metriken liegen deutlich über 20%

### Phase 2: 40% (Issue #82)
- Weitere Tests für Auth, Workspace-Management, Chat-History, Page-Komponenten
- SWR-Layer weiter ausbauen
- Server-Integrationstests in `tests/` stabilisieren

### Phase 3: 60%+
- Page-Komponenten mit gemockten Providern testen
- E2E-Tests mit Playwright ausbauen

---

## How to check coverage locally

```bash
cd frontend

# Run with coverage report
npm run test:coverage

# View HTML report
open coverage/index.html

# CI mode (strict thresholds)
CI=true npx vitest run --coverage
```

---

## CI integration

`.github/workflows/tests.yml` und `.github/workflows/ceo-audit.yml` laufen `npm run test:coverage` mit `CI=true`. Das bedeutet:

1. Jeder PR, der die Coverage unter 20% drückt → CI fails.
2. Neue Tests müssen die Thresholds einhalten.
3. Coverage-Trends sind in den Artefakten sichtbar.

---

## Adding a new test file (workflow)

1. **Create test file:** `src/utils/yourFile.test.js`
2. **Run locally:** `npx vitest run src/utils/yourFile.test.js`
3. **Run with coverage:** `npx vitest run --coverage src/utils/yourFile.test.js`
4. **Commit:** `test(frontend): add coverage for yourFile`
5. **PR:** CI runs, threshold check passes

---

## Related Issues

- **#82** — Expand test coverage to 40% (offen)
- **#101** — 40% coverage target (geschlossen, da >40% erreicht)
- **#110** — Raise coverage thresholds (geschlossen, thresholds auf 20% gesetzt)

---

**Last updated:** 2026-06-14
**Version:** 1.1
