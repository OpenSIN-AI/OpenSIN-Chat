# CEO-Audit Report — OpenSIN-Chat

**Date:** 2026-06-15  
**Repository:** `/Users/jeremy/dev/OpenSIN-Chat` (OpenSIN-AI/OpenSIN-Chat)  
**Trigger:** Issue #176 — CEO-Audit after completion of #81 (TypeScript migration) and #85 (Politician Sync)  
**Auditor:** OpenCode agent with `ceo-audit` skill + manual equivalent checks  

---

## Executive Summary

The `ceo-audit` skill was loaded, but its underlying shell scripts are **incompatible with the current Go-based `sin-code` binary** (they invoke `discover --mcp` and `map --mcp`, which no longer exist). The automated 47-gate audit therefore failed silently and reported a false `A+ (100/100)`. To satisfy the request, the equivalent manual checks were run instead.

**Manual assessment: D/F (not production-ready)** — the repository contains a CRITICAL vulnerability surface in the `collector/` dependency tree, broken linting in `server/` and `frontend/`, and the frontend dependency tree cannot be audited at all because `yarn audit` crashes.

> Note: The previous `docs/CEO-AUDIT-FINAL-2026-06-14.md` reported 0 vulnerabilities, but it only audited `root`, `frontend`, and `server` with `npm audit` and did not cover `collector/` or `yarn audit`. This report supersedes it for the current state.

---

## Manual Checks Performed

| Check | Command | Status |
|---|---|---|
| Root dependency audit | `yarn audit --level moderate` | 0 vulnerabilities (warnings only) |
| Server dependency audit | `yarn audit --level moderate` | 0 vulnerabilities (resolutions active) |
| Frontend dependency audit | `yarn audit --level moderate` | **FAIL** — tool error |
| Collector dependency audit | `yarn audit --level moderate` | **3 CRITICAL / 54 HIGH / 53 MODERATE / 6 LOW** |
| Server lint | `cd server && npx eslint .` | **CRASH** — TypeError |
| Frontend lint | `cd frontend && yarn lint:check` | **FAIL** — 424 errors, 2,425 warnings |
| Collector lint | `cd collector && yarn lint:check` | **FAIL** — `eslint` command not found |
| Server tests | `cd server && npx jest --no-coverage` | **FAIL** — 1 test failure (missing `NODE_OPTIONS`) |
| Server tests (corrected) | `NODE_OPTIONS=--experimental-vm-modules npx jest --no-coverage` | **PASS** — 1,764/1,764 |
| Frontend tests | `cd frontend && npx vitest run` | **PARTIAL PASS** — 1,386/1,390 pass, 4 pending due to hook timeout |
| Frontend build | `cd frontend && yarn build` | **PASS** with warnings |
| CoDocs check | `sin-code codocs check` | **Not available** in current `sin-code` binary |

---

## Findings Summary

| Severity | Count | Notes |
|---|---|---|
| **CRITICAL** | 1 finding (3 CVEs) | Collector dependency tree |
| **HIGH** | 4 findings | Lint failures, audit tooling failure, eslint crash |
| **MEDIUM** | 4 findings | Test reliability, build warnings, jest invocation |
| **LOW** | 3 findings | Deprecated packages, missing tooling, skill incompatibility |

---

## CRITICAL Findings

### 1. Collector dependency tree has 3 CRITICAL and 54 HIGH vulnerabilities

- **Location:** `collector/package.json` + `collector/yarn.lock`
- **Summary:**
  - `yarn audit` in `collector/` reports **3 critical, 54 high, 53 moderate, 6 low** vulnerabilities.
  - Top CRITICAL advisories include:
    - `basic-ftp` Path Traversal in `downloadToDir()` (CWE-22)
    - `protobufjs` Arbitrary Code Execution (CWE-94)
  - Top HIGH advisories include:
    - `LangChain` serialization injection enabling secret extraction
    - `tar-fs` symlink/path traversal in crafted tar files
    - `ws` DoS via many HTTP headers
    - `protobufjs` multiple DoS/code-injection issues
    - `lodash` code injection via `_.template`
    - `path-to-regexp` / `minimatch` ReDoS
- **Root cause:** `server/package.json` contains an extensive `resolutions` block that pins/override vulnerable transitive packages. `collector/package.json` only has two resolutions (`string-width`, `wrap-ansi`) and lacks the same security overrides, even though it depends on the same vulnerable families (`@langchain/community`, `langchain`, `@xenova/transformers`, `protobufjs`, etc.).
- **Impact:** The collector processes untrusted documents, web pages, and third-party content. Vulnerabilities like path traversal, arbitrary code execution, SSRF bypass, and deserialization injection are directly exploitable through the document ingestion pipeline.
- **Recommended action:**
  1. Copy the security `resolutions` from `server/package.json` into `collector/package.json` (or centralize them in a shared workspace root).
  2. Run `yarn upgrade` in `collector/`.
  3. Re-run `yarn audit --level moderate` until no HIGH/CRITICAL remain.
  4. Add `collector` to the dependency audit CI gate.

---

## HIGH Findings

### 2. Frontend lint check fails with 424 errors and 2,425 warnings

- **Location:** `frontend/src/**/*`
- **Command:** `cd frontend && yarn lint:check`
- **Result:** `✖ 2849 problems (424 errors, 2425 warnings)`
- **Top error categories:** `prettier/prettier`, `no-undef`, `no-var`, `@typescript-eslint/no-explicit-any`, `jsx-a11y/label-has-for`, `unused-imports/no-unused-vars`.
- **Root cause:** The TypeScript migration (#81) added/modified files without running the linter, and the existing baseline was not maintained. The root `lint:ci` script only delegates to `server && frontend && collector`, but the frontend errors are blocking.
- **Recommended action:**
  1. Run `yarn lint` in `frontend/` (auto-fix).
  2. Manually fix remaining errors (`React` import, `var` → `let/const`, explicit `any` types).
  3. Add `yarn lint:check` to the frontend CI gate and block merges on it.

### 3. Server ESLint configuration crashes

- **Location:** `server/` (uses root `eslint.config.js`)
- **Command:** `cd server && npx eslint .` or `yarn lint:check`
- **Result:**
  ```
  NOT SUPPORTED: option missingRefs. Pass empty schema with $id that should be ignored to ajv.addSchema.
  TypeError: Cannot set properties of undefined (setting 'defaultMeta')
      at ajvOrig (/.../server/node_modules/@eslint/eslintrc/dist/eslintrc-universal.cjs:385:27)
  ```
- **Root cause:** ESLint 9.x with the current `eslint.config.js` and `@eslint/eslintrc` version are incompatible. The config references `server/node_modules` packages directly from the root, and the installed `ajv`/`@eslint/eslintrc` versions do not agree.
- **Recommended action:**
  1. Pin `@eslint/eslintrc` and `ajv` to mutually compatible versions (or downgrade ESLint to a known-good 9.x patch).
  2. Simplify the root `eslint.config.js` to avoid deep `node_modules` relative imports if possible.
  3. Restore the server lint CI gate.

### 4. Frontend `yarn audit` fails with "Unexpected audit response (Missing Metadata): false"

- **Location:** `frontend/`
- **Command:** `cd frontend && yarn audit`
- **Result:** Tool error; no vulnerability assessment possible.
- **Root cause:** Yarn 1.x audit bug when the registry returns malformed metadata for one or more packages in `frontend/yarn.lock`. This is a known class of Yarn 1.x issues with scoped or newly-published packages.
- **Impact:** Cannot determine whether the frontend has HIGH/CRITICAL vulnerabilities. This is an operational blind spot.
- **Recommended action:**
  1. Generate a `package-lock.json` for the frontend (`npm i --package-lock-only`) and run `npm audit --audit-level=high`.
  2. Alternatively, migrate the frontend to pnpm or npm for more reliable auditing.
  3. Until the audit is fixed, treat the frontend dependency tree as unverified and avoid deploying it without manual review.

### 5. Collector linting is not operational

- **Location:** `collector/`
- **Command:** `cd collector && yarn lint:check`
- **Result:** `/bin/sh: eslint: command not found`
- **Root cause:** `eslint` is listed in `devDependencies` but is not installed in `collector/node_modules/.bin/`. The install may have been run with `yarn install --production` or the `node_modules` is stale.
- **Recommended action:**
  1. Re-run `yarn install` in `collector/`.
  2. Verify `node_modules/.bin/eslint` exists and `yarn lint:check` runs.
  3. Add collector lint to the root `lint:ci` gate.

---

## MEDIUM Findings

### 6. Frontend Vitest suite has a hook timeout (4 tests skipped)

- **Location:** `frontend/src/components/WorkspaceChat/ChatContainer/ChatHistory/index.test.jsx`
- **Result:** `numFailedTestSuites: 1`, `numPendingTests: 4`, `success: false`.
- **Error:** `Hook timed out in 10000ms.`
- **Recommended action:** Increase the hook timeout for this suite, fix setup/teardown leaks, or mock the slow dependency.

### 7. Server Jest requires `NODE_OPTIONS=--experimental-vm-modules`

- **Location:** `server/`
- **Command:** `npx jest --no-coverage` fails with `A dynamic import callback was invoked without --experimental-vm-modules`.
- **Result:** `package.json` already passes `NODE_OPTIONS="--experimental-vm-modules"`, but the direct command documented in the issue does not. This is a documentation/invocation mismatch.
- **Recommended action:** Update the issue template / runbook to always use `yarn test` (or set the env var), or configure Jest to handle ESM without the flag.

### 8. Frontend build externalizes Node.js built-in modules for browser

- **Location:** `frontend/`
- **Warning:** `[plugin rolldown:vite-resolve] Module "path" / "crypto" / "fs" has been externalized for browser compatibility, imported by "@mintplex-labs/piper-tts-web"`.
- **Recommended action:** Verify that the piper-tts-web feature works in the browser; if these modules are expected to be polyfilled, configure Vite to provide them, otherwise the runtime may fail in production.

### 9. Missing automated CEO-audit workflow

- **Observation:** The repository does not have `.github/workflows/ceo-audit.yml` despite the `ceo-audit` skill mandate.
- **Recommended action:** Deploy the canonical `ceo-audit.yml` from the skill template via `sin git-workflow`.

---

## LOW Findings

### 10. Root `yarn audit` warns about deprecated transitive packages

- `jest` → `glob@10.5.0` / `inflight@1.0.6` — deprecated, memory-leak warnings. Not a direct vulnerability, but a maintenance risk.

### 11. `sin-code codocs check` is not available

- The current `sin-code` Go binary does not expose the `codocs` subcommand, so CoDocs completeness could not be verified automatically. Manual spot-check of `.doc.md` files was not performed in this run.

### 12. `ceo-audit` skill is non-functional with the current `sin-code` binary

- **Tooling issue, not a repo issue:** The skill scripts call `sin-code discover --mcp` and `sin-code map --mcp`, which the Go binary rejects. The skill needs an update to use the new `sin-code` CLI flags or the older Python bundle must be re-enabled.

---

## Test Results

| Suite | Command | Result |
|---|---|---|
| Server Jest (direct) | `npx jest --no-coverage` | 1,763/1,764 pass, 1 fail (pdf-parse-api needs `--experimental-vm-modules`) |
| Server Jest (corrected) | `NODE_OPTIONS=--experimental-vm-modules npx jest --no-coverage` | **1,764/1,764 pass** |
| Frontend Vitest | `npx vitest run` | 1,386/1,390 pass, 4 pending, 1 suite failed due to hook timeout |
| Frontend Build | `yarn build` | **Success** in 21.95s, with externalization warnings |

---

## Top 5 Recommended Actions (Ranked by Impact)

1. **Fix collector dependencies immediately** (CRITICAL) — apply `server/` security resolutions to `collector/` and re-audit until 0 HIGH/CRITICAL.
2. **Restore linting infrastructure** (HIGH) — fix server ESLint crash, auto-fix frontend lint errors, and reinstall collector eslint.
3. **Make frontend dependency audit reliable** (HIGH) — either fix Yarn 1.x audit or switch to npm/pnpm audit.
4. **Fix frontend Vitest hook timeout** (MEDIUM) — unblock the frontend test suite so it reports `success: true`.
5. **Deploy `ceo-audit.yml` workflow** (MEDIUM) — prevent future regressions by gating PRs on these checks.

---

## Issues Created from This Audit

See the GitHub issue tracker for the linked issues created from this report. Each HIGH/CRITICAL finding was filed with label `ceo-audit` and linked to #176.

---

## Blockers

- **CRITICAL:** The `collector/` dependency tree cannot be deployed as-is because it contains known-exploitable vulnerabilities.
- **HIGH:** The `server/` and `frontend/` lint gates are broken, so code-quality regressions are not being caught.
- **HIGH:** The frontend dependency tree cannot be audited, creating a security blind spot.
- **MEDIUM:** The `ceo-audit` skill itself is non-functional, so future automated audits will require manual equivalent checks until the skill is updated.
