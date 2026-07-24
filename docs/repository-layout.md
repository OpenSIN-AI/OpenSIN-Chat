# Repository layout

OpenSIN Chat uses six top-level engineering areas. New files must have one clear owner and belong to exactly one of these areas.

## `apps/`

Deployable product applications.

- `apps/web` — React/Vite browser application
- `apps/api` — Express API, authentication, persistence, agents and application services
- `apps/worker` — isolated document parsing, OCR, scraping and extraction worker

Application code must not import from `tooling/`, `docs/` or `tests/`.

## `packages/`

Stable code shared by two or more applications.

Only move code here after a real shared contract exists. Do not create generic `utils` packages or speculative abstractions. Shared packages should expose a small public API and own their tests.

## `platform/`

Runtime and deployment infrastructure.

- `platform/containers/image` — production image and runtime scripts
- `platform/containers/compose` — local and production Compose definitions
- `platform/ci` — CI runtime helpers
- `platform/automation` — operational automation definitions

Platform code may reference applications, but application code must not depend on platform implementation details.

## `tooling/`

Developer-only tools, codemods, maintenance scripts, skills and generated engineering artifacts.

- `tooling/scripts` — executable repository maintenance
- `tooling/skills` — local agent/developer instructions
- `tooling/artifacts` — generated SBOMs, code graphs and archived lockfiles; ignored by Git

Nothing under `tooling/` ships in the production image.

## `docs/`

Current product, engineering, security, deployment and operations documentation.

- `docs/archive` contains historical reports and removed features. Archived files are not current project truth.
- `docs/assets` contains documentation media, not application assets.
- `docs/legal` contains attribution and legal notices.

Current release status must come from CI and release artifacts, never from a hand-written readiness report.

## `tests/`

Cross-application integration and browser-level product tests. Unit tests stay next to their owning application or module.

## Root policy

The repository root contains only repository control files and these six areas. It must not contain application source, runtime storage, screenshots, generated reports or tool caches.

`yarn.lock` at the root is the only active lockfile. `yarn check:layout` enforces the structure and fails on legacy root directories, nested lockfiles, embedded `.sin-code` directories or empty image artifacts.

Local agent and runtime state belongs under `.local/`, which is ignored by Git and Docker.
