# Security architecture

The repository security policy and reporting process are defined in [`../SECURITY.md`](../SECURITY.md). This document describes application controls.

## Authentication and authorization

OpenSIN Chat supports single-user and multi-user modes. Production requires a strong signing secret and explicit authentication configuration. Protected routes use authenticated middleware plus role and workspace checks.

The former web terminal has been removed from the active product. Shell access must remain outside the web application.

## Credential storage

Credentials are handled according to whether the plaintext must be recovered:

- OAuth connector access and refresh tokens are encrypted with the application encryption manager.
- Developer API keys, browser-extension API keys, password-reset tokens and temporary SSO tokens are stored as SHA-256 digests.
- Digest-backed credentials are returned in plaintext only when created or issued.
- Legacy plaintext credential rows are migrated after their next successful validation.

Environment files and runtime databases are excluded from Git and Docker build context.

## HTTP controls

The API applies:

- request IDs,
- bounded request bodies,
- explicit CORS configuration,
- production origin checks for state-changing requests,
- security response headers,
- Content Security Policy,
- rate limits on sensitive routes,
- structured error handling without credential disclosure.

Public embed routes are handled as a deliberate, narrow cross-origin exception.

## Worker boundary

Document parsing, OCR, scraping and extraction run in `apps/worker`. API-to-worker requests require integrity signatures. Development bypasses are explicit and production-disabled.

The API and worker are both required for runtime health. A missing worker must not leave a green but partially broken deployment.

## Imported plugins

Community plugin archives are checked for size limits, entry limits, path traversal and unsafe downloads. An allowlist alone is not a sandbox, so imported JavaScript handlers are not executed inside the production API process.

A future executable plugin runtime must use a separately sandboxed worker or container with restricted filesystem, network, environment and resource access.

## Container controls

The production Compose configuration:

- binds the application to localhost by default,
- drops Linux capabilities,
- enables `no-new-privileges`,
- uses an init process,
- requires persistent storage,
- validates writable worker directories,
- checks API and worker health,
- exits when either required process dies.

## Security verification

CI includes CodeQL, dependency review, secret scanning, production dependency audit, tests, coverage, production image startup and browser smoke verification.

These controls must remain blocking. Security scans that always return success are not accepted.
