<!-- SPDX-License-Identifier: MIT -->

# PLAN — Testing & Quality Gates (Epic E1)

> **Owner:** @Family-Team-Projects
> **Created:** 2026-06-07
> **Parent:** [`PLAN-PRODUCTION-READINESS.md`](./PLAN-PRODUCTION-READINESS.md)
> **Driver:** CEO Audit 2026-06-07 — Testing axis **78/100** (only weak axis).

## Problem

- Server coverage baseline is **21.74% lines / 18.79% functions**; frontend
  coverage is **~52% lines / ~51% functions**.
- The new **background job queue** has **0 automated tests** (only 8 manual
  smoke tests) — audit findings MEDIUM 4.1 and 4.4.
- The recently added **sidebars**, **`fetchWithTimeout`** helper, and
  **report-preview** WebSocket flow have no tests.
- Coverage gates are now in place for frontend and server.

## Goal

Raise coverage on **new and changed code** to ≥70 %, add the specific tests the
audit asked for, and make the score regression-proof via CI.

## Workstreams

### A1 — Background job queue tests  (server)
Create `server/__tests__/utils/backgroundJobs/queue.test.js` with cases:
- `add()` persists a pending job
- `process()` transitions pending → done
- retry on failure increments attempts and re-queues
- prune removes jobs older than retention window
- stale-recovery re-queues jobs stuck in "processing"
- edge cases: concurrent `add()`, large payloads, non-2xx LLM response

### A2 — Frontend component tests  (vitest + @testing-library/react)
- `FilesystemSidebar`, `DatabaseSidebar`, `PoliticalSidebar`: render loading,
  error (with retry button), empty, and populated states; assert abort on
  unmount.
- `fetchWithTimeout`: resolves, times out (AbortError), forwards external
  signal.
- `ReportPreviewListener`: rewrites `/api` → `API_BASE`, opens preview on event.

### A3 — End-to-end happy path
- Simulate agent emitting `reportPreview` → assert PreviewSidebar auto-opens
  and requests the public `/api/utils/reports/<file>` URL.

### A4 — Coverage gates ✅
- Server: `server/jest.config.js` has `coverageThreshold` guards (21% statements,
  15% branches, 18% functions, 21% lines). `yarn test:coverage` fails on regression.
- Frontend: `frontend/vitest.config.js` thresholds at 20%.
- Publish a coverage summary comment on PRs — future improvement.

## Acceptance Criteria

- [ ] Queue test file present, all cases green in CI
- [ ] Each new sidebar has loading/error/empty/data tests
- [ ] `fetchWithTimeout` + report listener covered
- [x] Server coverage gate prevents regression
- [x] Frontend coverage gate prevents regression
- [ ] CEO Audit Testing axis ≥ 90 on next run

## Related Issues

- E1-A1 queue tests · E1-A2 frontend tests · E1-A3 e2e · E1-A4 CI gate
