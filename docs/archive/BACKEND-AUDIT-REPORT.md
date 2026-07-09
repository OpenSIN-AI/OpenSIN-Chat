# Backend Audit Report — opensin-chat
**Date:** 2026-07-08  
**Auditor:** Backend Architecture Agent  
**Scope:** `server/` directory — architecture, security, code quality, test coverage

---

## Executive Summary

The backend is a Node.js/Express application using Prisma 7 with SQLite (better-sqlite3 adapter). It has 88 dependencies, 52 Prisma models, 54 migrations, and ~106K lines of server JS code. The codebase shows signs of rapid feature development with accumulating tech debt: raw SQL bypassing Prisma models, several god files exceeding 1,000 lines, 25 endpoints lacking rate limiting, and 24 models with zero test coverage. On the positive side, JWT handling follows good practices (pinned algorithm, issuer/audience claims, strong secret enforcement in production), and admin endpoints consistently use auth middleware with role validation.

**Finding count:** 3 P0 · 7 P1 · 6 P2

---

## 1. Raw SQL vs Prisma ($queryRawUnsafe / $executeRawUnsafe)

**Total occurrences:** 31 raw SQL calls across 3 production files (excluding mocks/tests)

### Files using raw SQL:

| File | Calls | SQL Injection Risk | Severity |
|------|-------|-------------------|----------|
| `server/models/workspaceNote.js` | 15 | **No** — all queries use parameterized placeholders (`?`) with `Number()` casting | P2 (tech debt) |
| `server/utils/parseJobs/index.js` | 13 | **No** — all queries use parameterized placeholders; `_queryOne()` helper passes `...params` safely | P2 (tech debt) |
| `server/utils/prisma/index.js` | 2 | **No** — hardcoded `PRAGMA` statements with no user input | P2 (tech debt) |

**Assessment:** No SQL injection vulnerabilities found. All raw SQL uses parameterized queries with `?` placeholders and values passed separately. However, this is significant tech debt:

- **P2 — `workspaceNote.js`**: 15 raw SQL calls implement an entire model layer outside Prisma. The `shared_workspace_notes` table is created via `CREATE TABLE IF NOT EXISTS` at runtime instead of being in the Prisma schema. This means the table is invisible to Prisma's type system, has no migration history, and can't be introspected. All CRUD operations are hand-written SQL.

- **P2 — `parseJobs/index.js`**: 13 raw SQL calls. The `parse_jobs` table is also bootstrapped via runtime `CREATE TABLE IF NOT EXISTS` instead of a proper migration. The `_queryOne()` helper at line 241 accepts arbitrary SQL strings, which is a future injection risk if a caller ever passes user input into the SQL string (currently all callers pass static strings).

- **P2 — `prisma/index.js`** (lines 46-47): `PRAGMA journal_mode=WAL` and `PRAGMA busy_timeout=15000` — reasonable for SQLite tuning, but errors are silently swallowed with `.catch(() => {})`.

---

## 2. God Files (Largest JS Files)

| Rank | File | Lines | Severity |
|------|------|-------|----------|
| 1 | `server/utils/agents/aibitat/index.js` | 1,666 | **P1** |
| 2 | `server/utils/agents/aibitat/plugins/outlook/lib.js` | 1,453 | **P1** |
| 3 | `server/endpoints/api/document/index.js` | 1,287 | **P1** |
| 4 | `server/models/systemSettings.js` | 1,243 | **P1** |
| 5 | `server/utils/agents/aibitat/plugins/web-browsing.js` | 1,227 | **P1** |
| 6 | `server/utils/agents/aibitat/plugins/create-files/docx/utils.js` | 1,091 | P2 |
| 7 | `server/endpoints/api/workspace/index.js` | 1,072 | **P1** |
| 8 | `server/jobs/sync-politician-data.js` | 974 | P2 |
| 9 | `server/utils/chats/apiChatHandler.js` | 958 | P2 |

**Assessment:** 7 files exceed 1,000 lines. The worst offenders:

- **P1 — `aibitat/index.js` (1,666 lines)**: This is the core agent orchestration engine. At this size it's almost certainly handling multiple responsibilities (routing, plugin management, state, streaming) that should be split into modules.

- **P1 — `document/index.js` (1,287 lines)**: A single endpoint file handling document upload, processing, embedding, workspace assignment, and deletion. Should be split into sub-routers.

- **P1 — `systemSettings.js` (1,243 lines)**: A single model file with 1,243 lines suggests settings logic is not properly decomposed. This is a maintenance risk — any change risks breaking unrelated settings.

- **P1 — `workspace/index.js` (1,072 lines)**: Another endpoint file doing too much — CRUD, sharing, threads, settings, all in one file.

---

## 3. Error Handling Patterns

### Empty catch blocks (`catch {}`): 11 occurrences

| File | Lines | Context | Severity |
|------|-------|---------|----------|
| `server/endpoints/agentSSE.js` | 140, 150, 270, 292, 315, 318, 337, 340 | SSE stream cleanup — `res.end()`, `socket.close()`, `abort()` | P2 |
| `server/endpoints/agentRunsStream.js` | 169, 191 | Keep-alive write + cancel status update | **P1** |
| `server/endpoints/agentWebsocket.js` | 331 | WebSocket cleanup | P2 |
| `server/endpoints/connectors/oauth.js` | 192 | OAuth flow error | **P1** |

**Assessment:**

- **P2 — SSE/WebSocket cleanup catches (8 occurrences)**: These are in `terminate()`/`close()` methods wrapping `res.end()` calls. Swallowing errors during connection teardown is a common and defensible pattern — the connection is already dying. Low risk.

- **P1 — `agentRunsStream.js:191`**: The cancel endpoint's `AgentRuns.updateStatus(runId, "cancelled")` is wrapped in `catch {}`. If the status update fails, the user gets `{ success: true }` but the run is still active. This is a silent data integrity bug.

- **P1 — `connectors/oauth.js:192`**: An OAuth callback error is silently swallowed. OAuth errors can indicate token theft, misconfiguration, or provider issues — swallowing them makes debugging impossible.

### `.catch(() => {})` patterns: 6 occurrences

| File | Lines | Context | Severity |
|------|-------|---------|----------|
| `server/endpoints/api/document/index.js` | 161, 325 | `mirrorToSupabase(request).catch(() => {})` | **P1** |
| `server/endpoints/agentWebsocket.js` | 212 | Promise rejection in WebSocket setup | P2 |
| `server/endpoints/system/branding.js` | 157, 174, 182, 198 | File cleanup (`fs.unlink`, `fs.rmdir`) | P2 |

**Assessment:**

- **P1 — `document/index.js:161,325`**: Supabase mirroring failures are silently swallowed. If mirroring is a critical data sync step, this causes silent data inconsistency between primary storage and Supabase. At minimum, these should log the error.

- **P2 — `branding.js`**: File cleanup operations — acceptable to swallow since the primary operation already succeeded.

### Catch blocks that log but don't propagate: ~20+ occurrences in `admin.js`

All catch blocks in `admin.js` follow the pattern `catch (e) { consoleLogger.error(e); ... response.status(500).json(...) }` — this is **correct**. They log the error and return a proper 500 response. No issue here.

---

## 4. Missing Input Validation

**Total `reqBody(request)` calls in endpoints:** 179

### Validation framework:
- The project has **`joi` (17.13.4)** and **`zod` (4.4.3)** as dependencies — both validation libraries are available.
- Admin endpoints use `validatedRequest` middleware + `strictMultiUserRoleValid`/`flexUserRoleValid` for auth — **good**.
- However, `validatedRequest` only validates the **JWT/session**, not the **request body contents**.

### Endpoints using `reqBody()` without body validation:

| File | Line(s) | What's accepted | Severity |
|------|---------|-----------------|----------|
| `server/endpoints/api/document/index.js` | 36, 138, 289, 464, 593, 984, 1062, 1129 | Document upload params, file lists, names | **P1** |
| `server/endpoints/api/workspace/index.js` | 84, 354, 536, 604, 690, 849, 995 | Workspace names, document paths, query params | **P1** |
| `server/endpoints/api/embed/index.js` | 301, 381 | Embed config data | **P1** |
| `server/endpoints/api/admin/index.js` | 148, 234, 457, 646, 723, 829, 894 | User creation params, updates | **P0** |
| `server/endpoints/admin.js` | 70, 107, 219, 299, 318, 509, 574 | User management, system updates | **P0** |

**Assessment:**

- **P0 — Admin endpoints (`admin.js`, `api/admin/index.js`)**: `reqBody(request)` is called to get user creation parameters (`newUserParams`), user updates, and system settings changes with **no schema validation**. While these endpoints have auth middleware (`validatedRequest` + role checks), there is no validation that the body contains the expected fields with correct types. A malicious admin (or a bug) could pass unexpected fields that get spread into database operations. Example at `admin.js:70`: `const newUserParams = reqBody(request)` — this goes directly to user creation logic.

- **P1 — Document/Workspace/Embed endpoints**: Same pattern — `reqBody()` destructures fields like `const { name } = reqBody(request)` without validating that `name` is a string, has reasonable length, or contains no malicious content. The `api/embed/index.js:301` endpoint accepts arbitrary `data` from `reqBody()` and processes it.

- **P1 — No length/size validation**: Even where fields are destructured, there's no check for string length limits, array size limits, or type correctness. This enables potential DoS via oversized payloads.

- **Note**: The `admin.js:319` line does check `if (!Array.isArray(userIds))` — this is the only instance of inline type validation found.

---

## 5. Environment Variable Handling

**Total `process.env` references:** 932 across server code (excluding tests/node_modules)

### Env vars used without fallbacks (excluding NODE_ENV):

| File | Line | Variable | Risk | Severity |
|------|------|----------|------|----------|
| `server/endpoints/agentRunsStream.js` | 46 | `AUTH_TOKEN` | If unset, auth is bypassed (`return true`) | **P0** |
| `server/endpoints/agentSSE.js` | 89 | `AUTH_TOKEN` | Same — auth bypass if unset | **P0** |
| `server/endpoints/agentWebsocket.js` | 124 | `AUTH_TOKEN` | Same — auth bypass if unset | **P0** |
| `server/endpoints/system/auth.js` | 123, 287, 326, 333, 362 | `AUTH_TOKEN`, `JWT_EXPIRY` | Auth flow depends on these | P2 |
| `server/endpoints/utils.js` | 631-647 | `LLM_PROVIDER`, `OPEN_MODEL_PREF`, etc. | Returns `undefined` if unset — may cause downstream errors | P2 |
| `server/app.js` | 144, 148, 448, 466 | `ENABLE_HTTP_LOGGER`, `ENABLE_HTTPS` | Feature flags — `undefined` is falsy, acceptable | P2 |
| `server/endpoints/api/terminalExec.js` | 154 | `ENABLE_TERMINAL_EXEC` | `String(undefined).toLowerCase()` = `"undefined"` ≠ `"true"` — safe default | P2 |

**Assessment:**

- **P0 — AUTH_TOKEN bypass in streaming endpoints**: `agentRunsStream.js:46`, `agentSSE.js:89`, and `agentWebsocket.js:124` all contain `if (!process.env.AUTH_TOKEN) return true;` — this means if `AUTH_TOKEN` is not set, the auth check is **completely bypassed** for SSE streams, WebSocket connections, and agent run streams. In a deployment where `AUTH_TOKEN` is accidentally unset (e.g., misconfigured `.env`, fresh deploy without env vars), these endpoints become publicly accessible with no authentication. This is a critical security issue.

- **P2 — Model preference env vars**: `server/endpoints/utils.js:631-647` reads `LLM_PROVIDER` and model preferences without fallbacks. If unset, `provider` is `undefined` and none of the `if` branches match, leaving `model` unset. This would cause a downstream error rather than a security issue.

- **P2 — JWT_EXPIRY**: Used at `auth.js:287,333,362` without a fallback. The `makeJWT` function in `http/index.js:79` does have a fallback (`expiry ?? process.env.JWT_EXPIRY ?? "15m"`), so this is safe at the JWT creation level.

---

## 6. Dependency Health

**Total dependencies:** 88 (dependencies + devDependencies)

### Notable findings:

| Package | Version | Latest | Status | Severity |
|---------|---------|--------|--------|----------|
| `jsonwebtoken` | 9.0.3 | 9.0.3 | ✅ Current | — |
| `@prisma/client` | 7.8.0 | 7.x | ✅ Current | — |
| `prisma` | 7.8.0 | 7.x | ✅ Current | — |
| `openai` | 6.45.0 | 6.x | ✅ Current | — |
| `@anthropic-ai/sdk` | 0.39.0 | 0.x | ✅ Recent | — |
| `chalk` | ^4 | 5.x | **P2** — v4 is EOL, v5 is ESM-only | P2 |
| `nodemon` | ^3.1.14 | 3.x | ✅ Current (devDep) | — |
| `swagger-autogen` | ^2.23.5 | 2.x | ✅ Current (devDep) | — |
| `joi` | ^17.13.4 | 17.x | ✅ Current | — |
| `zod` | ^4.4.3 | 4.x | ✅ Current | — |
| `better-sqlite3` | ^12.11.1 | 12.x | ✅ Current | — |
| `bcryptjs` | 3.0.3 | 3.x | ✅ Current | — |
| `dompurify` | 3.4.11 | 3.x | ✅ Current | — |
| `multer` | 2.2.0 | 2.x | ✅ Current | — |

**Assessment:**

- **P2 — `chalk` v4**: Chalk v4 is the last CommonJS version. v5 is ESM-only. Since the server uses CommonJS (`require`), this is a reasonable pin, but chalk v4 is no longer receiving updates. Consider migrating to a maintained alternative or moving to ESM.

- **Overall**: Dependencies are remarkably current. Prisma 7, OpenAI 6, Jest 30, Zod 4 are all latest-major versions. No deprecated or abandoned packages found. `npm audit` was not available in the sandbox to check for known vulnerabilities.

- **P2 — 88 dependencies is a large surface area**: While not inherently wrong, this is a large dependency tree for a chat application. Each dependency is a potential supply chain risk. Worth periodically reviewing whether all are needed.

---

## 7. Test Coverage Gaps

### Models without tests (24 of ~30 models have NO test):

| Model File | Has Test? | Severity |
|------------|-----------|----------|
| `agentRuns.js` | ❌ | P1 |
| `agentSkillWhitelist.js` | ❌ | P1 |
| `agentTriggers.js` | ❌ | P1 |
| `cacheData.js` | ❌ | P2 |
| `connectorAccounts.js` | ❌ | P1 |
| `documentSyncRun.js` | ❌ | P1 |
| `embedChats.js` | ❌ | P1 |
| `embedConfig.js` | ❌ | P1 |
| `eventLogs.js` | ❌ | P2 |
| `externalCommunicationConnector.js` | ❌ | P1 |
| `memory.js` | ❌ | P1 |
| `mobileDevice.js` | ❌ | P2 |
| `modelRouter.js` | ❌ | P1 |
| `modelRouterRule.js` | ❌ | P1 |
| `politician.js` | ❌ | P2 |
| `promptHistory.js` | ❌ | P2 |
| `scheduledJob.js` | ❌ | P1 |
| `scheduledJobRun.js` | ❌ | P1 |
| `slashCommandsPresets.js` | ❌ | P2 |
| `systemPromptVariables.js` | ❌ | P2 |
| `systemSettings.js` | ❌ (has partial tests for specific features) | P1 |
| `telemetry.js` | ❌ | P2 |
| `workspaceAgentInvocation.js` | ❌ | P1 |
| `workspaceNote.js` | ❌ | P1 |

### Models WITH tests (17):
`apiKeys`, `browserExtensionApiKey`, `documentSyncQueue`, `documents`, `invite`, `passwordRecovery`, `scheduledJobs`, `systemSettings` (partial — default prompt, image generation, preference keys), `temporaryAuthToken`, `user`, `vectors`, `workspace`, `workspaceChats`, `workspaceParsedFiles`

### Utils without tests:
Only `providerConnectivity` was identified as missing a test. The utils directory has good test coverage with dedicated test subdirectories for most modules.

**Assessment:**

- **P1 — 24 models without tests**: This is a significant coverage gap. Critical business logic models like `memory.js`, `embedConfig.js`, `modelRouter.js`, `scheduledJob.js`, and `workspaceNote.js` have zero test coverage. Any change to these models is untested.

- **P1 — `systemSettings.js` (1,243 lines) has only partial tests**: Three test files exist but they cover specific features (default prompts, image generation, preference keys). The bulk of the 1,243-line file is untested.

- **P1 — `workspaceNote.js` has no tests despite using raw SQL**: This is the file with 15 raw SQL calls. Raw SQL models are higher risk than Prisma models and should be prioritized for testing.

---

## 8. JWT / Auth Middleware

### JWT Implementation (`server/utils/http/index.js`):

| Practice | Status | Details |
|----------|--------|---------|
| Algorithm pinning | ✅ Good | `algorithm: "HS256"` in both `makeJWT()` and `decodeJWT()` |
| Issuer/audience claims | ✅ Good | `issuer: "opensin-chat"`, `audience: "opensin-chat"` |
| Secret strength enforcement | ✅ Good | `ensureJwtSecret.js` requires ≥32 chars in production, exits hard if weak |
| Weak value blocklist | ✅ Good | `WEAK_VALUES` set blocks known-bad secrets |
| Secret auto-generation in dev | ✅ Good | Auto-generates and persists to `.env` with `chmod 0o600` |
| Encryption secrets check | ✅ Good | `ensureEncryptionSecrets()` validates `SIG_KEY`/`SIG_SALT` in prod |
| Token expiry | ✅ Good | Default 15m, configurable via `JWT_EXPIRY` |
| Suspended user check | ✅ Good | `requireApiKeyOrSession` checks `user.suspended` |
| Multi-user mode enforcement | ✅ Good | Single-user JWT (no `id`) rejected in multi-user mode |

### Findings:

- **P2 — `decodeJWT` returns a valid-looking object on failure**: When `JWT_SECRET` is unset or verification fails, `decodeJWT()` returns `{ p: null, id: null, username: null }` instead of `null`. Callers check `!valid || !valid.id` which works, but the pattern is fragile — a caller that only checks `valid` (truthy object) would get a false positive. The return of a non-null object on failure is a footgun.

- **P2 — No token rotation/refresh mechanism**: JWTs have a fixed expiry with no refresh token flow. Long sessions require long expiry, which increases the window for token theft.

- **P2 — CSRF protection uses in-memory `Map`**: `csrfProtection.js:12` stores CSRF tokens in a `Map()` — this won't work across multiple server instances (no shared state). In a single-process deployment this is fine, but it breaks under horizontal scaling.

---

## 9. Rate Limiting

### Endpoints WITH rate limiting (6 files):
| File | Rate Limited Routes |
|------|-------------------|
| `server/endpoints/admin.js` | 4 routes (user creation, updates, label management, password reset) |
| `server/endpoints/api/enhancePrompt.js` | 1 route (prompt enhancement) |
| `server/endpoints/api/openai/index.js` | OpenAI-compatible routes |
| `server/endpoints/api/orchestrator/index.js` | Agent orchestration start |
| `server/endpoints/api/politician/index.js` | Politician data routes |
| `server/endpoints/api/reports/index.js` | Report generation |
| `server/endpoints/api/research/index.js` | Research routes |

### Endpoints WITHOUT rate limiting (25 files):

| File | Risk | Severity |
|------|------|----------|
| `server/endpoints/api/admin/index.js` | Admin operations — user CRUD, system config | **P1** |
| `server/endpoints/api/auth/index.js` | Authentication — login, token issuance | **P0** |
| `server/endpoints/api/document/index.js` | Document upload/processing — CPU intensive | **P1** |
| `server/endpoints/api/workspace/index.js` | Workspace CRUD, document operations | **P1** |
| `server/endpoints/api/embed/index.js` | Embed config — public-facing | **P1** |
| `server/endpoints/api/userManagement/index.js` | User management | **P1** |
| `server/endpoints/api/system/index.js` | System info, health checks | P2 |
| `server/endpoints/api/workspaceThread/index.js` | Thread operations | P2 |
| `server/endpoints/api/pdfAnalysis/index.js` | PDF analysis — CPU intensive | **P1** |
| `server/endpoints/agentFileServer.js` | File serving | P2 |
| `server/endpoints/agentWebsocket.js` | WebSocket connections | P2 |
| `server/endpoints/agentSkillWhitelist.js` | Skill management | P2 |
| `server/endpoints/mcpServers.js` | MCP server management | P2 |
| `server/endpoints/memory.js` | Memory operations | P2 |
| `server/endpoints/notes.js` | Notes CRUD | P2 |
| `server/endpoints/pdfAnalysis.js` | PDF analysis (legacy?) | **P1** |
| `server/endpoints/scheduledJobs.js` | Job scheduling | P2 |
| `server/endpoints/subagents.js` | Subagent management | P2 |
| `server/endpoints/system.js` | System settings | P2 |
| `server/endpoints/telegram.js` | Telegram integration | P2 |
| `server/endpoints/utils.js` | Utility endpoints | P2 |
| `server/endpoints/webPush.js` | Push notifications | P2 |
| `server/endpoints/workspaces.js` | Workspace management | P2 |
| `server/endpoints/workspaceThreads.js` | Thread management | P2 |
| `server/endpoints/agentFlows.js` | Agent flow execution | P2 |

**Assessment:**

- **P0 — `api/auth/index.js` has no rate limiting**: Authentication endpoints (login, token issuance) are the primary target for brute-force and credential stuffing attacks. Without rate limiting, an attacker can make unlimited login attempts. This is a critical security gap.

- **P1 — `api/admin/index.js` has no rate limiting**: Despite the old `admin.js` having rate limiting on 4 routes, the newer `api/admin/index.js` (894 lines) has none. Admin operations like user creation and system config changes should be rate limited.

- **P1 — CPU-intensive endpoints without rate limiting**: `document/index.js` (upload/processing), `pdfAnalysis.js`, and `api/pdfAnalysis/index.js` all perform CPU-intensive operations. Without rate limiting, an attacker can DoS the server by flooding these endpoints.

- **P1 — `api/embed/index.js`**: Embed endpoints are often public-facing (embedded in external sites). Without rate limiting, they're abuse vectors.

---

## 10. Database Migrations

| Metric | Value |
|--------|-------|
| Total migrations | 54 |
| Prisma models in schema | 52 |
| Latest migration | `20260618164838_add_missing_indexes` |
| Earliest migration | `20230921191814_init` |

**Assessment:**

- **P2 — 54 migrations over ~3 years**: The migration history spans from September 2023 to June 2026. This is a healthy migration cadence. No immediate concerns.

- **P2 — Two tables created outside migrations**: As noted in Section 1, `shared_workspace_notes` and `parse_jobs` tables are created via runtime `CREATE TABLE IF NOT EXISTS` instead of Prisma migrations. This means:
  - These tables have no migration history
  - They're not in `schema.prisma` (52 models counted, but these 2 tables are missing)
  - Schema drift between what Prisma knows about and what actually exists in the database
  - No way to roll back these table definitions

- **P2 — No migration squashing**: 54 migrations is manageable but could benefit from periodic squashing for new deployments.

---

## Summary of All Findings

### P0 — Blocking (3)

| # | Finding | File(s) | Section |
|---|---------|---------|---------|
| 1 | **AUTH_TOKEN bypass**: If `AUTH_TOKEN` env var is unset, auth is completely bypassed for SSE, WebSocket, and agent run stream endpoints | `agentRunsStream.js:46`, `agentSSE.js:89`, `agentWebsocket.js:124` | §5 |
| 2 | **No rate limiting on auth endpoints**: Login/token issuance endpoints have no rate limiting, enabling brute-force attacks | `api/auth/index.js` | §9 |
| 3 | **No input validation on admin endpoints**: `reqBody()` is called without any schema validation for user creation, updates, and system config changes | `admin.js:70,107,219,509`, `api/admin/index.js:148,234,457,646,829,894` | §4 |

### P1 — Should Fix (7)

| # | Finding | File(s) | Section |
|---|---------|---------|---------|
| 4 | **7 god files over 1,000 lines**: Core files are too large, creating maintenance and review risks | `aibitat/index.js` (1,666), `outlook/lib.js` (1,453), `document/index.js` (1,287), `systemSettings.js` (1,243), `web-browsing.js` (1,227), `workspace/index.js` (1,072) | §2 |
| 5 | **Silent error swallowing on critical paths**: Supabase mirroring failures and agent run cancel status updates are silently swallowed | `document/index.js:161,325`, `agentRunsStream.js:191`, `oauth.js:192` | §3 |
| 6 | **No body validation on document/workspace/embed endpoints**: 179 `reqBody()` calls with no schema validation on body contents | `document/index.js`, `workspace/index.js`, `embed/index.js` | §4 |
| 7 | **24 models with zero test coverage**: Critical models including `memory.js`, `embedConfig.js`, `modelRouter.js`, `workspaceNote.js` have no tests | `server/models/` | §7 |
| 8 | **No rate limiting on admin and CPU-intensive endpoints**: Admin operations, document upload, PDF analysis have no rate limiting | `api/admin/index.js`, `document/index.js`, `pdfAnalysis.js`, `api/pdfAnalysis/index.js` | §9 |
| 9 | **`systemSettings.js` (1,243 lines) has only partial tests**: Three narrow test files cover specific features; bulk of logic is untested | `systemSettings.js` | §7 |
| 10 | **OAuth errors silently swallowed**: OAuth callback errors are caught and discarded, making debugging impossible | `connectors/oauth.js:192` | §3 |

### P2 — Nice to Have (6)

| # | Finding | File(s) | Section |
|---|---------|---------|---------|
| 11 | **31 raw SQL calls bypass Prisma**: All use parameterized queries (no injection risk) but represent tech debt — 2 tables exist outside schema/migrations | `workspaceNote.js`, `parseJobs/index.js`, `prisma/index.js` | §1 |
| 12 | **`chalk` v4 is EOL**: Pinned to v4 (last CJS version); no longer receiving updates | `package.json` | §6 |
| 13 | **`decodeJWT` returns non-null on failure**: Returns `{ p: null, id: null }` instead of `null` — fragile pattern for callers | `http/index.js:111` | §8 |
| 14 | **CSRF tokens stored in-memory**: `Map()` storage breaks under horizontal scaling | `csrfProtection.js:12` | §8 |
| 15 | **2 tables created outside Prisma migrations**: `shared_workspace_notes` and `parse_jobs` have no migration history or schema definition | `workspaceNote.js`, `parseJobs/index.js` | §10 |
| 16 | **88 dependencies is a large surface area**: No deprecated packages found, but the dependency tree is large | `package.json` | §6 |

---

*This report documents findings only. No code was modified during this audit.*
