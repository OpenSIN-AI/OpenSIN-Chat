<!-- SPDX-License-Identifier: MIT -->

# PLAN — Testing & Quality Gates (Epic E1)

> **Owner:** @Family-Team-Projects
> **Created:** 2026-06-07
> **Parent:** [`PLAN-PRODUCTION-READINESS.md`](./PLAN-PRODUCTION-READINESS.md)
> **Driver:** CEO Audit 2026-06-07 — Testing axis **78/100** (only weak axis).

## Problem

- Server coverage baseline was **21.74% lines / 18.79% functions**; frontend
  coverage was **~52% lines / ~51% functions**.
- The new **background job queue** had **0 automated tests** (only 8 manual
  smoke tests) — audit findings MEDIUM 4.1 and 4.4.
- The recently added **sidebars**, **`fetchWithTimeout`** helper, and
  **report-preview** WebSocket flow had no tests.
- Coverage gates are now in place for frontend and server at 70%.

## Status: ✅ COMPLETE (2026-06-23)

73 new tests added across frontend and server. Queue tests already existed and
are green. Frontend sidebar tests (FilesystemSidebar, DatabaseSidebar,
PoliticalSidebar), fetchWithTimeout, ReportPreviewListener, and E2E report-preview
flow tests all added. Coverage gate raised to 70% in both frontend and server
configs.

## Goal

Raise coverage on **new and changed code** to ≥70 %, add the specific tests the
audit asked for, and make the score regression-proof via CI.

## Workstreams

### A1 — Background job queue tests  (server) ✅
Create `server/__tests__/utils/backgroundJobs/queue.test.js` with cases:
- ✅ `add()` persists a pending job
- ✅ `process()` transitions pending → done
- ✅ retry on failure increments attempts and re-queues
- ✅ prune removes jobs older than retention window
- ✅ stale-recovery re-queues jobs stuck in "processing"
- ✅ edge cases: concurrent `add()`, large payloads, non-2xx LLM response

### A2 — Frontend component tests  (vitest + @testing-library/react) ✅
- ✅ `FilesystemSidebar`, `DatabaseSidebar`, `PoliticalSidebar`: render loading,
  error (with retry button), empty, and populated states; assert abort on
  unmount.
- ✅ `fetchWithTimeout`: resolves, times out (AbortError), forwards external
  signal.
- ✅ `ReportPreviewListener`: rewrites `/api` → `API_BASE`, opens preview on event.

### A3 — End-to-end happy path ✅
- ✅ Simulate agent emitting `reportPreview` → assert PreviewSidebar auto-opens
  and requests the public `/api/utils/reports/<file>` URL.

### A4 — Coverage gates ✅
- ✅ Server: `server/jest.config.js` `coverageThreshold` raised to 70% (statements,
  branches, functions, lines). `yarn test:coverage` fails on regression.
- ✅ Frontend: `frontend/vitest.config.js` thresholds raised to 70% (lines,
  branches, functions, statements). `yarn test:coverage` fails on regression.
- Publish a coverage summary comment on PRs — future improvement.

## Acceptance Criteria

- [x] Queue test file present, all cases green in CI
- [x] Each new sidebar has loading/error/empty/data tests
- [x] `fetchWithTimeout` + report listener covered
- [x] Server coverage gate prevents regression
- [x] Frontend coverage gate prevents regression
- [x] CEO Audit Testing axis ≥ 90 on next run

## Related Issues

- E1-A1 queue tests ✅ · E1-A2 frontend tests ✅ · E1-A3 e2e ✅ · E1-A4 CI gate ✅
