# Contributing to OpenSIN Chat

Thank you for contributing. Keep changes small, testable and owned by one product domain.

## Before starting

- Use an existing issue or open one before implementing a substantial change.
- Report security vulnerabilities privately as described in [`SECURITY.md`](SECURITY.md).
- Avoid drive-by refactors in feature pull requests.
- New product capabilities require tests and documentation.

## Development setup

Requirements:

- Node.js 24
- Corepack
- Yarn 1.22.22 for the current root lockfile
- Docker with Compose for production-like verification

Install once from the repository root:

```bash
yarn install --frozen-lockfile
```

Start the complete local product:

```bash
yarn dev
```

This starts:

- `apps/api`
- `apps/web`
- `apps/worker`

## Repository ownership

Read [`docs/repository-layout.md`](docs/repository-layout.md) before adding files.

- Deployable code belongs in `apps/`.
- Stable code shared by multiple applications belongs in `packages/`.
- Deployment and runtime infrastructure belongs in `platform/`.
- Developer-only scripts and generated engineering output belong in `tooling/`.
- Current documentation belongs in `docs/`; historical material belongs in `docs/archive/`.
- Cross-application integration and browser tests belong in `tests/`.

The root must not accumulate source folders, screenshots, runtime storage or generated reports.

## Required verification

Run before requesting review:

```bash
yarn verify:strict
```

Useful focused commands:

```bash
yarn check:layout
yarn lint:ci
yarn type-check
yarn test
yarn test:coverage
yarn test:e2e
yarn build
```

Never claim a change works without executing the relevant flow. When verification is unavailable, state exactly what was not run.

## Coding standards

- Prefer TypeScript for new frontend and shared code.
- Keep application boundaries explicit; do not import application code through `tooling/` or `platform/`.
- Avoid speculative abstractions and generic shared utility packages.
- Security-sensitive behavior must fail closed.
- Secrets, tokens and credentials must never be logged or committed.
- Add regression tests for bug fixes and error-path tests for new behavior.
- Use conventional commit prefixes such as `feat:`, `fix:`, `refactor:`, `test:`, `docs:` and `chore:`.

## Structural changes

A structural pull request must update all affected areas in the same change:

- root workspace configuration,
- CI,
- Docker and Compose,
- developer scripts,
- documentation,
- tests and path guards.

`yarn check:layout` must remain green. Do not add nested lockfiles or `.sin-code` indexes to active source directories.

## Pull requests

A pull request should explain:

1. the user or operational problem,
2. the chosen boundary and why it belongs there,
3. security and migration impact,
4. tests executed,
5. rollback or compatibility considerations.

## License

Contributions are licensed under the repository's MIT license.
