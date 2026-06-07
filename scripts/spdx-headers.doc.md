# spdx-headers.cjs

Adds and verifies `SPDX-License-Identifier: MIT` headers across all first-party
source files (Issue #3, CEO Audit finding COMPL-HEADER).

## Why

The repo is MIT-licensed (see `LICENSE`). SPDX identifiers make the license
machine-readable for SBOM tooling, license scanners, and supply-chain audits.

## Usage

```bash
# Add missing headers in place
node scripts/spdx-headers.cjs

# CI mode — exit 1 if any file is missing a header
node scripts/spdx-headers.cjs --check
```

## Scope

- Extensions: `.js .jsx .ts .tsx .mjs .cjs`
- Ignored dirs: `node_modules .git dist build coverage .next .turbo vector-cache storage out`
- Ignored files: `*.min.js`, `*.d.ts`, `next-env.d.ts`
- Shebang-safe: header is inserted after a leading `#!` line.
- Idempotent: a file that already has the identifier in its first 3 lines is skipped.

## CI

`node scripts/spdx-headers.cjs --check` runs in `.github/workflows/ceo-audit.yml`
as the **License headers (SPDX)** step and fails the build on any missing header.
