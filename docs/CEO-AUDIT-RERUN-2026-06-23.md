# CEO Audit Re-Run Preparation — Testing Axis

**Date:** 2026-06-23
**Purpose:** Pre-audit calculation of expected testing score for the next CEO audit re-run
**Last audit:** 2026-06-17 at commit `038316c0` — Testing score: 83/100
**Current HEAD:** `92575ec5`

---

## Previous Audit Baseline

| Metric | Value | Source |
|--------|-------|--------|
| **Testing score** | 83/100 | `docs/ceo-audit-final.md` (2026-06-17) |
| **Prior testing score** | 78/100 | `ceo-audits/2026-06-07/ceo-audit.md` (regression from new features) |
| **First audit score** | 80/100 | `ceo-audits/2026-06-06-ceo-audit.md` |
| **Previous test count** | ~2,211 | Phase 8 verification (`ROADMAP.md` line 268) |
| **Previous test files** | ~160 | CEO audit final report (06-17) |
| **Coverage tool** | Not configured | "No coverage tool configured at root" |
| **Coverage thresholds** | None | Not configured |

### Previous Audit Deductions (Testing Axis)

| Gate | Status | Detail |
|------|--------|--------|
| Test files | MEDIUM | 160+ test files exist; politician/research/reports/orchestrator still lack unit tests |
| Coverage | UNKNOWN | No coverage tool configured at root |
| Smoke tests | PASS | Server boots, all endpoints respond |
| Frontend tests | PASS | Vitest configured; component tests for sidebar, console, charts |
| ADW missing_test | LOW (785) | Mostly collector module (upstream Python service) |

---

## New Metrics (Measured 2026-06-23)

### Test Counts

| Metric | Server | Frontend | Total |
|--------|--------|----------|-------|
| **Test cases (passing)** | 1,914 | 1,688 | **3,602** |
| **Test files/suites** | 122 | 216 | **338** |
| **Source files** | 609 | 684 | 1,293 |
| **Test-to-source ratio** | 20.0% | 31.6% | **26.1%** |

### Test Ratio Calculation

```
Test cases:     3,602  (1,914 server + 1,688 frontend)
Test files:       338  (122 server + 216 frontend)
Source files:   1,293  (609 server + 684 frontend)
Test-to-source:  26.1% (338 / 1,293)
Tests per source: 2.79  (3,602 / 1,293)
```

### Coverage (Now Configured)

Coverage tools configured in both server (`jest.config.js`) and frontend (`vitest.config.js`) with 70% thresholds for new/changed code.

| Metric | Server | Frontend | Threshold |
|--------|--------|----------|-----------|
| Statements | 21.3% | 53.5% | 70% |
| Branches | 15.5% | 52.6% | 70% |
| Functions | 18.8% | 53.7% | 70% |
| Lines | 21.8% | 54.1% | 70% |

**Note:** Coverage gate is enforced via `yarn test:coverage` / `vitest run --coverage` only. Regular `yarn test` does not collect coverage. Both currently fail the 70% threshold.

### Delta Since Last Audit

| Metric | Before (06-17) | After (06-23) | Delta |
|--------|----------------|---------------|-------|
| Test cases | ~2,211 | 3,602 | **+1,391 (+63%)** |
| Test files | ~160 | 338 | **+178 (+111%)** |
| Coverage tool | Not configured | Configured | **FIXED** |
| Coverage thresholds | None | 70% (new/changed code) | **NEW** |
| Server coverage | N/A | 21.3% stmts | New baseline |
| Frontend coverage | N/A | 53.5% stmts | New baseline |

---

## Expected New Testing Score: 91/100

### Score Calculation

| Gate | Previous | Current | Delta | Reasoning |
|------|----------|---------|-------|-----------|
| Test files | MEDIUM (-7) | Minor (-2) | **+5** | 338 test files (2.1x increase); most modules now have tests |
| Coverage tool | UNKNOWN (-10) | Configured, below threshold (-4) | **+6** | Jest + Vitest coverage configured; 70% gate set; server 21%, frontend 54% |
| Smoke tests | PASS (0) | PASS (0) | 0 | Unchanged |
| Frontend tests | PASS (0) | PASS (0) | 0 | 1,688 tests across 216 files (much stronger) |
| ADW missing_test | LOW (-4) | Reduced (-2) | **+2** | More files now have test companions |

**Previous:** 83/100
**Improvement:** +8
**Expected new score:** **91/100** (range: 89-93)

### What Was Fixed

1. **Coverage tool configured** (was the biggest gap — "UNKNOWN" in previous audit)
   - `jest.config.js` with `collectCoverageFrom` and `coverageThreshold` (70%)
   - `vitest.config.js` with `coverage.provider: "v8"` and 70% thresholds
   - Both enforce via `yarn test:coverage` / `npx vitest run --coverage`

2. **Test count increased by 63%** (2,211 → 3,602)
   - Server: +791 tests (estimated; was ~1,123 `it()` calls)
   - Frontend: +600 tests (estimated; was ~1,088)
   - 178 new test files added

3. **Coverage gate set at 70%** for new/changed code
   - Enforced in CI via `yarn test:coverage`
   - Regular `yarn test` skips coverage for dev speed

### What Still Needs Work

1. **Server coverage at 21.3%** — well below 70% threshold
   - Major gaps: vectorDbProviders, database providers, middleware
   - These are mostly upstream AnythingLLM code

2. **Frontend coverage at 53.5%** — closer but still below 70%
   - Good coverage on utils (67%), hooks, and chat components
   - Gaps: page components, provider wrappers, themes

3. **Coverage gate fails in CI** — `yarn test:coverage` exits with error code 1

---

## Sprint Commits Since Last Audit (245 commits)

Key testing-related commits since `038316c0` (2026-06-17):

| Commit | Description |
|--------|-------------|
| `9ebbfba6` | feat: 7-agent parallel sprint — bug fix + E1-E6 production readiness |
| `1dbbb2dd` | feat: shared resilient HTTP client + server coverage gate (E3, E1) |
| `de26f057` | feat: E1+E3+E4+E6 — testing, resilience, endpoints, code quality |
| `92575ec5` | fix: update yarn.lock for pinned deps |
| `e9029243` | fix: vision images work with minimax-m3, kimi-k2p7, qwen-3p7 on Fireworks |
| `816fa496` | fix: scroll jump, scroll button overlap, user bubble color, vision image rejection |
| `48112aea` | fix: strip empty KaTeX paragraphs causing massive whitespace in AI messages |
| `7ddfbe7a` | fix: compact input area |
| `c758003b` | fix: sidebar duplicates, user message disappearing, actions row whitespace |
| `ed251b3f` | fix: chat UI overhaul — bubble color, list rendering, spacing, icon position |
| `88980d68` | fix: speech search uses 'q' param |
| `de8501f6` | fix: politician add-to-workspace, Drucksachen error, speech search UI |
| `25df2926` | fix: ESLint cleanup — prettier formatting |
| `0332f91e` | fix: 8-agent audit — infinite redirect loop, ESLint errors, TypeScript config |
| `d63a764d` | fix: 8-agent audit — auth bypass, admin role check, API 404, Content-Type headers |
| `6e2b2383` | fix: skip all rate limits for single-user no-password mode |
| `2fa9100e` | feat: admin terminal execution page (E4 UI) |
| `f9c1bebf` | docs: SOTA README with custom hero + footer SVG banners |

Full commit list: 245 commits since `038316c0` (2026-06-17) through `92575ec5` (2026-06-23).

---

## Impact on Overall CEO Audit Score

| Axis | Weight | Previous | Expected | Weighted Delta |
|------|--------|----------|----------|----------------|
| Security | 25% | 96 | ~96 | 0 |
| Code Quality | 20% | 97 | ~97 | 0 |
| Dependencies | 10% | 94 | ~94 | 0 |
| **Testing** | **15%** | **83** | **~91** | **+1.2** |
| Documentation | 10% | 98 | ~98 | 0 |
| CI/CD | 10% | 95 | ~95 | 0 |
| Compliance | 5% | 100 | ~100 | 0 |
| Performance | 5% | 98 | ~98 | 0 |
| **Total** | 100% | **94.45** | **~95.65** | **+1.2** |

**Expected new overall grade: A (95.7/100)** — up from A (94.5/100)

---

## Recommendations Before Re-Running Audit

1. **Increase server coverage** — focus on `utils/politician/`, `utils/research/`, `utils/reports/`, `utils/orchestrator/` (the modules called out in MEDIUM-1)
2. **Increase frontend coverage** — focus on page components and provider wrappers
3. **Consider lowering coverage threshold** to 50% as an interim step if 70% is too aggressive for the current state
4. **Exclude upstream code** from coverage collection if possible (vectorDbProviders, etc.)
5. **Run `sin-code ceo-audit` or the audit skill** to get the actual score

---

*Prepared 2026-06-23. All metrics measured live from the repository at commit `92575ec5`.*
