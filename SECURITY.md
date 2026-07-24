# Security policy

## Supported versions

Only the latest state of `main` receives security fixes.

## Reporting a vulnerability

Do not open a public issue or pull request for a vulnerability.

Use GitHub Private Vulnerability Reporting for this repository or email `support@sinchat.delqhi.com`. Include reproduction steps, affected route or file, expected impact and any relevant deployment assumptions.

Do not include live credentials, private user data or destructive proof-of-concept payloads.

## Security gates

Pull requests and `main` are protected by:

- CodeQL analysis,
- dependency review for high-severity additions,
- full-history secret scanning,
- production dependency audit,
- lint, types, unit and integration tests,
- coverage thresholds,
- production image startup and health verification,
- browser smoke tests.

A green document or manually written readiness report is not a security control.

## Secrets and credentials

Real environment files are ignored by Git and Docker. Generate unique deployment secrets for:

- `JWT_SECRET`,
- `SIG_KEY`,
- `SIG_SALT`,
- provider credentials,
- OAuth client secrets.

Rotate credentials after suspected disclosure.

Developer API keys, browser-extension API keys, password-reset tokens and temporary SSO tokens are stored as SHA-256 digests. Their plaintext value is returned only when issued. Legacy plaintext database rows are migrated to digests after their next successful use.

OAuth connector access and refresh tokens are encrypted at rest with the application's encryption manager.

## Authentication

OpenSIN Chat supports single-user and multi-user modes. Production must have a strong signing secret and an explicit authentication configuration. Security-sensitive routes use authenticated middleware and role checks.

The removed web terminal must not be reintroduced into the API process. Administrative shell access belongs outside the web product and should use normal host access controls.

## Runtime isolation

The API and document worker are both required for a healthy container. Missing persistent storage, unwritable document directories or either process exiting causes startup or health failure.

Imported community plugin files may be downloaded and inspected, but their JavaScript handlers are not executed inside the production API process. A future executable plugin system must use a separately sandboxed worker or container.

## Network and browser security

The API applies explicit CORS policy, origin validation for mutating production requests, request IDs, bounded body sizes, security headers and CSP. Public embed resources are handled as an explicit exception rather than weakening global policy.

The document worker requires signed requests. Development authentication bypasses must remain local, explicit and disabled in production.

## Database and storage

The active application database and runtime storage are owned by `apps/api` and mounted into the production image at `/app/server/storage`. Runtime files must not be committed.

Database changes require Prisma migrations and verification against both a fresh database and an existing database upgrade. Backups are not considered reliable until restore has been tested.

## Vulnerability scope

Valid reports include authentication bypass, authorization failure, credential disclosure, remote code execution, SSRF outside documented and explicitly enabled internal-network behavior, cross-tenant data access, stored or zero-interaction XSS, unsafe file handling and sandbox escapes.

Reports that require the reporter to paste their own script into a trusted developer console are generally not vulnerabilities unless another user or tenant can be affected.

## Telemetry

The application telemetry adapter is disabled. External requests still occur when an operator configures model providers, connectors, web retrieval or other integrations; disabled telemetry does not mean the product is network-isolated.
