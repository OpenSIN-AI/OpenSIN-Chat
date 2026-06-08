<!-- SPDX-License-Identifier: MIT -->

# PLAN — Politician Data & Vector Search (Epic E2)

> **Owner:** @Family-Team-Projects
> **Created:** 2026-06-07
> **Parent:** [`PLAN-PRODUCTION-READINESS.md`](./PLAN-PRODUCTION-READINESS.md)
> **Driver:** ROADMAP Phase 2B/3C — politician DB empty, no vector store.

## Problem

The political features (DatabaseSidebar, PoliticalSidebar, `@politician-search`
agent, semantic speech search) are **code-complete but data-empty**:

- The Bree sync job (`sync-politician-data.js`) has **never run** in prod →
  the DB is empty (ROADMAP blocker, ex-issue #21).
- SQLite has **no pgvector** → `semanticSearchSpeeches()` returns `[]`.
- Targeting still references the 20. WP; the **21. Wahlperiode** parliament ID
  and Abgeordnetenwatch **API v2** fields need migration.

## Goal

Populate the politician database in production and enable real semantic +
full-text search over speeches and protocols.

## Workstreams

### B1 — First sync run + verification
- Trigger `sync-politician-data.js` against live Bundestag DIP +
  Abgeordnetenwatch APIs.
- Add idempotency + resume-on-failure; log counts (politicians, speeches,
  protocols).
- Verify the sidebars and `@politician-search` return real rows.
- **Status:** Pending — needs running container (see Issue #86)

### B2 — PostgreSQL + pgvector (production DB)
- Provision Postgres with the `vector` extension.
- Wire `PoliticianVectorStore` to pgvector; embed speeches on ingest.
- Migration path: SQLite (dev) → Postgres (prod) documented.
- **Status:** Pending

### B3 — Full-text search
- Postgres `tsvector` index over speech + protocol text.
- Expose `?q=` search on `/api/politician/*` with ranked results.
- **Status:** Pending

### B4 — Source freshness (21. WP) ✅ **COMPLETED** (Issue #84)
- Parameterize parliament/Wahlperiode ID; default to 21. WP.
- Adopt new Abgeordnetenwatch v2 fields; map to existing schema.
- **Completed by:** Agent 5 (commits `378b7286`, `e7a7acb4`, `caf0d60b`, `7ef1d62c`, `35016ea1`)
- **Configuration:**
  - `BUNDESTAG_WAHLPERIODE=21` (env var, default 21)
  - `AW_PARLIAMENT_PERIOD=132` (21. WP, verified 733 Mandate)
  - `AW_ENRICH_POLITICIANS=false` (optional cross-source enrichment)
  - `BUNDESTAG_DIP_API_KEY` (optional DIP fallback)
- **Field mapping (AW v2.9.0):**
  - `first_name` → `firstName`
  - `last_name` → `lastName`
  - `year_of_birth` (Int) → `birthDate` (Date)
  - `ext_id_bundestagsverwaltung` → `externalId` (cross-source linking)
- **Pagination:** Range-based, 8 pages × 100 = 733 Mandate

## Acceptance Criteria

- [x] Endpoints target the 21. Wahlperiode by default (Issue #84) ✅
- [ ] Sync job runs end-to-end and populates the DB (counts logged) — needs live DB
- [ ] `semanticSearchSpeeches()` returns ranked results from pgvector — needs Postgres
- [ ] Full-text `?q=` search returns ranked hits — needs Postgres
- [ ] DatabaseSidebar / PoliticalSidebar show live data in prod — needs live DB

**1/5 ACs complete (B4), 4/5 need live infrastructure**

## Related Issues

- E2-B1 sync run · E2-B2 pgvector · E2-B3 full-text · **B4 21.WP migration (#84) ✅**
- **#66 (closed):** Initial DB-Befüllung — aufgeteilt in B1 + B4
- **#84 (in progress):** B4 migration — code complete, runtime verification pending
- **#86 (in progress):** Container startup blocker — must be resolved for B1 runtime
