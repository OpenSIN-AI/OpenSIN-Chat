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

### B2 — PostgreSQL + pgvector (production DB)
- Provision Postgres with the `vector` extension.
- Wire `PoliticianVectorStore` to pgvector; embed speeches on ingest.
- Migration path: SQLite (dev) → Postgres (prod) documented.

### B3 — Full-text search
- Postgres `tsvector` index over speech + protocol text.
- Expose `?q=` search on `/api/politician/*` with ranked results.

### B4 — Source freshness (21. WP) ✓ DONE (#84)
- Parameterize parliament/Wahlperiode ID; default to 21. WP. ✓
- Adopt new Abgeordnetenwatch v2 fields; map to existing schema. ✓
- `AW_PARLIAMENT_PERIOD=132`, endpoint `/candidacies-mandates`, fields `first_name`/`last_name`/`year_of_birth`. ✓
- Bundestag API: `BUNDESTAG_WAHLPERIODE=21`, DIP-API fallback. ✓
- `DATA-SOURCES.md` aktualisiert. ✓

## Acceptance Criteria

- [ ] Sync job runs end-to-end and populates the DB (counts logged) — needs live DB
- [ ] `semanticSearchSpeeches()` returns ranked results from pgvector — needs live DB
- [ ] Full-text `?q=` search returns ranked hits — needs live DB
- [x] Endpoints target the 21. Wahlperiode by default (B4 done — `AW_PARLIAMENT_PERIOD=132`, `BUNDESTAG_WAHLPERIODE=21`)
- [ ] DatabaseSidebar / PoliticalSidebar show live data in prod — needs live DB

## Related Issues

- E2-B1 sync run · E2-B2 pgvector · E2-B3 full-text · E2-B4 21.WP migration
