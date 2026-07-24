# Architecture

OpenSIN Chat is a modular monorepo with three deployable applications and explicit infrastructure boundaries.

## System overview

```text
Browser
  |
  v
apps/web  ───────────────> apps/api ───────────────> relational database
                                |
                                +───────────────> configured model/vector providers
                                |
                                +-- signed HTTP --> apps/worker
                                                       |
                                                       +--> document parsing
                                                       +--> OCR
                                                       +--> scraping
                                                       +--> extraction
```

## Applications

### `apps/web`

React and Vite browser application. It owns routing, presentation, local interaction state and API clients. It must not import API implementation files.

### `apps/api`

Express application and product orchestration layer. It owns authentication, authorization, workspaces, chats, persistence, agents, connector coordination, job state and public API contracts.

The API is responsible for policy and metadata. Resource-heavy or untrusted document work belongs in the worker.

### `apps/worker`

Document-processing boundary. It owns file parsing, OCR, browser scraping, audio conversion and extraction. Requests require integrity signatures. The worker is a required runtime dependency and participates in container health.

## Shared code

`packages/` is reserved for stable contracts used by at least two applications. Code is not moved there merely to shorten imports. Each package must expose a narrow public API and own tests.

## Infrastructure

`platform/` owns deployment topology and runtime glue:

- `platform/containers/image` — production image and entrypoint
- `platform/containers/compose` — Compose topology and environment template
- `platform/ci` — CI runtime helpers
- `platform/automation` — operations automation

Applications do not depend on platform implementation details.

## Runtime topology

The current production image contains both API and document worker processes. This is a transitional deployment topology, not an application boundary.

Both processes are mandatory:

- if the API exits, the worker is terminated and the container exits;
- if the worker exits, the API is terminated and the container exits;
- health checks verify both HTTP endpoints;
- persistent storage and writable worker directories are startup requirements.

The application boundary permits a future split into separate services without changing product ownership.

## Persistence

Prisma owns the relational schema and migrations. SQLite is the active default datasource. Runtime data is mounted at `/app/server/storage` in the production image and maps to `apps/api/storage-opensin` in the Compose development layout.

Database changes require:

1. schema change,
2. migration,
3. fresh-database verification,
4. existing-database upgrade verification,
5. backup and restore consideration.

## Authentication and secrets

The product supports single-user and multi-user modes.

- Session authentication uses signed JWTs.
- Provider and OAuth connector secrets use application encryption where retrieval is required.
- Developer API keys, browser-extension keys, reset tokens and temporary SSO tokens are stored as SHA-256 digests because they only require equality validation.
- Plaintext credentials are returned only at creation or issuance time.

## Agent and plugin execution

Built-in agent capabilities execute through explicit application code and policy.

Imported community plugin packages may be downloaded, validated and listed, but JavaScript handlers are not executed in the production API process. Executable third-party plugins require a future isolated worker or container boundary.

## Product verticals

OpenSIN core should remain focused on:

- workspaces and chat,
- retrieval and documents,
- agents and artifacts,
- authentication and integration contracts.

Politician data, speeches, votes and OpenAfD-specific branding are a product vertical and should continue moving toward an explicit boundary rather than expanding the platform core.

## Testing layers

- application unit tests live with their owning app;
- root `tests/` contains cross-application integration tests;
- Playwright tests validate browser-level behavior;
- CI builds and starts the production image, then verifies API and worker health.

`yarn test` includes the root integration suite. `yarn verify:strict` adds types and coverage enforcement.

## Repository governance

The root has six engineering areas: `apps`, `packages`, `platform`, `tooling`, `docs` and `tests`.

`yarn check:layout` prevents legacy root directories, nested lockfiles, active `.sin-code` indexes and empty image artifacts from returning. Local state belongs under ignored `.local/`; generated engineering output belongs under ignored `tooling/artifacts/`.

See [`repository-layout.md`](repository-layout.md) for file ownership rules and [`roadmap.md`](roadmap.md) for remaining modernization work.
