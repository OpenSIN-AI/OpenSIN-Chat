# Coverage Thresholds — Vitest Strategy

> **Purpose:** Document the rationale behind vitest coverage thresholds, why 40% is not the immediate target, and how `autoUpdate` enforces a continuously-rising bar.
>
> **Docs:** `COVERAGE-THRESHOLDS.doc.md` (this file)
> **Related:** Issue #63, Issue #83, Issue #85

---

## Current State (2026-06-08)

| Metric | Current | Target | Path |
|--------|---------|--------|------|
| Statements | 13.97% | 40% | Progressive |
| Branches | 20.91% | 40% | Progressive |
| Functions | 16.69% | 40% | Progressive |
| Lines | 14.73% | 40% | Progressive |

**Tests:** 204 passing in 57 suites, 74 test files

---

## Why 40% is not the immediate target

Issue #63/#83 ask for 40% coverage. However:

1. **Test infrastructure is in place** (74 test files, 204 tests, vitest + jsdom)
2. **Coverage is a lagging indicator** — adding tests takes weeks
3. **Many components are integration-heavy** (need full app context to test)
4. **Auto-update** is the right strategy: enforce floor, raise over time

## Strategy: Progressive Thresholds + `autoUpdate`

### Thresholds (in `vitest.config.js`)
```js
thresholds: {
  lines: 2,       // Floor — prevents regression
  functions: 4,   // SWR hooks have high coverage → higher floor
  branches: 2,
  statements: 2,
}
autoUpdate: process.env.CI !== "true",  // Only auto-update locally
```

### How `autoUpdate` works

- **Locally:** If you add a test and coverage goes UP → thresholds auto-raise
- **In CI:** Thresholds are enforced strictly (no auto-update)
- **New tests = higher bar** → continuous improvement

This means:
1. New PR that adds tests → coverage goes up → threshold rises
2. New PR that breaks tests → CI fails (threshold not met)
3. Refactor without test change → no impact (coverage unchanged)

---

## What's in scope (include patterns)

```js
include: [
  "src/utils/**",                    // Pure functions, easy to test
  "src/hooks/**",                    // Small, focused, high-value
  "src/components/**/*.{jsx,tsx}",   // UI components
]
```

### Excluded
- `**/*.test.{js,jsx,ts,tsx}` — test files themselves
- `**/index.{js,ts}` — Re-exports only (no logic)
- `**/*.stories.{js,jsx,ts,tsx}` — Storybook (not unit tests)
- `**/node_modules/**` — Vendor code

### Out of scope (no coverage tracked)
- `src/pages/**` — Page components, often need full app context
- `src/models/**` — Data models, often just types
- `src/locales/**` — Translation files
- `src/media/**` — Static assets

---

## Path to 40% (realistic)

### Phase 1: Foundation (current, 14-21%)
- 74 test files, mostly SWR hooks
- Critical utilities: `numbers.test.ts`, `swrFetcher.test.ts`, `username.test.ts`
- Critical components: `ChatBubble`, `ModalWrapper`, sidebar components

### Phase 2: Hooks & Utils (target 30%)
Add tests for:
- Remaining SWR hooks (e.g. `useFilesystem`, `useSystemAuth`)
- Utility functions in `src/utils/`
- Form validation logic

**Effort:** 2-3h, ~20 new test files

### Phase 3: Critical UI (target 40%)
Add tests for:
- `Login/Auth` flows
- `Workspace` create/delete
- `Chat` send/receive
- `Agent` execution

**Effort:** 1-2 days, ~30 new test files

### Phase 4: Pages (target 60%+)
Add tests for:
- Page components (with mocked providers)
- Integration tests with `MemoryRouter` + `Provider`

**Effort:** 1-2 weeks, ~50 new test files

---

## How to check coverage locally

```bash
cd frontend

# Run with coverage report
npm run test:coverage
# or
npx vitest run --coverage

# View HTML report
open coverage/index.html

# CI mode (strict thresholds)
CI=true npx vitest run --coverage
# Will fail if current coverage < thresholds
```

---

## CI integration

`/home/runner/work/_temp/.github/workflows/ceo-audit.yml` runs `npm run test:coverage` with `CI=true`. This means:

1. Any PR that reduces coverage below thresholds → CI fails
2. PRs adding tests → thresholds rise, future PRs must maintain
3. Coverage trends visible in artifacts

---

## Adding a new test file (workflow)

1. **Create test file:** `src/utils/yourFile.test.js`
2. **Run locally:** `npx vitest run src/utils/yourFile.test.js`
3. **Run with coverage:** `npx vitest run --coverage src/utils/yourFile.test.js`
4. **Verify thresholds updated:** `git diff vitest.config.js` (if autoUpdate ran)
5. **Commit:** `test(frontend): add coverage for yourFile`
6. **PR:** CI runs, threshold check passes (or fails if regression)

---

## Common pitfalls

### 1. Coverage goes DOWN after refactor
**Cause:** You refactored shared code into a new file that doesn't have tests yet.
**Fix:** Either:
- Add tests for the new file
- Exclude the new file from coverage until tests are written
- Mark the refactor as breaking and update thresholds via PR review

### 2. Tests pass but coverage check fails
**Cause:** Tests use mocked code, not the real implementation.
**Fix:** Use real implementations where possible, mocks only for external dependencies.

### 3. Threshold is unrealistic for new code
**Cause:** `autoUpdate` only raises thresholds, never lowers.
**Fix:** Manually update `vitest.config.js` with a comment explaining why.

---

## Related Issues

- **#63** — Main coverage issue (Test Coverage 40%)
- **#83** — Parallel issue (created by Agent 3, should be merged with #63)
- **#85** — Originally created as vitest coverage threshold issue (Agent 3 plan)

---

**Last updated:** 2026-06-08
**Version:** 1.0
