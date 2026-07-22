<!-- SPDX-License-Identifier: MIT -->

# ADR 002: Modernization boundaries and supported product profile

- Status: Accepted
- Date: 2026-07-23

## Context

OpenSIN Chat originated from AnythingLLM and accumulated broad provider, database, scraping, and deployment support. The product now targets sovereign political research, document analysis, durable agent runs, and traceable artifacts. Carrying every historical integration increases bundle size, dependency risk, test cost, and architectural coupling.

## Decision

OpenSIN Chat follows a focused product profile:

1. The canonical single-node profile is Node.js 22, React 19, Express 5, Prisma with SQLite, LanceDB, local storage, and the isolated Node.js collector.
2. Fireworks/OpenAI-compatible APIs are the primary hosted model interface. Anthropic and Ollama remain supported compatibility adapters. Additional providers are optional and must justify their maintenance cost with active product use and automated tests.
3. LanceDB is the canonical local vector store. PostgreSQL/pgvector belongs to a future, separately generated team-scale profile rather than being mixed into the active SQLite schema.
4. Document parsing and OCR remain isolated from the API process. The collector is treated as a worker boundary with authenticated contracts; new ingestion work must use durable job records and idempotent processing.
5. Browser automation is optional. Production images do not download Chromium from an upstream vendor by default. Enabling Chromium requires an explicit self-controlled URL and checksum.
6. New API payloads, queue payloads, connector configuration, agent events, and artifact metadata require versioned schemas and validation at the boundary.
7. New code must not introduce a second library for an already solved concern without an explicit ADR.
8. Historical tool state, generated reports, local databases, test output, and transient lockfiles are not product source and must remain outside active source paths.

## Consequences

- Integrations without active product use can be deprecated and removed in bounded follow-up changes.
- SQLite and PostgreSQL behavior will no longer be implied to be interchangeable.
- Production-readiness claims are topology-specific and must reference a tested commit.
- The repository can be reduced incrementally without a risky full rewrite.
- AnythingLLM attribution remains intact, while architectural dependencies are replaced behind explicit boundaries.

## Removal criteria

A provider or feature is removable when all are true:

- it is not part of the supported product profile;
- no production configuration enables it;
- no maintained test exercises it;
- no migration or stored data requires it;
- its removal passes type-check, tests, build, container smoke test, and a documented data migration check.
