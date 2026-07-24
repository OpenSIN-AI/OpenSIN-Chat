<!-- SPDX-License-Identifier: MIT -->

# Abandoned Packages Audit

> Resolves GitHub Issue #5 — Abandoned packages (MEDIUM)
>
> Generated: 2026-06-17 via `scripts/dependency-health.cjs --years 2` + manual `npm view` checks + `yarn audit` in each workspace.

## Methodology

1. Enumerated all direct dependencies across `package.json` files in root, `server/`, `frontend/`, and `collector/`.
2. Queried the npm registry for each package's latest version, last publish date, and deprecation status.
3. Ran `yarn audit --level moderate` in each workspace.
4. Flagged packages as **deprecated** (npm deprecation marker), **stale** (no release in 2+ years), or **vulnerable** (security advisory).

## Summary

| Category | Count |
|---|---|
| Officially deprecated | 1 |
| Stale > 2 years | 30 |
| Dead dependencies removed | 2 |
| Security advisories (transitive) | 6 |
| Safe replacements applied | 2 (removals) |

## Actions Taken

### Removed: dead dependencies (frontend)

| Package | Version | Reason |
|---|---|---|
| `@esbuild-plugins/node-globals-polyfill` | ^0.1.1 | Not imported anywhere in source or Vite config. Last published 2023-01-27 (3.4y stale). Dead dependency — safe to remove. |
| `@types/react-router-dom` | ^5.3.3 | Provides TypeScript types for react-router-dom **v5**, but the project uses **v6.30.4** which ships its own bundled types. No explicit type imports from this package. Removing eliminates a conflicting/wrong version type package. |

## Findings — Deprecated Packages

### `@langchain/community` (server, collector)

| Field | Value |
|---|---|
| Version in use | ^1.1.29 |
| Latest on npm | 1.1.29 |
| Last publish | 2026-05-27 |
| Deprecated | Yes — "This package has been deprecated. See https://github.com/langchain-ai/langchainjs-community/issues/61" |
| Risk level | **MEDIUM** |
| Recommended replacement | Individual standalone integration packages (see below) |
| Action | **Document only** — replacement is non-trivial (5 integration sites, different package names) |

The LangChain team sunset `@langchain/community` on May 27, 2026 and archived the GitHub repository. The package still installs and works, but receives no further updates or security patches.

**Usage sites in this codebase:**

| Import path | File | Integration |
|---|---|---|
| `@langchain/community/document_loaders/web/puppeteer` | `collector/processLink/convert/generic.js` | PuppeteerWebloader |
| `@langchain/community/document_loaders/web/puppeteer` | `collector/utils/extensions/WebsiteDepth/index.js` | PuppeteerWebloader |
| `@langchain/community/document_loaders/web/github` | `collector/utils/extensions/RepoLoader/GithubRepo/RepoLoader/index.js` | GithubRepoLoader |
| `@langchain/community/document_loaders/fs/epub` | `collector/processSingleFile/convert/asEPub.js` | EPubLoader |
| `@langchain/community/document_loaders/fs/docx` | `collector/processSingleFile/convert/asDocx.js` | DocxLoader |
| `@langchain/community/embeddings/voyage` | `server/utils/EmbeddingEngines/voyageAi/index.js` | VoyageEmbeddings |

**Why not swapped:** Each integration would need its own standalone replacement package (e.g. `@langchain/puppeteer`, `@langchain/github`, etc.), and not all have dedicated packages yet. The codebase already has a tracking comment in `extras/scripts/verifyPackageVersions.mjs`: "We are slowly removing this dependency from the app — its use is not critical." This should be a separate dedicated PR.

## Findings — Stale Packages (> 2 years, not deprecated)

These packages are not officially deprecated but have not received updates in 2+ years. Most are small, stable, feature-complete utilities where staleness is low-risk. A few warrant closer attention.

### High priority (recommend future replacement)

| Package | Version | Last publish | Age | Workspaces | Risk | Notes |
|---|---|---|---|---|---|---|
| `@xenova/transformers` | ^2.17.2 / ^2.14.0 | 2024-05-29 | 2.1y | server, collector | MEDIUM | Renamed to `@huggingface/transformers` (v4+). Swapping requires a major version jump (2.x → 4.x) — violates the no-major-upgrade constraint. Track for a dedicated upgrade PR. |
| `weaviate-ts-client` | 1.3.1 | 2024-05-20 | 2.1y | server | MEDIUM | Renamed to `weaviate-client` (v3+). Different API surface. Track for dedicated upgrade. |
| `@microsoft/fetch-event-source` | ^2.0.1 | 2021-04-25 | 5.1y | frontend, root | MEDIUM | Microsoft has not updated this SSE client in 5 years. No official deprecation. Consider `eventsource-parser` or native `EventSource` where applicable. |
| `wavefile` | ^11.0.0 | 2020-01-30 | 6.4y | collector | MEDIUM | WAV file reader/writer. No maintained successor. Monitor for issues. |
| `mbox-parser` | ^1.0.1 | 2021-04-09 | 5.2y | collector | MEDIUM | MBOX email parser. Niche, no maintained alternative. |

### Low risk (stable, feature-complete, no replacement needed)

| Package | Version | Last publish | Age | Workspaces | Notes |
|---|---|---|---|---|---|
| `he` | ^1.2.0 | 2018-09-23 | 7.7y | frontend, root | HTML entity encoder. Stable, no known vulnerabilities. |
| `pluralize` | ^8.0.0 | 2019-05-25 | 7.1y | server, frontend, root | English pluralization. Stable. |
| `lodash.debounce` | ^4.0.8 | 2016-08-13 | 9.8y | frontend, root | Single-function lodash module. Stable. |
| `js-levenshtein` | ^1.1.6 | 2019-01-10 | 7.4y | frontend | Levenshtein distance. Stable. |
| `fast-levenshtein` | ^3.0.0 | 2020-07-22 | 5.9y | server | Levenshtein distance. Stable. |
| `file-saver` | ^2.0.5 | 2020-11-19 | 5.6y | frontend, root | File download helper. Stable. |
| `buffer` | ^6.0.3 | 2020-11-23 | 5.6y | frontend | Buffer polyfill for browser. Stable. |
| `uuid-apikey` | ^1.5.3 | 2021-07-04 | 5.0y | server | UUID + API key generator. Stable. |
| `pdf-lib` | 1.17.1 | 2021-11-06 | 4.6y | server, root | PDF creation. Stable, widely used. |
| `truncate` | ^3.0.0 | 2021-09-28 | 4.7y | server, root | String truncation. Stable. |
| `@breejs/later` | 4.2.0 | 2023-11-28 | 2.6y | server | Cron parser. Part of bree ecosystem. |
| `@dnd-kit/utilities` | ^3.2.2 | 2023-11-06 | 2.6y | frontend, root | DnD utilities. Part of dnd-kit ecosystem. |
| `check-disk-space` | ^3.4.0 | 2023-05-21 | 3.1y | server, root | Disk space checker. Stable. |
| `react-device-detect` | ^2.2.3 | 2023-02-08 | 3.4y | frontend, root | Device detection. Stable. |
| `react-tag-input-component` | ^2.0.2 | 2022-10-25 | 3.6y | frontend, root | Tag input UI. Stable. |
| `swagger-autogen` | ^2.23.5 | 2023-10-28 | 2.6y | server | Swagger doc generator (dev tool). Stable. |
| `swagger-ui-express` | ^5.0.1 | 2024-05-31 | 2.0y | server | Swagger UI middleware. Stable. |
| `exceljs` | 3.10.0 | 2023-10-19 | 2.7y | server | Excel reader/writer. Stable. |
| `joi-password-complexity` | ^5.2.0 | 2023-07-11 | 2.9y | server | Joi password validator. Stable. |
| `node-xlsx` | ^0.24.0 | 2024-04-15 | 2.2y | collector | XLSX parser. Stable. |
| `regenerator-runtime` | ^0.14.1 | 2023-12-15 | 2.5y | frontend, root | Babel runtime. Stable, required by toolchain. |
| `moment` | ^2.29.4 / ^2.30.1 | 2023-12-27 | 2.5y | server, frontend, collector | In maintenance mode. Widely used. Consider `dayjs` for future work — but swapping is a large refactor. |
| `epub2` | git dep | 2023-09-20 | 2.7y | collector | Git dependency (Mintplex-Labs fork). No npm release. |
| `@types/react-router-dom` | ^5.3.3 | 2022-01-18 | 4.4y | frontend | **REMOVED** — wrong types for v6 package. |

## Security Advisories (yarn audit)

### Server (5 vulnerabilities: 4 Moderate, 1 High)

| Severity | Package | Via | Advisory |
|---|---|---|---|
| High | (transitive) | `@modelcontextprotocol/sdk > hono` | See npm advisory |
| Moderate | `hono` | `@modelcontextprotocol/sdk > hono` | Body Limit Middleware bypass on AWS Lambda (#1120921) |
| Moderate | `hono` | `@modelcontextprotocol/sdk > hono` | Lambda@Edge adapter header drop (#1120922) |

These are in transitive dependencies of `@modelcontextprotocol/sdk`. Fix requires bumping `@modelcontextprotocol/sdk` to a version that updates its `hono` dependency — not a direct dependency swap.

### Collector (1 vulnerability: 1 Moderate)

| Severity | Package | Via | Advisory |
|---|---|---|---|
| Moderate | `file-type` | `officeparser > file-type` | Infinite loop in ASF parser (#1114301) |

Transitive dependency of `officeparser`. Fix requires bumping `officeparser` or pinning a resolution.

### Root & Frontend

0 vulnerabilities.

## Recommendations for Future Work

1. **`@langchain/community` removal** — Dedicated PR to replace 5 integration sites with standalone packages or inline implementations.
2. **`@xenova/transformers` → `@huggingface/transformers`** — Major version upgrade (2.x → 4.x), requires API compatibility testing.
3. **`weaviate-ts-client` → `weaviate-client`** — Major version upgrade, different API surface.
4. **`moment` → `dayjs`** — Large but mechanical refactor across 3 workspaces.
5. **`@microsoft/fetch-event-source`** — Evaluate native `EventSource` or `eventsource-parser` as replacement.
6. **Transitive security fixes** — Bump `@modelcontextprotocol/sdk` and `officeparser` to resolve `hono` and `file-type` advisories.
