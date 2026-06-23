<!-- SPDX-License-Identifier: MIT -->

# PLAN — Production Readiness (CEO Master Plan)

> **Owner:** @Family-Team-Projects
> **Created:** 2026-06-07
> **Status:** ACTIVE — this is the single source of truth for remaining work.
> **Baseline:** CEO Audit 2026-06-07 — **Grade A (95.4 / 100)**, 0 CRITICAL, 0 HIGH.

This document is the executive roll-up of everything left to ship OpenSIN-Chat
as a fully hardened, scalable product. It is organised into **epics**. Each
epic links to a detailed plan file and to the GitHub issues that implement it.

The product is already **production-ready with monitoring**. The work below
moves it from "A" to "A+ / enterprise-grade": closing the test gap, filling the
politician database, and standing up real scale-out infrastructure.

---

## Executive Summary — Where We Stand

| Axis (CEO Audit) | Score | Verdict |
|------------------|-------|---------|
| Security | 95 | ✅ Strong |
| Performance | 98 | ✅ Strong |
| Code Quality | 96 | ✅ Strong (a few oversized upstream files) |
| **Testing** | **78 → 90+** | ✅ **Closed — +73 tests added (3602 total), coverage gate set** |
| Dependencies | 95 | ✅ Strong (pin top-level criticals) |
| Documentation | 99 | ✅ Best-in-class |
| CI/CD | 95 | ✅ 3 workflows live |
| Compliance | 100 | ✅ SBOM + SPDX + licenses |

**The one number that mattered:** Testing at 78 — now closed. +73 tests added
(3602 total) with a CI coverage gate at 70%. Overall score is now ≥97.

---

## Epics

### E1 — Testing & Quality Gates ✅
> Plan: [`PLAN-TESTING-QA.md`](./PLAN-TESTING-QA.md)
Raise test ratio from 1:36 toward ≥1:10 on new/changed code, add the missing
queue tests flagged by the audit, cover the new sidebars + report flow, and add
a CI coverage gate so the score can never silently regress again.

- ✅ Background job queue jest tests (audit MEDIUM 4.1 / 4.4)
- ✅ Frontend tests: sidebars, `fetchWithTimeout`, report-preview listener
- ✅ E2E happy-path: agent → report → preview iframe
- ✅ CI coverage gate (fail PR if new code < 70 %) — thresholds raised to 70%
  in `server/jest.config.js` and `frontend/vitest.config.js` (2026-06-23)

### E2 — Politician Data & Vector Search ✅
> Plan: [`PLAN-DATA-SYNC.md`](./PLAN-DATA-SYNC.md)
Politician DB is populated (733 politicians, 733 mandates, 343 speeches, 24 816
votes, 49 committees, 751 committee memberships). SQLite falls back to FTS text
search; PostgreSQL + pgvector is wired and semantic search returns results in
production.

- ✅ Run + verify the first politician sync job
- ✅ PostgreSQL + pgvector production database
- ✅ Activate `PoliticianVectorStore` (semantic speech search)
- ✅ Bundestag 21. WP migration + Abgeordnetenwatch API v2 fields (#84)
- ✅ Full-text search over speeches / protocols (SQLite FTS fallback)

### E3 — Resilience & External-API Hardening ✅
> Plan: [`PLAN-RESILIENCE.md`](./PLAN-RESILIENCE.md)
> Extends the timeout/abort/retry work already merged on `main`.
Make every outbound call to a third-party API (Bundestag DIP,
Abgeordnetenwatch, AfD RSS, web search) uniformly time-bounded, cached, and
degradable. Relates to issue #52.

- ✅ Shared server-side `fetchWithTimeout` everywhere (done for 3 proxies)
- ✅ Shared `ResilientHttpClient` with timeout, retry, rate limit, circuit breaker
- ✅ Short-TTL cache layer for external responses (stale-while-revalidate)
- ✅ Circuit-breaker + cached-fallback when an upstream is down
- ✅ Politician sync API callers (Bundestag, Abgeordnetenwatch, PlenarScraper) migrated
- ✅ Web search providers (SerpAPI, DuckDuckGo, SearxNG) migrated to `ResilientHttpClient`
- ✅ RSS feed proxy migrated to `ResilientHttpClient`
- ✅ PDF cross-check research agent (Serper, SearchApi) migrated to `ResilientHttpClient`
- ✅ All unbounded raw `fetch()` calls in external API paths eliminated

### E4 — Requested Endpoints ✅
> Plan: inline below + issues #53, #54.
Two product endpoints already requested by the team.

- ✅ `POST /api/enhance-prompt` — LLM prompt rewriter (#53) — backend shipped
- ✅ `POST /api/terminal/exec` — sandboxed command execution (#54) — backend shipped
- ✅ `/settings/terminal` admin UI — shipped (requires `ENABLE_TERMINAL_EXEC=true`)

### E5 — Scale & Deployment ✅
> Plan: [`PLAN-SCALE-DEPLOY.md`](./PLAN-SCALE-DEPLOY.md)
Turn the existing `cloud-deployments/` scaffolding into real, tested artifacts.

- ✅ Production Docker image + compose
- ✅ Helm chart finalize (Kubernetes) — linted + tested
- ✅ Redis session cache (horizontal scaling) — documented
- ✅ CDN for static assets — documented

### E6 — Code Quality & Dependency Hygiene ✅
> Plan: [`PLAN-DEPENDENCY-SECURITY.md`](./PLAN-DEPENDENCY-SECURITY.md) (exists)
Address the INFO-level findings before they become MEDIUM.

- ✅ Refactor oversized files — `system.js` 2094→8 LOC (10 sub-modules), `updateENV.js` 1195→4 LOC (6 sub-modules)
- ✅ Pin critical top-level deps — `langchain`, `openai`, `@langchain/*` (6 pkgs), `@anthropic-ai/sdk` all pinned to exact versions

### E7 — Governance & Repo Hygiene ✅
Make the repo self-serve for contributors.

- ✅ `.github/ISSUE_TEMPLATE/` (bug + feature + audit-finding)
- ✅ `CODEOWNERS`
- Keep `ROADMAP.md` / `BACKLOG.md` / this file in sync each sprint

### E8 — Post-MVP Product Bets (already planned)
Tracked in existing plan docs; not blocking production.
- [`PLAN-MEMORIES.md`](./PLAN-MEMORIES.md)
- [`PLAN-WIDGET-API.md`](./PLAN-WIDGET-API.md)
- [`PLAN-VOICE-VISION.md`](./PLAN-VOICE-VISION.md)
- [`PLAN-MULTI-PROVIDER.md`](./PLAN-MULTI-PROVIDER.md)

---

## Recommended Sequencing (CEO call)

1. ~~**E1 Testing**~~ ✅ Done — +73 tests, coverage gate at 70%.
2. **E2 Data/Sync** — makes the headline political features real.
3. **E3 Resilience** — protects the new data paths in production.
4. **E4 Endpoints** — quick product wins (#53 then #54 with security review).
5. **E5 Scale** — once load justifies it.
6. **E6 / E7** — continuous, fit between the above.

---

## Definition of Done (product-level)

- [x] CEO Audit Testing axis ≥ 90 (overall ≥ 97)
- [x] Politician DB populated + semantic search returns results in prod
- [x] All external-API callers time-bounded + degrade gracefully
- [x] One-command production deploy (Docker or Helm) documented + tested
- [x] Issue templates + CODEOWNERS in place
- [x] ROADMAP / BACKLOG / this file reconciled

---

*This plan is maintained alongside `ROADMAP.md` (phase view) and `BACKLOG.md`
(sprint view). When they disagree, this file wins for "what's left to do".*
