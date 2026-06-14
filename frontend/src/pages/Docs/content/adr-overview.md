# Architecture Decision Records (ADRs)

This directory contains the formal Architecture Decision Records for
OpenSIN-Chat. ADRs document **why** a particular technical choice was made,
what alternatives were considered, and what trade-offs we accepted.

## Index

| ID | Title | Status | Date |
|---|---|---|---|
| [ADR-001](ADR-001-persistent-job-queue.md) | Persistente Background-Job-Queue via SQLite | Accepted | 2026-06-07 |

## Conventions

* **Numbering:** Sequential, zero-padded to 3 digits (`ADR-001`, `ADR-002`, …).
* **Filename:** `ADR-NNN-kebab-case-title.md`
* **Status lifecycle:** `Proposed` → `Accepted` → (`Deprecated` | `Superseded by ADR-XXX`)
* **Language:** German for prose (matches OpenSIN-Chat's commit-message style
  and target audience), English for code identifiers and links.
* **Immutability:** Once Accepted, ADRs are **not edited** — superseded
  decisions get a new ADR that links to the old one.
