# Engineering roadmap

This roadmap records open engineering work. It is not a release-readiness certificate; CI and release verification are the source of truth.

## Completed in the July 2026 cleanup

- Reduced the repository to six owned top-level areas.
- Moved web, API and document worker into `apps/`.
- Established one root workspace lockfile.
- Consolidated deployment under `platform/` and developer tools under `tooling/`.
- Removed the web terminal from the active product.
- Made API and document worker jointly required for container health.
- Added root integration tests, coverage and browser smoke tests to the quality gate.
- Removed non-blocking Python security theatre and added dependency, secret and production audit gates.
- Isolated local agent indexes and generated artifacts outside the source tree.
- Hashed developer API keys, browser-extension keys, reset tokens and temporary SSO tokens with backward-compatible migration.
- Disabled imported plugin execution in the production API process.
- Removed the abandoned CVoice integration.

## Next: product boundaries

- Extract politician sync, speeches, votes and OpenAfD branding into an explicit `openafd` vertical.
- Keep OpenSIN core limited to chat, workspaces, retrieval, agents, artifacts and integration contracts.
- Define stable package contracts before moving code into `packages/`.

## Next: runtime isolation

- Run imported plugins in a separate sandboxed worker or container.
- Split the document worker into its own deployable service when operational topology allows it.
- Add migration and backup-restore verification against both empty and existing databases.

## Next: dependency modernization

- Migrate from Yarn Classic in one dedicated lockfile change.
- Upgrade Puppeteer, Transformers.js, LangChain text splitters and PDF parsing behind adapter tests.
- Pin container base images by digest and automate digest refresh review.

## Next: codebase reduction

- Split the frontend route registry by product domain.
- Split global CSS into tokens, themes and feature-owned styles.
- Continue JavaScript-to-TypeScript migration with strictness enabled per migrated module.
- Remove compatibility shims only after usage is proven absent by tests.

## Release rule

No item is considered complete because a document says so. Completion requires merged code, required tests, passing CI and a reproducible release artifact.
