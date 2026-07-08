# CEO Audit — OpenSIN-Chat

> **Date:** 2026-07-08
> **Auditor:** Automated full-repo audit (fresh clone of `main`)
> **Scope:** Stack currency, AnythingLLM de-forking, architecture, security, testing, compliance
> **Previous audit:** 2026-06-27 (Grade B, 72/100)

---

## Executive Verdict

**Grade: B+ (78/100)** — Production-ready, modern stack, but carries inherited structural debt and a few dependency-hygiene gaps.

The stack is genuinely **state-of-the-art for July 2026**. The move away from AnythingLLM is **~90% complete**: all user-facing branding, endpoints, and models are OpenSIN-native. What remains are (a) legally-required upstream attribution, (b) documented backwards-compat shims, and (c) a handful of stale `anythingllm_*` localStorage keys. The real modernization gap is **structural** (god files, circular-dependency workarounds, server still ~100% JS) — not stack age.

---

## 1. Stack Currency — EXCELLENT ✅

| Component | Version | July 2026 Status |
|-----------|---------|------------------|
| React | 19.1.0 | ✅ Current (19 is latest major) |
| Vite | 8.0.16 | ✅ Current |
| Tailwind CSS | 4.0 | ✅ Current (v4, just migrated) |
| TypeScript | 6.0.3 | ✅ Current |
| Node.js | ≥22 | ✅ Current LTS |
| Express | 5.2.1 | ✅ Current (v5) |
| Prisma | 7.8.0 | ✅ Current |
| LangChain | 1.5.2 | ✅ Current (v1 line) |
| MCP SDK | 1.26 | ✅ Current |
| Vitest | 4.x | ✅ Current |
| Jest | 30.x | ✅ Current |
| ESLint | 9/10 | ✅ Current (flat config) |
| Docker base | ubuntu:noble + node:22-slim | ✅ Current, multi-arch (arm64/amd64) |

**Verdict:** This is a modern 2026 stack. No framework is a major version behind. The Tailwind v4, React 19, Express 5, LangChain 1, and Prisma 7 upgrades are all done.

### Dependency hygiene gaps (minor)

| Package | Current | Issue |
|---------|---------|-------|
| `@tremor/react` | 3.18.7 | **DEAD — 0 imports.** Requires Tailwind v3 → install-time peer conflict with the new Tailwind v4. **Remove.** |
| `recharts-to-png` | 2.3.1 | **DEAD — 0 imports.** Remove. |
| `react-confetti-explosion` | 3.0.3 | **DEAD — 0 imports.** Remove. |
| `@anthropic-ai/sdk` | 0.39.0 | Old (early-2025), pinned transitively by `@langchain/anthropic`. Low risk but worth tracking. |
| `react-router-dom` | 6.30.4 | v7 GA since Nov 2024. Migration is non-trivial (loader API). Optional. |
| `recharts` | 2.12.5 | v3 available. `echarts` is also present → potential lib duplication. |
| `react-i18next` | 14.1.1 | Paired with `i18next` 26 — verify peer-range (react-i18next 15 recommended for i18next ≥24). |

---

## 2. De-Forking from AnythingLLM — ~90% Complete ✅

### Legitimate / required (keep)
- **Legal attribution**: `package.json` contributors, `THIRD_PARTY.md`, `LICENSE`, `CONTRIBUTING.md` — MIT requires this. ✅
- **npm packages** `@mintplex-labs/{bree,express-ws,mdpdf,piper-tts-web}` — real published packages, legitimate runtime deps. ✅
- **Compatibility shims**: `server/utils/files/logo.js` (legacy logo filenames), `ANYTHINGLLM_*` env vars in `patchSdkTimeouts.js` / `collectorApi` — documented backwards-compat for upgrading installs. ✅ Acceptable.

### Should be rebranded (minor debt)
- **localStorage keys** still use the `anythingllm_` prefix (6 refs):
  - `anythingllm_pdf_mock`, `anythingllm_ws_mock` (dev/mock flags)
  - `anythingllm_disable_onboarding` (`frontend/src/models/system.js`)
  - Rebrand to `opensin_*` with a one-time migration/fallback read.

**Verdict:** No user-facing AnythingLLM branding remains. The branding linter passes. Remaining references are either legally required or intentional compat shims. Only the localStorage keys are true cosmetic debt.

---

## 3. Architecture — INHERITED DEBT (biggest gap) ⚠️

| Metric | Count | Note |
|--------|-------|------|
| God files >500 LOC | 24+ | `aibitat/index.js` (1666), `outlook/lib.js` (1453), `api/document/index.js` (1287), `systemSettings.js` (1229), `web-browsing.js` (1227) |
| Inline `require()` (circular-dep workarounds) | ~1651 | e.g. `const { User } = require("./user")` inside methods |
| `findMany` calls | 77 | Many now bounded via `clampLimit`/`paginate` (improved since June), but audit each for pagination |
| Server TypeScript | 2 TS / 477 JS | **No `server/tsconfig.json`.** TS migration barely started (issue #9). |

**Verdict:** The architecture debt is inherited from the AnythingLLM fork, not new. It does not block production but limits maintainability. Priority: break up the top-5 god files and add `server/tsconfig.json` + `checkJs` for incremental typing.

---

## 4. Security — STRONG ✅

| Check | Result |
|-------|--------|
| Hardcoded secrets | ✅ 0 found |
| Committed `.env` files | ✅ None |
| `child_process` usage | ✅ `execFile` with `shell:false` (no shell injection) |
| Env documentation | ✅ 405 vars in `server/.env.example` |
| Prisma models | 47 (SQLite default, PG-capable) |
| SPDX headers | ✅ 100% coverage |
| SBOM | ✅ Present |

**Verdict:** Security posture is strong. No critical or high issues found in this pass.

---

## 5. Testing — GOOD ✅

- 177 server test files, 218 frontend test files, 87 e2e specs
- June coverage: ~52% frontend / ~23% server
- **Gap:** server coverage still low; the 24% → target ratchet should continue

---

## 6. CI/CD & Compliance ✅

- Self-hosted CI via webhook (single `ci.yml` stub → OCI VM runner)
- Docker: multi-arch, Ubuntu noble, Node 22, healthcheck + entrypoint scripts
- **Gap:** CI is a black-box webhook — no visible test/lint gate in the repo itself. Consider a lightweight GitHub-hosted `lint + test` job as a PR gate so mergeability isn't blocked on VM health.

---

## Priority Recommendations

### P0 — Quick wins (do now, safe)
1. **Remove 3 dead deps** (`@tremor/react`, `recharts-to-png`, `react-confetti-explosion`) — eliminates the Tailwind v3 ↔ v4 peer conflict.
2. **Rebrand `anythingllm_*` localStorage keys** → `opensin_*` with fallback.

### P1 — Structural (plan a sprint)
3. Add `server/tsconfig.json` + `allowJs`/`checkJs`; continue `.d.ts` typing of god-files (issue #9).
4. Break up the top-5 god files (aibitat, outlook lib, api/document, systemSettings, web-browsing).
5. Add a GitHub-hosted `lint + test` PR gate (don't rely solely on the self-hosted webhook).

### P2 — Nice-to-have
6. Evaluate `react-router-dom` v7 migration.
7. De-duplicate charting libs (recharts vs echarts).
8. Continue raising server test coverage toward 40%+.
