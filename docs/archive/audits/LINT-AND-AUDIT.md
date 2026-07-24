# Lint & Dependency Audit Runbook

This repository is a **Yarn (v1) multi-package project** with three independent
workspaces, each with its own `package.json`, `yarn.lock`, and ESLint flat config:

| Workspace   | Lint config           | Lint command (in that dir) |
| ----------- | --------------------- | -------------------------- |
| `frontend/` | `eslint.config.js`    | `yarn lint:check`          |
| `server/`   | `eslint.config.mjs`   | `yarn lint:check`          |
| `collector/`| `eslint.config.mjs`   | `yarn lint:check`          |

The root `package.json` chains all three:

```bash
# From the repo root — runs all three lint:check gates in sequence.
yarn lint:ci
```

---

## Linting

Each workspace must be installed with its **dev** dependencies before linting —
the `eslint` binary lives in `node_modules/.bin` and is a `devDependency`.
Never use `--production` for a lint job.

```bash
# Install (per workspace)
cd frontend  && yarn install --frozen-lockfile
cd server    && yarn install --frozen-lockfile
cd collector && yarn install --frozen-lockfile

# Check (fails CI on any error; warnings are allowed)
yarn lint:check

# Auto-fix formatting / simple violations
yarn lint
```

Expected steady-state: **0 errors** in every workspace. `no-console` and
`i18next/no-literal-string` warnings are intentionally non-failing.

### Common breakages (and why)

1. **`TypeError: Cannot set properties of undefined (setting 'defaultMeta')`**
   A `resolutions` entry forced `ajv` to v8, but `@eslint/eslintrc` (ESLint 9's
   legacy shim) uses the ajv **v6** API. Fix: pin `"ajv": "^6.14.0"`.

2. **`TypeError: expand is not a function` (in minimatch)**
   A `resolutions` entry forced `brace-expansion` to the ESM-only v5, but
   `minimatch@3` (used by `@eslint/config-array`) needs the CommonJS callable
   v1 export. Fix: pin `"brace-expansion": "^1.1.13"` (CVE-2025-5889 is patched
   in 1.1.12+, so the v1 line is both safe and compatible).

3. **`eslint: command not found` (exit 127)**
   Dependencies were not installed, or were installed with `--production`.
   Run a full `yarn install --frozen-lockfile` first.

> Security `resolutions` must use the **patched version within the range the
> consumers actually accept** — never blindly force the newest major. Forcing a
> breaking major across the whole tree is what caused breakages 1 and 2 above.

---

## Dependency Audit

`yarn audit` (Yarn 1.x) is unreliable and frequently fails with
`Unexpected audit response (Missing Metadata): false` for scoped packages.
We use **`npm audit`** instead, driven by a transient `package-lock.json`
generated from the existing `yarn.lock`.

### Frontend

```bash
cd frontend

# Generate lockfile + audit at moderate severity and above (CI gate)
yarn run audit

# High severity and above only
yarn run audit:high

# Just (re)generate the npm lockfile without auditing
yarn run audit:prepare
```

`yarn run audit` is self-contained: it runs `audit:prepare`
(`npm install --package-lock-only --legacy-peer-deps`) and then
`npm audit --audit-level=moderate`.

> The generated `package-lock.json` is **git-ignored** in every workspace.
> `yarn.lock` is the single source of truth; the npm lockfile exists only so
> `npm audit` has a manifest to read.

### Server / Collector

```bash
cd server   && yarn audit   # or: cd collector && yarn audit
```

These use the standard `yarn audit`, which works reliably for these trees.

---

## CI

- `.github/workflows/tests.yml` runs `frontend-lint`, `server-lint`, and
  `collector-lint` jobs — each does a full `yarn install --frozen-lockfile`
  then `yarn lint:check`.
- `.github/workflows/ceo-audit.yml` runs the dependency audits, including the
  npm-based frontend audit described above.
