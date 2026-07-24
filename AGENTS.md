<!-- SPDX-License-Identifier: MIT -->

# OpenSIN Chat agent context

This file defines repository-specific rules for coding agents.

## Product

OpenSIN Chat is a self-hosted AI workspace for chat, retrieval, document analysis, agents and controlled integrations.

Do not describe the repository as production-ready based on documentation alone. CI, runtime health and executed tests are the source of truth.

## Canonical architecture

```text
apps/
  web/       browser application
  api/       API, persistence, authentication and agent orchestration
  worker/    document parsing, OCR, scraping and extraction
packages/    stable shared contracts
platform/    containers, deployment and operational infrastructure
tooling/     developer tools, skills and generated engineering artifacts
docs/        current documentation and explicit archives
tests/       cross-application integration and browser tests
```

Read `docs/repository-layout.md` before moving or creating files.

## Commands

```bash
yarn install --frozen-lockfile
yarn dev
yarn check:layout
yarn lint:ci
yarn type-check
yarn test
yarn test:coverage
yarn test:e2e
yarn build
yarn verify:strict
```

Node.js 24 is required. The root `yarn.lock` is the only active lockfile.

## Non-negotiable rules

1. Verify before claiming success. State explicitly when a build, test or browser flow was not run.
2. Do not create product folders in the repository root.
3. Do not create nested lockfiles.
4. Do not place `.sin-code`, agent caches, screenshots, coverage or build output in active source trees.
5. Local agent and runtime state belongs under ignored `.local/`.
6. Generated engineering artifacts belong under ignored `tooling/artifacts/`.
7. Historical reports and removed features belong under `docs/archive/` and are not current truth.
8. Security-sensitive behavior must fail closed.
9. Never log, commit or expose credentials.
10. New product code belongs in an owning application until a real shared contract justifies `packages/`.

## Application boundaries

- `apps/web` may consume API contracts but must not import API implementation files.
- `apps/api` orchestrates product behavior and persistence.
- `apps/worker` performs untrusted or resource-heavy document processing.
- Product applications must not depend on `platform/` or `tooling/` implementation details.
- OpenAfD/politician-specific behavior should move toward an explicit vertical rather than expanding the platform core.

## Security status

- The web terminal has been removed from the active product.
- Developer API keys, browser-extension keys, reset tokens and temporary SSO tokens are stored as digests; plaintext is returned only when issued.
- Imported plugin handlers are not executed in the production API process.
- API and document worker are jointly required for container health.

Do not weaken these controls for convenience.

## Change discipline

For structural changes, update package workspaces, CI, Docker, Compose, scripts, docs and tests in the same change. Run `yarn check:layout` after every move.

For dependency upgrades, update the root lockfile and test the affected adapter or feature. Do not edit manifest versions without regenerating the lockfile.

For database changes, add a Prisma migration and verify both a fresh database and an existing database upgrade.

## Documentation

Current documentation lives in `docs/`. Do not create new readiness reports or duplicate guides. Update the canonical document or add an ADR for a durable architectural decision.

## Trust rule

A large diff, a passing typecheck or a confident explanation is not proof. Proof means the relevant tests, build and user flow were actually executed and their results inspected.
