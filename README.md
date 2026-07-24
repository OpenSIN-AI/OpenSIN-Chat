# OpenSIN Chat

OpenSIN Chat is a self-hosted AI workspace for chat, knowledge retrieval, document analysis, agents and controlled integrations.

The repository is organized as a small monorepo with explicit product, platform and tooling boundaries. Current release status is determined by CI and release artifacts—not by hand-written readiness claims.

## Repository structure

```text
apps/
  web/       React and Vite browser application
  api/       Express API, authentication, persistence and agents
  worker/    Document parsing, OCR, scraping and extraction
packages/    Stable contracts shared by multiple applications
platform/    Containers, Compose, CI helpers and operations automation
tooling/     Developer scripts, skills and generated engineering artifacts
docs/        Current documentation plus clearly separated archives
tests/       Cross-application integration and browser tests
```

See [`docs/repository-layout.md`](docs/repository-layout.md) for ownership rules.

## Requirements

- Node.js 24
- Corepack
- Yarn Classic 1.22.22 for the current lockfile
- Docker with Compose for the production-like runtime

Yarn Classic is retained temporarily because it owns the current reproducible root lockfile. Package-manager migration must be performed as a dedicated, fully tested change rather than by mixing lockfile formats.

## Local development

Install all workspaces from the repository root:

```bash
yarn install --frozen-lockfile
```

Create local environment files from the examples in each application as required, then start API, web and document worker together:

```bash
yarn dev
```

Individual applications can be started with:

```bash
yarn dev:api
yarn dev:web
yarn dev:worker
```

Default development endpoints:

- Web: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:3001`
- Document worker: `http://127.0.0.1:8888`

## Quality commands

```bash
yarn check:layout
yarn lint:ci
yarn type-check
yarn test
yarn test:coverage
yarn build
yarn verify
yarn verify:strict
```

`yarn test` includes application unit tests and the root integration suite. The stateless production smoke test is:

```bash
yarn test:e2e:smoke
```

The full browser suite requires an initialized test instance and runs with:

```bash
yarn test:e2e
```

The repository layout check prevents legacy root directories, nested lockfiles, embedded agent indexes and empty image artifacts from returning.

## Containers

Copy the Compose environment template and provide strong secrets:

```bash
cp platform/containers/compose/.env.example platform/containers/compose/.env
```

Start the stack:

```bash
docker compose \
  -f platform/containers/compose/docker-compose.yml \
  -f platform/containers/compose/docker-compose.production.yml \
  up --build -d
```

The production image treats both the API and document worker as required processes. Storage or worker failures make the service unhealthy instead of leaving a partially functioning green container.

## Architecture principles

1. Deployable code belongs in `apps/`.
2. Shared packages require a real cross-application contract.
3. Infrastructure belongs in `platform/`, never inside product source.
4. Generated engineering output belongs in ignored `tooling/artifacts/`.
5. Local runtime and agent state belongs in ignored `.local/`.
6. Historical audits and removed features belong in `docs/archive/` and are not current project truth.
7. Security-sensitive capabilities must fail closed.

## Security

The web terminal feature has been removed from the active product. The container requires persistent storage, validates worker health and exits when either required process fails.

Please report security issues according to [`SECURITY.md`](SECURITY.md). Do not open public issues containing secrets, credentials or exploitable details.

## Documentation

Current documentation lives under [`docs/`](docs/). Important starting points:

- [Repository layout](docs/repository-layout.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
- [Operations](docs/operations.md)
- [Deployment](docs/deployment/overview.md)
- [API](docs/api.md)
- [SIN-Gmail / Himalaya](docs/integrations/sin-gmail.md)
- [User guide](docs/user-guide.md)

## Attribution

OpenSIN Chat is derived from and continues to acknowledge the AnythingLLM project and its original authors. Attribution and third-party notices are maintained in:

- [`docs/legal/credits.md`](docs/legal/credits.md)
- [`docs/legal/third-party.md`](docs/legal/third-party.md)
- [`LICENSE`](LICENSE)

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and run `yarn verify:strict` before submitting a change. Structural changes must also preserve the rules enforced by `yarn check:layout`.
