# OpenSIN Chat — PLAN: Phase 9 — Security & Operations Hardening

> **Erstellt:** 2026-06-22  
> **Phase:** 9 — Security & Operations Hardening  
> **Status:** 🚧 IN PROGRESS  
> **Roadmap:** [ROADMAP.md](ROADMAP.md) — Phase 9  
> **Auslöser:** Phase 8 abgeschlossen (Docs UI Polish). Nächster logischer Schritt: Produktions-Readiness aus `docs/PLAN-PRODUCTION-READINESS.md` umsetzen, beginnend mit Sicherheits- und Operations-Doku sowie Repo-Governance.

---

## Staleness / Problem Audit

| # | Problem | Aktueller Zustand | Soll-Zustand | Schwere |
|---|---|---|---|---|
| P1 | Security-Handbuch | Root `SECURITY.md` existiert, aber keine in-App Security-Seite für Betreiber | `docs/SECURITY.md` + In-App `/docs/security` | Medium |
| P2 | Operations-Runbook | Verstreut über `INCIDENT-RESPONSE.md`, `OPENSIN-CHAT-DEPLOYMENT.md`, `AUTO-DEPLOY.md` | Konsolidiertes In-App `/docs/operations` | Medium |
| P3 | GitHub Governance | Keine Issue-Templates, kein CODEOWNERS | `.github/ISSUE_TEMPLATE/` + `CODEOWNERS` | Low |
| P4 | Tests für Docs-Manifest | Keine direkten Tests für `docsManifest.ts` | Unit-Tests für neue Einträge | Low |

---

## Waves (Executing)

### Wave 1: Security & Operations Docs ✅

#### Task 1.1: Create `docs/SECURITY.md`

**files_modified:**
- `docs/SECURITY.md` (new)
- `docs/SECURITY.md.doc.md` (new)

**action:**
- Operational security guide in German for operators.
- Covers: security model, auth modes, secrets management, Cloudflare tunnel security, DSGVO defaults, document isolation, API security, deployment checklist.
- Links to root `SECURITY.md` for vulnerability reporting.

**acceptance_criteria:** ✅
- `docs/SECURITY.md` exists and passes branding check.
- CoDocs companion exists.

---

#### Task 1.2: Create `docs/OPERATIONS.md`

**files_modified:**
- `docs/OPERATIONS.md` (new)
- `docs/OPERATIONS.md.doc.md` (new)

**action:**
- Day-to-day operations runbook in German.
- Covers: health checks, production deploy, quick frontend update, backup strategy, container restart, common troubleshooting, monitoring, upstream security patches, incident escalation.
- Links to `INCIDENT-RESPONSE.md`, `OPENSIN-CHAT-DEPLOYMENT.md`, `SECURITY.md`.

**acceptance_criteria:** ✅
- `docs/OPERATIONS.md` exists and passes branding check.
- CoDocs companion exists.

---

#### Task 1.3: Wire into In-App Docs

**files_modified:**
- `frontend/scripts/sync-docs.js`
- `frontend/src/pages/Docs/docsManifest.ts`

**action:**
- Added `SECURITY.md` and `OPERATIONS.md` to curated sync list.
- Added new `operations` category in `docsManifest.ts`.
- Added entries for `/docs/security` and `/docs/operations`.
- Added `FILE_TO_SLUG` mapping for markdown link resolution.

**acceptance_criteria:** ✅
- Docs sync copies both files.
- Both pages appear in sidebar under "Sicherheit & Betrieb".
- Internal markdown links resolve to `/docs/security` and `/docs/operations`.

---

### Wave 2: Repository Governance

#### Task 2.1: GitHub Issue Templates

**files_modified:**
- `.github/ISSUE_TEMPLATE/bug.yml` (new)
- `.github/ISSUE_TEMPLATE/feature.yml` (new)
- `.github/ISSUE_TEMPLATE/config.yml` (new)

**action:**
- Bug report template: environment, reproduction steps, expected vs actual, logs, severity.
- Feature request template: motivation, proposed solution, alternatives, acceptance criteria.
- Config: disable blank issues, link to security policy and documentation.

**acceptance_criteria:**
- Templates render correctly in GitHub.
- Config links to `SECURITY.md` and `/docs`.

---

#### Task 2.2: CODEOWNERS

**files_modified:**
- `CODEOWNERS` (new)

**action:**
- Define code owners for critical paths:
  - `server/` — backend owner
  - `frontend/` — frontend owner
  - `docker/` / `docker-opensin/` — DevOps owner
  - `docs/` — docs owner
  - `scripts/deploy-production.sh` — infrastructure owner
  - `.github/` — repo admin

**acceptance_criteria:**
- `CODEOWNERS` file exists and is valid.
- PRs to critical paths require owner review.

---

### Wave 3: Tests & Verification

#### Task 3.1: Add `docsManifest` tests

**files_modified:**
- `frontend/src/pages/Docs/docsManifest.test.ts` (new)

**action:**
- Tests for new entries: security and operations.
- Tests category mapping, labels, content loading, link resolution.

**acceptance_criteria:** ✅
- `docsManifest.test.ts` runs green.

---

#### Task 3.2: Build, Lint, Tests, Branding

**action:**
- `cd frontend && yarn build` ✅
- `cd frontend && yarn lint:check` ✅
- `cd frontend && yarn test` ✅ 1636 tests
- `./scripts/check-branding.sh` ✅

**acceptance_criteria:**
- All checks green.

---

## Definition of Done

- [x] `docs/SECURITY.md` exists and is synced to in-app docs
- [x] `docs/OPERATIONS.md` exists and is synced to in-app docs
- [x] `docsManifest.ts` has `operations` category with both entries
- [x] `docsManifest.test.ts` tests the new entries
- [x] GitHub issue templates exist
- [x] `CODEOWNERS` exists
- [x] `yarn build` exit 0
- [x] `yarn lint:check` exit 0
- [x] `yarn test` no new failures
- [x] `check-branding.sh` exit 0
- [x] `.dockerignore` explicitly includes `docs/*.md`
- [x] Deployed to production

---

## Files Changed

| File | Change |
|---|---|
| `docs/SECURITY.md` | New operational security guide |
| `docs/SECURITY.md.doc.md` | CoDocs companion |
| `docs/OPERATIONS.md` | New operations runbook |
| `docs/OPERATIONS.md.doc.md` | CoDocs companion |
| `frontend/scripts/sync-docs.js` | Added security and operations to curated list |
| `frontend/src/pages/Docs/docsManifest.ts` | Added `operations` category + entries |
| `frontend/src/pages/Docs/docsManifest.test.ts` | New tests for manifest entries |
| `.github/ISSUE_TEMPLATE/bug.yml` | New bug report template |
| `.github/ISSUE_TEMPLATE/feature.yml` | New feature request template |
| `.github/ISSUE_TEMPLATE/config.yml` | New issue template config |
| `CODEOWNERS` | New code owners file |
| `.dockerignore` | Added `!docs/*.md` for top-level docs |
| `.dockerignore.doc.md` | Updated docs exclusion description |

---

## Verifikation

| Check | Result |
|---|---|
| `cd frontend && yarn build` | ✅ |
| `cd frontend && yarn lint:check` | ✅ |
| `cd frontend && yarn test` | ✅ 1636 tests |
| `./scripts/check-branding.sh` | ✅ |
| Deploy to production | ✅ commit `e6b9e3a4` |

---

*Generated: 2026-06-22 | Phase 9: Security & Operations Hardening | 3 Waves, 7 Tasks | ✅ COMPLETE*
